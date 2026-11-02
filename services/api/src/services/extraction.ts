/**
 * Create request, step 1–2: a buyer uploads a drawing → it is stored → the model proposes fields → an RFQ draft
 * holds them until the buyer confirms every field below 0.75. The model call runs outside the transaction so a
 * slow read never holds a database connection.
 */
import { createHash, randomUUID } from 'node:crypto';
import type { Db, Tx } from '../db/pool.js';
import { withTx } from '../db/pool.js';
import { ctxOf } from '../http/auth.js';
import { HttpError, notFound } from '../http/errors.js';
import { CONFIRM_BELOW, FIELD_DEFS, type DrawingFile, type Extractor, type ExtractionResult } from '../integrations/extractor.js';
import type { Storage } from '../integrations/storage.js';
import type { Session } from './sessions.js';
import { audit } from './audit.js';
import { meter } from './metering.js';

/** Same shape as the frontend's ExtractedField (apps/web/src/api/types.ts), plus who supplied the value. */
export interface ExtractedFieldView {
  key: string; label: string; tech: string; value: string; unit?: string; confidence: number; span: string; confirmed: boolean;
  source: 'model' | 'fallback' | 'buyer';
}
export interface DraftView {
  rfq: { number: string; title: string; status: string };
  document: { number: string; fileName: string; mediaType: string; byteSize: number };
  extraction: { status: 'ready' | 'failed'; model: string; fallbackModel: string | null; costInr: string; durationMs: number | null; error: string | null; fields: ExtractedFieldView[] };
}

export async function createDraftFromDrawing(deps: { db: Db; storage: Storage; extractor: Extractor }, s: Session, file: DrawingFile): Promise<DraftView> {
  const key = `org/${s.orgId}/${randomUUID()}`;
  await deps.storage.put(key, file.bytes);

  const started = Date.now();
  let result: ExtractionResult | null = null;
  let error: string | null = null;
  try {
    result = await deps.extractor.extract(file);
  } catch (err) {
    error = (err as Error).message.slice(0, 500);
  }
  const durationMs = Date.now() - started;

  const number = await withTx(deps.db, ctxOf(s), async (tx) => {
    const rfqNo = (await tx.query<{ n: string }>(`select next_doc_number('RFQ') as n`)).rows[0]!.n;
    const title = result?.title ?? file.fileName.replace(/\.[^.]+$/, '');
    const rfq = await tx.query<{ id: string }>(
      `insert into rfqs (number, buyer_org_id, title, created_by) values ($1, $2, $3, $4) returning id`,
      [rfqNo, s.orgId, title, s.userId],
    );
    const rfqId = rfq.rows[0]!.id;

    const docNo = (await tx.query<{ n: string }>(`select next_doc_number('DOC') as n`)).rows[0]!.n;
    const doc = await tx.query<{ id: string }>(
      `insert into documents (number, buyer_org_id, doc_type, title, rfq_id, s3_key, sha256, media_type, byte_size, file_name, created_by)
       values ($1, $2, 'drawing', $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
      [docNo, s.orgId, file.fileName, rfqId, key, createHash('sha256').update(file.bytes).digest(), file.mediaType, file.bytes.length, file.fileName, s.userId],
    );

    const ex = await tx.query<{ id: string }>(
      `insert into extractions (document_id, rfq_id, buyer_org_id, status, model, fallback_model, title, cost_inr, duration_ms, error)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
      [doc.rows[0]!.id, rfqId, s.orgId, result ? 'ready' : 'failed', result?.model ?? deps.extractor.name, result?.fallbackModel ?? null,
        result?.title ?? null, (result?.costInr ?? 0).toFixed(4), durationMs, error],
    );

    const who = { orgId: s.orgId, actorLabel: s.userName, actorRole: s.role };
    await audit(tx, { ...who, action: 'rfq.draft_created', doc: rfqNo, summary: `${rfqNo} draft created from ${docNo} (${file.fileName})` });
    if (result) {
      for (const f of result.fields) {
        const def = FIELD_DEFS.find((d) => d.key === f.key)!;
        await tx.query(
          `insert into extracted_fields (extraction_id, buyer_org_id, key, label, tech, value, unit, confidence, span, source)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [ex.rows[0]!.id, s.orgId, f.key, def.label, def.tech, f.value, f.unit, f.confidence.toFixed(3), f.span, f.source],
        );
      }
      const low = result.fields.filter((f) => f.confidence < CONFIRM_BELOW).length;
      await meter(tx, { orgId: s.orgId, rfqId, kind: 'document_extracted', costInr: result.costInr, provider: result.model, ref: docNo });
      await audit(tx, {
        ...who, action: 'document.extracted', doc: rfqNo,
        summary: `${docNo} read by ${result.model}${result.fallbackModel ? ` (fallback ${result.fallbackModel})` : ''}: ${result.fields.length} fields, ${low} need confirmation`,
        data: { costInr: result.costInr.toFixed(4), durationMs },
      });
    } else {
      await audit(tx, { ...who, action: 'document.extraction_failed', doc: rfqNo, summary: `${docNo} could not be read: ${error}` });
    }
    return rfqNo;
  });

  return withTx(deps.db, ctxOf(s), (tx) => getDraft(tx, number));
}

export async function getDraft(tx: Tx, rfqNumber: string): Promise<DraftView> {
  const { rows } = await tx.query(
    `select r.number, r.title, r.status, d.number as doc_no, d.file_name, d.media_type, d.byte_size,
            e.id as ex_id, e.status as ex_status, e.model, e.fallback_model, e.cost_inr, e.duration_ms, e.error
       from rfqs r
       join documents d on d.rfq_id = r.id and d.doc_type = 'drawing'
       join extractions e on e.document_id = d.id
      where r.number = $1
      order by e.created_at desc limit 1`,
    [rfqNumber],
  );
  const r = rows[0];
  if (!r) throw notFound('No drawing found for this request.');
  const fields = await tx.query(
    `select key, label, tech, value, unit, confidence, span, source, confirmed_at from extracted_fields where extraction_id = $1`,
    [r.ex_id],
  );
  const order = new Map<string, number>(FIELD_DEFS.map((d, i) => [d.key, i]));
  return {
    rfq: { number: r.number, title: r.title, status: r.status },
    document: { number: r.doc_no, fileName: r.file_name, mediaType: r.media_type, byteSize: Number(r.byte_size) },
    extraction: {
      status: r.ex_status, model: r.model, fallbackModel: r.fallback_model, costInr: r.cost_inr, durationMs: r.duration_ms, error: r.error,
      fields: fields.rows
        .sort((a, b) => (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99))
        .map((f) => ({
          key: f.key, label: f.label, tech: f.tech, value: f.value, ...(f.unit ? { unit: f.unit } : {}),
          confidence: Number(f.confidence), span: f.span, confirmed: f.confirmed_at !== null, source: f.source,
        })),
    },
  };
}

/** The buyer confirms a field as read, or corrects it. Either way it is recorded against them in the audit chain. */
export async function confirmField(tx: Tx, s: Session, rfqNumber: string, key: string, edit?: { value: string; unit?: string | null }) {
  const { rows } = await tx.query(
    `select f.id, f.label, f.value, f.unit, r.status
       from extracted_fields f
       join extractions e on e.id = f.extraction_id
       join rfqs r on r.id = e.rfq_id
      where r.number = $1 and f.key = $2
      order by e.created_at desc limit 1`,
    [rfqNumber, key],
  );
  const f = rows[0];
  if (!f) throw notFound('Field not found.');
  if (f.status !== 'draft') throw new HttpError(409, 'not_draft', 'This request has been sent; its fields can no longer change.');

  const changed = edit !== undefined && (edit.value !== f.value || (edit.unit ?? null) !== f.unit);
  await tx.query(
    `update extracted_fields
        set value = $2, unit = $3, source = case when $4 then 'buyer' else source end, confirmed_by = $5, confirmed_at = now()
      where id = $1`,
    [f.id, changed ? edit!.value : f.value, changed ? (edit!.unit ?? null) : f.unit, changed, s.userId],
  );
  await audit(tx, {
    orgId: s.orgId, actorLabel: s.userName, actorRole: s.role, doc: rfqNumber,
    action: changed ? 'extraction.field_corrected' : 'extraction.field_confirmed',
    summary: changed ? `${f.label} corrected from "${f.value}" to "${edit!.value}"` : `${f.label} confirmed as "${f.value}"`,
  });
  return getDraft(tx, rfqNumber);
}

export async function drawingFile(tx: Tx, rfqNumber: string) {
  const { rows } = await tx.query(
    `select d.s3_key, d.media_type, d.file_name from documents d join rfqs r on r.id = d.rfq_id
      where r.number = $1 and d.doc_type = 'drawing' order by d.created_at desc limit 1`,
    [rfqNumber],
  );
  if (!rows[0]) throw notFound('No drawing found for this request.');
  return { key: rows[0].s3_key as string, mediaType: rows[0].media_type as string, fileName: rows[0].file_name as string };
}
