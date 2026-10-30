/**
 * M1 "Done when", end to end through the HTTP API: a supplier joins with a GSTIN and a WhatsApp code, lands in the
 * verification queue, and both events are in a verified audit chain. Plus sign-in, reviews and the webhook.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fictionalGstin } from '../src/integrations/gst.js';
import { hmacSha256 } from '../src/lib/crypto.js';
import { cookieOf, makeOrg, ownerPool, testApp } from './helpers.js';

const MURUGAN = fictionalGstin('33AAMFS4821K1Z');
const NANDI_CANCELLED = fictionalGstin('29AACCN7713P1Z');
const PHONE = '98430 21877';

let t: Awaited<ReturnType<typeof testApp>>;
const owner = ownerPool();
const post = (url: string, payload: unknown, cookies = {}) => t.app.inject({ method: 'POST', url, payload: payload as object, cookies });
const get = (url: string, cookies = {}) => t.app.inject({ method: 'GET', url, cookies });

async function signIn(portal: 'buyer' | 'admin' | 'supplier', destination: string) {
  const start = await post('/v1/auth/code', { portal, destination });
  expect(start.statusCode).toBe(202);
  const code = portal === 'supplier' ? t.whatsapp.sent.at(-1)!.body : t.email.sent.at(-1)!.code;
  const res = await post('/v1/auth/verify', { challengeId: start.json().challengeId, code });
  expect(res.statusCode).toBe(200);
  return cookieOf(res);
}

beforeAll(async () => {
  t = await testApp();
  await makeOrg(owner, 'platform', 'Ordershed Ops', { email: 'verifier1@ordershed.test', role: 'verifier' });
  await makeOrg(owner, 'buyer', 'Kestrel Motion GmbH', { email: 'rohan@kestrel.test', role: 'purchase_head' });
});

afterAll(async () => {
  await t.app.close();
  await t.db.end();
  await owner.end();
});

describe('supplier Join', () => {
  let applicationId = '';
  let supplierCookie = {};

  it('rejects a mistyped GSTIN before any lookup', async () => {
    const res = await post('/v1/join/lookup', { gstin: '33AAMFS4821K1ZX' });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('gstin_invalid');
  });

  it('shows the GST record for confirmation', async () => {
    const res = await post('/v1/join/lookup', { gstin: MURUGAN.toLowerCase() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ legalName: 'SRI MURUGAN CASTINGS', status: 'Active', alreadyRegistered: false });
  });

  it('refuses a cancelled GST registration', async () => {
    const res = await post('/v1/join/start', { gstin: NANDI_CANCELLED, phone: '98450 11111' });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('gst_not_active');
  });

  it('sends a code on WhatsApp', async () => {
    const res = await post('/v1/join/start', { gstin: MURUGAN, phone: PHONE });
    expect(res.statusCode).toBe(202);
    applicationId = res.json().applicationId;
    expect(res.json().sentTo).toBe('+91 98430 •••77');
    expect(t.whatsapp.sent.at(-1)).toMatchObject({ to: '+919843021877', kind: 'code' });
  });

  it('a wrong code does not join', async () => {
    const real = t.whatsapp.sent.at(-1)!.body;
    const wrong = real === '000000' ? '111111' : '000000';
    const res = await post('/v1/join/verify', { applicationId, code: wrong });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('code_invalid');
  });

  it('the right code creates the supplier, signs in the owner and opens verification', async () => {
    const res = await post('/v1/join/verify', { applicationId, code: t.whatsapp.sent.at(-1)!.body, businessTypes: ['Foundry', 'Machining', 'Not a type'] });
    expect(res.statusCode).toBe(200);
    expect(res.json().org).toMatchObject({ name: 'Sri Murugan Castings', tier: 0 });
    expect(res.json().org.number).toMatch(/^VEN-\d{6}$/);
    expect(res.json().verification.number).toMatch(/^VER-\d{6}$/);
    supplierCookie = cookieOf(res);
    const me = await get('/v1/auth/me', supplierCookie);
    expect(me.json()).toMatchObject({ role: 'owner', org: { kind: 'supplier', name: 'Sri Murugan Castings' } });
    const types = await owner.query(`select business_types from supplier_details where gstin = $1`, [MURUGAN]);
    expect(types.rows[0].business_types).toEqual(['Foundry', 'Machining']);
  });

  it('the same code cannot be used twice, and the GSTIN cannot join again', async () => {
    const again = await post('/v1/join/verify', { applicationId, code: t.whatsapp.sent.at(-1)!.body });
    expect(again.statusCode).toBe(422);
    const dup = await post('/v1/join/start', { gstin: MURUGAN, phone: '98430 99999' });
    expect(dup.statusCode).toBe(409);
    expect(dup.json().error.code).toBe('already_registered');
  });

  it('appears in the admin verification queue; both events are in a verified audit chain', async () => {
    const admin = await signIn('admin', 'verifier1@ordershed.test');
    const queue = await get('/v1/admin/verification', admin);
    expect(queue.statusCode).toBe(200);
    const mine = queue.json().find((c: { vendor: string }) => c.vendor === 'Sri Murugan Castings');
    expect(mine).toMatchObject({ from: 0, to: 1, status: 'Pending' });
    expect(mine.evidence).toContain('WhatsApp number verified by code');

    const events = (await get('/v1/audit-events', admin)).json() as { action: string; doc: string }[];
    expect(events.find((e) => e.action === 'Join started' && e.doc === MURUGAN)).toBeTruthy();
    expect(events.find((e) => e.action === 'Supplier joined')).toBeTruthy();
    const v = (await get('/v1/audit-events/verify', admin)).json();
    expect(v.ok).toBe(true);
  });

  it('the supplier sees its own events, not platform ones, and cannot open admin pages', async () => {
    const events = (await get('/v1/audit-events', supplierCookie)).json() as { action: string }[];
    expect(events.map((e) => e.action)).toContain('Supplier joined');
    expect(events.map((e) => e.action)).not.toContain('Join started');
    expect((await get('/v1/admin/verification', supplierCookie)).statusCode).toBe(403);
  });

  it('a verifier approves to Document-verified; the tier changes and is audited', async () => {
    const admin = await signIn('admin', 'verifier1@ordershed.test');
    const queue = (await get('/v1/admin/verification', admin)).json();
    const c = queue.find((x: { vendor: string }) => x.vendor === 'Sri Murugan Castings');
    const res = await post(`/v1/admin/verification/${c.id}/review`, { decision: 'approve' }, admin);
    expect(res.json()).toEqual({ status: 'Approved' });
    expect((await owner.query(`select tier from orgs where gstin = $1`, [MURUGAN])).rows[0].tier).toBe(1);
    const again = await post(`/v1/admin/verification/${c.id}/review`, { decision: 'approve' }, admin);
    expect(again.statusCode).toBe(409);
  });
});

describe('four-eyes above Document-verified', () => {
  it('needs two different reviewers', async () => {
    const sup = await makeOrg(owner, 'supplier', 'Kaveri Precision Forge');
    await owner.query(`insert into verification_cases (number, org_id, from_tier, to_tier) values ('VER-T2', $1, 1, 2)`, [sup.id]);
    await makeOrg(owner, 'platform', 'Ordershed Ops 2', { email: 'verifier2@ordershed.test', role: 'verifier' });
    const first = await signIn('admin', 'verifier1@ordershed.test');
    expect((await post('/v1/admin/verification/VER-T2/review', { decision: 'approve' }, first)).json()).toMatchObject({ status: 'Pending', needsSecondReviewer: true });
    const self = await post('/v1/admin/verification/VER-T2/review', { decision: 'approve' }, first);
    expect(self.statusCode).toBe(409);
    expect(self.json().error.code).toBe('four_eyes');
    const second = await signIn('admin', 'verifier2@ordershed.test');
    expect((await post('/v1/admin/verification/VER-T2/review', { decision: 'approve' }, second)).json()).toEqual({ status: 'Approved' });
  });
});

describe('sign-in', () => {
  it('a buyer signs in with an email code', async () => {
    const cookie = await signIn('buyer', 'rohan@kestrel.test');
    expect((await get('/v1/auth/me', cookie)).json()).toMatchObject({ role: 'purchase_head', org: { kind: 'buyer' } });
  });
  it('an unknown email gets the same answer but no code, and no code works', async () => {
    const before = t.email.sent.length;
    const res = await post('/v1/auth/code', { portal: 'buyer', destination: 'nobody@example.com' });
    expect(res.statusCode).toBe(202);
    expect(t.email.sent.length).toBe(before);
    const v = await post('/v1/auth/verify', { challengeId: res.json().challengeId, code: '123456' });
    expect(v.statusCode).toBe(422);
  });
  it('a buyer cannot use the admin portal', async () => {
    const before = t.email.sent.length;
    await post('/v1/auth/code', { portal: 'admin', destination: 'rohan@kestrel.test' });
    expect(t.email.sent.length).toBe(before);
  });
  it('locks a code after five wrong attempts', async () => {
    const res = await post('/v1/auth/code', { portal: 'buyer', destination: 'rohan@kestrel.test' });
    const id = res.json().challengeId;
    const real = t.email.sent.at(-1)!.code;
    const wrong = real === '999999' ? '888888' : '999999';
    for (let i = 0; i < 5; i++) await post('/v1/auth/verify', { challengeId: id, code: wrong });
    const last = await post('/v1/auth/verify', { challengeId: id, code: real });
    expect(last.json().error.code).toBe('code_locked');
  });
  it('signs out', async () => {
    const cookie = await signIn('supplier', PHONE);
    expect((await post('/v1/auth/logout', {}, cookie)).statusCode).toBe(200);
    expect((await get('/v1/auth/me', cookie)).statusCode).toBe(401);
  });
  it('blocks state changes from another website', async () => {
    const res = await t.app.inject({ method: 'POST', url: '/v1/auth/logout', headers: { origin: 'https://evil.example' } });
    expect(res.statusCode).toBe(403);
  });
});

describe('WhatsApp webhook', () => {
  const signed = (payload: object, secret = 'test-app-secret') => {
    const raw = JSON.stringify(payload);
    return t.app.inject({
      method: 'POST', url: '/v1/webhooks/whatsapp', payload: raw,
      headers: { 'content-type': 'application/json', 'x-hub-signature-256': `sha256=${hmacSha256(secret, raw).toString('hex')}` },
    });
  };
  const msg = (id: string, from: string, body: string) => ({ entry: [{ changes: [{ value: { messages: [{ id, from, type: 'text', text: { body } }] } }] }] });

  it('verifies the URL with the verify token only', async () => {
    const ok = await get('/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-verify&hub.challenge=42');
    expect(ok.body).toBe('42');
    expect((await get('/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=42')).statusCode).toBe(403);
  });
  it('rejects an unsigned or wrongly signed call', async () => {
    expect((await signed(msg('wamid.x', '919800000001', 'JOIN'), 'wrong')).statusCode).toBe(403);
  });
  it('answers JOIN with the join link, once per message id', async () => {
    const before = t.whatsapp.sent.length;
    expect((await signed(msg('wamid.j1', '919800000001', 'join'))).statusCode).toBe(200);
    await signed(msg('wamid.j1', '919800000001', 'join'));   // Meta retry
    expect(t.whatsapp.sent.length).toBe(before + 1);
    expect(t.whatsapp.sent.at(-1)!.body).toContain('/s/join');
  });
  it('STATUS reports the tier; STOP opts out', async () => {
    await signed(msg('wamid.s1', '919843021877', 'STATUS'));
    expect(t.whatsapp.sent.at(-1)!.body).toContain('Sri Murugan Castings: tier 1');
    await signed(msg('wamid.s2', '919800000002', 'STOP'));
    expect((await owner.query(`select 1 from whatsapp_optouts where phone = '+919800000002'`)).rowCount).toBe(1);
  });
});
