/**
 * M2 Create request: a buyer uploads a drawing, the model's proposed fields come back with confidence and source,
 * fields below 0.75 wait for the buyer, and every step is in the audit chain. Plus tenant isolation and the cost formula.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk';
import { BedrockExtractor } from '../src/integrations/extractor.js';
import { llmCostInr } from '../src/lib/cost.js';
import { cookieOf, makeOrg, ownerPool, testApp } from './helpers.js';

let t: Awaited<ReturnType<typeof testApp>>;
const owner = ownerPool();
const PDF = Buffer.from('%PDF-1.4\n% fictional drawing KM-TEST-01\n%%EOF\n');

async function signIn(portal: 'buyer' | 'supplier', destination: string) {
  const start = await t.app.inject({ method: 'POST', url: '/v1/auth/code', payload: { portal, destination } });
  const code = portal === 'supplier' ? t.whatsapp.sent.at(-1)!.body : t.email.sent.at(-1)!.code;
  return cookieOf(await t.app.inject({ method: 'POST', url: '/v1/auth/verify', payload: { challengeId: start.json().challengeId, code } }));
}

const upload = (cookies: object, body: Buffer, type = 'application/pdf', name = 'KM-GH-2210_revC.pdf') =>
  t.app.inject({ method: 'POST', url: '/v1/rfqs/drafts', cookies: cookies as Record<string, string>, payload: body, headers: { 'content-type': type, 'x-file-name': encodeURIComponent(name) } });

let buyerA: object;
let buyerB: object;

beforeAll(async () => {
  t = await testApp();
  await makeOrg(owner, 'buyer', 'Aravali Pumps (fictional)', { email: 'priya@aravali.test', role: 'buyer' });
  await makeOrg(owner, 'buyer', 'Coromandel Drives (fictional)', { email: 'arjun@coromandel.test', role: 'buyer' });
  await makeOrg(owner, 'supplier', 'Sri Test Castings (fictional)', { phone: '+919843055599', role: 'owner' });
  buyerA = await signIn('buyer', 'priya@aravali.test');
  buyerB = await signIn('buyer', 'arjun@coromandel.test');
});

afterAll(async () => {
  await t.app.close();
  await t.db.end();
  await owner.end();
});

describe('Create request from a drawing', () => {
  let rfq: string;

  it('stores the drawing, proposes fields with confidence and source, and opens an RFQ draft', async () => {
    const res = await upload(buyerA, PDF);
    expect(res.statusCode).toBe(201);
    const d = res.json();
    rfq = d.rfq.number;
    expect(rfq).toMatch(/^RFQ-\d{6}$/);
    expect(d.rfq.status).toBe('draft');
    expect(d.document.number).toMatch(/^DOC-\d{6}$/);
    expect(d.document.mediaType).toBe('application/pdf');
    expect(d.extraction.status).toBe('ready');
    expect(d.extraction.fields).toHaveLength(10);
    expect(d.extraction.fields[0]).toMatchObject({ key: 'partNo', source: 'model', confirmed: false });
    expect(d.extraction.fields.filter((f: { confidence: number }) => f.confidence < 0.75).map((f: { key: string }) => f.key)).toEqual(['critical', 'ht', 'inspection']);
    expect(t.storage.files.size).toBeGreaterThan(0);
  });

  it('rejects files that are not drawings, whatever their name', async () => {
    const res = await upload(buyerA, Buffer.from('MZ not a pdf'), 'application/pdf', 'evil.pdf');
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('unsupported_file');
  });

  it('keeps one buyer\'s drawing and fields away from another buyer', async () => {
    expect((await t.app.inject({ method: 'GET', url: `/v1/rfqs/${rfq}/extraction`, cookies: buyerB as Record<string, string> })).statusCode).toBe(404);
    expect((await t.app.inject({ method: 'GET', url: `/v1/rfqs/${rfq}/drawing`, cookies: buyerB as Record<string, string> })).statusCode).toBe(404);
    const own = await t.app.inject({ method: 'GET', url: `/v1/rfqs/${rfq}/drawing`, cookies: buyerA as Record<string, string> });
    expect(own.statusCode).toBe(200);
    expect(own.headers['content-type']).toBe('application/pdf');
    expect(own.rawPayload.equals(PDF)).toBe(true);
  });

  it('does not let suppliers create requests', async () => {
    const supplier = await signIn('supplier', '98430 55599');
    expect((await upload(supplier, PDF)).statusCode).toBe(403);
  });

  it('records confirmations and corrections against the buyer in the audit chain', async () => {
    const confirm = await t.app.inject({ method: 'POST', url: `/v1/rfqs/${rfq}/extraction/fields/critical/confirm`, cookies: buyerA as Record<string, string>, payload: {} });
    expect(confirm.statusCode).toBe(200);
    expect(confirm.json().extraction.fields.find((f: { key: string }) => f.key === 'critical')).toMatchObject({ confirmed: true, source: 'model' });

    const fix = await t.app.inject({ method: 'POST', url: `/v1/rfqs/${rfq}/extraction/fields/ht/confirm`, cookies: buyerA as Record<string, string>, payload: { value: 'Stress relieve 550 °C' } });
    expect(fix.json().extraction.fields.find((f: { key: string }) => f.key === 'ht')).toMatchObject({ value: 'Stress relieve 550 °C', confirmed: true, source: 'buyer' });

    const other = await t.app.inject({ method: 'POST', url: `/v1/rfqs/${rfq}/extraction/fields/ht/confirm`, cookies: buyerB as Record<string, string>, payload: {} });
    expect(other.statusCode).toBe(404);

    const log = (await t.app.inject({ method: 'GET', url: '/v1/audit-events', cookies: buyerA as Record<string, string> })).json() as { action: string; doc: string }[];
    const mine = log.filter((e) => e.doc === rfq).map((e) => e.action);
    expect(mine).toEqual(expect.arrayContaining(['RFQ draft created', 'Drawing read by AI', 'Field confirmed', 'Field corrected']));
    expect((await t.app.inject({ method: 'GET', url: '/v1/audit-events/verify', cookies: buyerA as Record<string, string> })).json().ok).toBe(true);
  });

  it('freezes fields once the request has been sent', async () => {
    await owner.query(`update rfqs set status = 'sent' where number = $1`, [rfq]);
    const res = await t.app.inject({ method: 'POST', url: `/v1/rfqs/${rfq}/extraction/fields/inspection/confirm`, cookies: buyerA as Record<string, string>, payload: {} });
    expect(res.statusCode).toBe(409);
  });

  it('meters the extraction against the RFQ', async () => {
    const { rows } = await owner.query(`select m.kind, m.cost_inr from metering_events m join rfqs r on r.id = m.rfq_id where r.number = $1`, [rfq]);
    expect(rows).toEqual([{ kind: 'document_extracted', cost_inr: '0.0000' }]);
  });
});

describe('Bedrock extractor', () => {
  const rates = { inputUsdPerMTok: 3, outputUsdPerMTok: 15, usdInr: 88 };
  const fbRates = { inputUsdPerMTok: 5, outputUsdPerMTok: 25, usdInr: 88 };

  function fakeClient(replies: object[]) {
    const calls: { model: string; text: string }[] = [];
    const client = {
      messages: {
        create: async (req: { model: string; messages: { content: { type: string; text?: string }[] }[] }) => {
          calls.push({ model: req.model, text: req.messages[0]!.content.find((c) => c.type === 'text')!.text! });
          const input = replies[calls.length - 1];
          return { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't', name: 'record_drawing_fields', input }], usage: { input_tokens: 10_000, output_tokens: 1_000 } };
        },
      },
    };
    return { client: client as unknown as AnthropicBedrock, calls };
  }

  it('re-reads only low-confidence fields with the fallback model and keeps the better reading', async () => {
    const { client, calls } = fakeClient([
      { title: 'Pump bracket', fields: [
        { key: 'partNo', value: 'AP-BR-07', unit: null, confidence: 0.97, span: 'Title block' },
        { key: 'material', value: 'IS 2062 E250', unit: null, confidence: 0.6, span: 'Note 1' },
      ] },
      { title: 'Pump bracket', fields: [{ key: 'material', value: 'IS 2062 E250 BR', unit: null, confidence: 0.81, span: 'Note 1, line 2' }] },
    ]);
    const ex = new BedrockExtractor({ region: 'ap-southeast-2', model: 'sonnet', fallbackModel: 'opus', rates, fallbackRates: fbRates }, client);
    const r = await ex.extract({ bytes: PDF, mediaType: 'application/pdf', fileName: 'x.pdf' });

    expect(calls.map((c) => c.model)).toEqual(['sonnet', 'opus']);
    expect(calls[1]!.text).toContain('- material:');
    expect(calls[1]!.text).not.toContain('- partNo:');
    expect(r.fields.find((f) => f.key === 'material')).toMatchObject({ value: 'IS 2062 E250 BR', confidence: 0.81, source: 'fallback' });
    expect(r.fields.find((f) => f.key === 'weight')).toMatchObject({ value: 'Not specified', confidence: 0 });
    expect(r.fields).toHaveLength(10);
    // 10k in + 1k out at $3/$15 = $0.045 → ₹3.96; fallback at $5/$25 = $0.075 → ₹6.60.
    expect(r.costInr).toBe(10.56);
    expect(r.fallbackModel).toBe('bedrock:opus');
  });

  it('skips the fallback when nothing is below 0.75', async () => {
    const { client, calls } = fakeClient([{ title: 'Shaft', fields: [] }]);
    const r = await new BedrockExtractor({ region: 'x', model: 'sonnet', rates }, client).extract({ bytes: PDF, mediaType: 'application/pdf', fileName: 'x.pdf' });
    expect(calls).toHaveLength(1);
    expect(r.fallbackModel).toBeNull();
  });
});

describe('llmCostInr', () => {
  const r = { inputUsdPerMTok: 3, outputUsdPerMTok: 15, usdInr: 88 };
  it('prices input and output tokens', () => expect(llmCostInr({ input_tokens: 1_000_000, output_tokens: 0 }, r)).toBe(264));
  it('prices output tokens', () => expect(llmCostInr({ input_tokens: 0, output_tokens: 100_000 }, r)).toBe(132));
  it('bills cache writes at 1.25× and reads at 0.1× input', () =>
    expect(llmCostInr({ input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 1_000_000, cache_read_input_tokens: 1_000_000 }, r)).toBe(356.4));
  it('rounds to four decimals', () => expect(llmCostInr({ input_tokens: 1, output_tokens: 1 }, r)).toBe(0.0016));
});
