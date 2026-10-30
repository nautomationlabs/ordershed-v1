/**
 * Development seed: our ops org with two reviewers, and one fictional buyer org (Kestrel Motion GmbH).
 * All names are fictional. Safe to run more than once. Never run against production.
 * Usage: npm run seed -w services/api [-- --admin-email you@example.com]
 */
import { randomUUID } from 'node:crypto';
import { loadConfig } from '../config.js';
import { createPool, withTx, type Tx } from './pool.js';

async function ensureOrg(tx: Tx, kind: 'platform' | 'buyer', type: 'ORG', name: string, country: string) {
  const found = await tx.query<{ id: string }>(`select id from orgs where name = $1 and kind = $2`, [name, kind]);
  if (found.rows[0]) return found.rows[0].id;
  const id = randomUUID();
  await tx.query(`select set_config('app.org_id', $1, true)`, [id]);
  const n = (await tx.query<{ n: string }>(`select next_doc_number($1) as n`, [type])).rows[0]!.n;
  await tx.query(`insert into orgs (id, number, kind, name, legal_name, country) values ($1, $2, $3, $4, $4, $5)`, [id, n, kind, name, country]);
  return id;
}

async function ensureUser(tx: Tx, orgId: string, name: string, email: string, role: string) {
  await tx.query(`select set_config('app.org_id', $1, true)`, [orgId]);
  const u = await tx.query<{ id: string }>(
    `insert into users (name, email) values ($1, $2) on conflict (email) do update set name = excluded.name returning id`, [name, email]);
  await tx.query(`insert into memberships (user_id, org_id, role) values ($1, $2, $3) on conflict do nothing`, [u.rows[0]!.id, orgId, role]);
}

const config = loadConfig();
if (config.NODE_ENV === 'production') throw new Error('Refusing to seed production.');
const adminEmail = process.argv.includes('--admin-email') ? process.argv[process.argv.indexOf('--admin-email') + 1]! : 'ops@ordershed.test';

const db = createPool(config.DATABASE_URL, 2);
await withTx(db, { kind: 'system' }, async (tx) => {
  const ops = await ensureOrg(tx, 'platform', 'ORG', 'Ordershed Operations', 'IN');
  await ensureUser(tx, ops, 'Ops Admin', adminEmail, 'super_admin');
  await ensureUser(tx, ops, 'K. Iyer', 'verifier@ordershed.test', 'verifier');
  const buyer = await ensureOrg(tx, 'buyer', 'ORG', 'Kestrel Motion GmbH', 'DE');
  await ensureUser(tx, buyer, 'Rohan Deshpande', 'rohan@kestrel.test', 'purchase_head');
});
await db.end();
console.log(`seeded: admin ${adminEmail}, verifier verifier@ordershed.test, buyer rohan@kestrel.test`);
