/**
 * Database guarantees, checked as the real API role (ordershed_app) with row-level security on:
 * tenant isolation, sealed bids, private floor prices, read-only admins, numbering, the audit chain.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPool, withTx, type DbContext } from '../src/db/pool.js';
import { makeOrg, ownerPool, TEST_APP_URL } from './helpers.js';

const owner = ownerPool();
const app = createPool(TEST_APP_URL, 4);
const asOrg = (ctx: DbContext, sql: string, params: unknown[] = []) => withTx(app, ctx, (tx) => tx.query(sql, params));

let buyerA: { id: string }, buyerB: { id: string }, supInvited: { id: string }, supOther: { id: string }, ops: { id: string };
let rfqA: string, rfqB: string, quoteId: string;

beforeAll(async () => {
  buyerA = await makeOrg(owner, 'buyer', 'Buyer A');
  buyerB = await makeOrg(owner, 'buyer', 'Buyer B');
  supInvited = await makeOrg(owner, 'supplier', 'Invited Supplier');
  supOther = await makeOrg(owner, 'supplier', 'Other Supplier');
  ops = await makeOrg(owner, 'platform', 'Ops');

  rfqA = (await owner.query(`insert into rfqs (number, buyer_org_id, title, status, sealed_until) values ('RFQ-T1', $1, 'Gearbox housing', 'quoting', now() + interval '2 days') returning id`, [buyerA.id])).rows[0].id;
  rfqB = (await owner.query(`insert into rfqs (number, buyer_org_id, title) values ('RFQ-T2', $1, 'Valve body') returning id`, [buyerB.id])).rows[0].id;
  const line = (await owner.query(`insert into rfq_lines (rfq_id, buyer_org_id, line_no, description, qty) values ($1, $2, 1, 'Housing', 4800) returning id`, [rfqA, buyerA.id])).rows[0].id;
  await owner.query(`insert into rfq_invitations (rfq_id, buyer_org_id, supplier_org_id) values ($1, $2, $3)`, [rfqA, buyerA.id, supInvited.id]);
  quoteId = (await owner.query(`insert into quotes (number, rfq_id, buyer_org_id, supplier_org_id, status, submitted_at) values ('Q-T1', $1, $2, $3, 'submitted', now()) returning id`, [rfqA, buyerA.id, supInvited.id])).rows[0].id;
  await owner.query(`insert into quote_lines (quote_id, rfq_line_id, buyer_org_id, supplier_org_id, unit_price) values ($1, $2, $3, $4, 1928)`, [quoteId, line, buyerA.id, supInvited.id]);
  await owner.query(`insert into quote_private (quote_id, supplier_org_id, floor_price) values ($1, $2, 1850)`, [quoteId, supInvited.id]);
});

afterAll(async () => {
  await owner.end();
  await app.end();
});

describe('tenant isolation', () => {
  it('Buyer A sees only its own RFQs', async () => {
    const { rows } = await asOrg({ kind: 'buyer', orgId: buyerA.id }, `select id from rfqs`);
    expect(rows.map((r) => r.id)).toEqual([rfqA]);
  });
  it('Buyer A cannot read Buyer B even by id', async () => {
    const { rows } = await asOrg({ kind: 'buyer', orgId: buyerA.id }, `select id from rfqs where id = $1`, [rfqB]);
    expect(rows).toHaveLength(0);
  });
  it('Buyer A cannot write a row for Buyer B', async () => {
    await expect(asOrg({ kind: 'buyer', orgId: buyerA.id }, `insert into rfqs (number, buyer_org_id, title) values ('RFQ-X', $1, 'x')`, [buyerB.id]))
      .rejects.toThrow(/row-level security/);
  });
  it('no session context sees nothing', async () => {
    const { rows } = await asOrg({ kind: 'system' }, `select id from rfqs`);
    expect(rows).toHaveLength(0);
  });
  it('the API role cannot switch RLS off', async () => {
    await expect(asOrg({ kind: 'buyer', orgId: buyerA.id }, `alter table rfqs disable row level security`)).rejects.toThrow();
  });
});

describe('suppliers', () => {
  it('an invited supplier sees the RFQ; another supplier does not', async () => {
    expect((await asOrg({ kind: 'supplier', orgId: supInvited.id }, `select id from rfqs`)).rows).toHaveLength(1);
    expect((await asOrg({ kind: 'supplier', orgId: supOther.id }, `select id from rfqs`)).rows).toHaveLength(0);
  });
  it('another supplier never sees the bid', async () => {
    expect((await asOrg({ kind: 'supplier', orgId: supOther.id }, `select id from quotes`)).rows).toHaveLength(0);
    expect((await asOrg({ kind: 'supplier', orgId: supOther.id }, `select id from quote_lines`)).rows).toHaveLength(0);
  });
});

describe('sealed bids and floor price', () => {
  it('the buyer and admins cannot read a quote before the sealed period ends', async () => {
    expect((await asOrg({ kind: 'buyer', orgId: buyerA.id }, `select id from quotes`)).rows).toHaveLength(0);
    expect((await asOrg({ kind: 'buyer', orgId: buyerA.id }, `select unit_price from quote_lines`)).rows).toHaveLength(0);
    expect((await asOrg({ kind: 'platform', orgId: ops.id }, `select id from quotes`)).rows).toHaveLength(0);
  });
  it('after the sealed period the buyer sees the quote', async () => {
    await owner.query(`update rfqs set sealed_until = now() - interval '1 minute' where id = $1`, [rfqA]);
    const { rows } = await asOrg({ kind: 'buyer', orgId: buyerA.id }, `select unit_price from quote_lines`);
    expect(rows).toEqual([{ unit_price: '1928.0000' }]);
  });
  it('the floor price is readable only by its supplier', async () => {
    expect((await asOrg({ kind: 'buyer', orgId: buyerA.id }, `select * from quote_private`)).rows).toHaveLength(0);
    expect((await asOrg({ kind: 'platform', orgId: ops.id }, `select * from quote_private`)).rows).toHaveLength(0);
    expect((await asOrg({ kind: 'supplier', orgId: supInvited.id }, `select floor_price from quote_private`)).rows).toEqual([{ floor_price: '1850.0000' }]);
  });
});

describe('admins read, never write order documents', () => {
  it('platform can read across orgs', async () => {
    expect((await asOrg({ kind: 'platform', orgId: ops.id }, `select id from rfqs`)).rows.length).toBe(2);
  });
  it('platform cannot create or edit an RFQ', async () => {
    await expect(asOrg({ kind: 'platform', orgId: ops.id }, `insert into rfqs (number, buyer_org_id, title) values ('RFQ-Y', $1, 'x')`, [buyerA.id]))
      .rejects.toThrow(/row-level security/);
    const upd = await asOrg({ kind: 'platform', orgId: ops.id }, `update rfqs set title = 'changed' where id = $1`, [rfqA]);
    expect(upd.rowCount).toBe(0);
  });
});

describe('document numbering', () => {
  it('formats and never repeats a number under concurrency', async () => {
    const nums = await Promise.all(Array.from({ length: 20 }, () =>
      asOrg({ kind: 'system' }, `select next_doc_number('PO') as n`).then((r) => r.rows[0].n as string)));
    expect(new Set(nums).size).toBe(20);
    for (const n of nums) expect(n).toMatch(/^PO-\d{6}$/);
  });
  it('rejects an unknown type', async () => {
    await expect(asOrg({ kind: 'system' }, `select next_doc_number('XYZ')`)).rejects.toThrow(/unknown document type/);
  });
});

describe('audit chain', () => {
  const append = (ctx: DbContext, org: string | null, action: string) =>
    asOrg(ctx, `select seq from audit_append($1, 'Tester', 'Test', $2, null, '{"summary":"t"}'::jsonb)`, [org, action]);

  it('appends linked events and verifies', async () => {
    await append({ kind: 'buyer', orgId: buyerA.id }, buyerA.id, 'test.a');
    await append({ kind: 'system' }, null, 'test.b');
    const v = (await asOrg({ kind: 'system' }, `select * from audit_verify()`)).rows[0];
    expect(v.ok).toBe(true);
    expect(Number(v.checked)).toBeGreaterThanOrEqual(2);
  });
  it('an org cannot write events for another org', async () => {
    await expect(append({ kind: 'buyer', orgId: buyerA.id }, buyerB.id, 'test.forged')).rejects.toThrow(/does not match/);
  });
  it('a buyer reads only its own events', async () => {
    const { rows } = await asOrg({ kind: 'buyer', orgId: buyerB.id }, `select action from audit_events`);
    expect(rows.map((r) => r.action)).not.toContain('test.a');
  });
  it('rows cannot be updated or deleted, even by the owner', async () => {
    await expect(owner.query(`update audit_events set action = 'x' where seq = 1`)).rejects.toThrow(/append-only/);
    await expect(owner.query(`delete from audit_events where seq = 1`)).rejects.toThrow(/append-only/);
    await expect(asOrg({ kind: 'platform', orgId: ops.id }, `delete from audit_events`)).rejects.toThrow();
  });
  it('detects tampering if someone bypasses the trigger', async () => {
    const original = (await owner.query(`select action from audit_events where seq = 1`)).rows[0].action;
    await owner.query(`alter table audit_events disable trigger audit_no_update`);
    try {
      await owner.query(`update audit_events set action = 'tampered' where seq = 1`);
      const bad = (await owner.query(`select * from audit_verify()`)).rows[0];
      expect(bad.ok).toBe(false);
      expect(Number(bad.first_bad_seq)).toBe(1);
    } finally {
      await owner.query(`update audit_events set action = $1 where seq = 1`, [original]);
      await owner.query(`alter table audit_events enable trigger audit_no_update`);
    }
    expect((await owner.query(`select ok from audit_verify()`)).rows[0].ok).toBe(true);
  });
});
