import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createPool } from '../src/db/pool.js';
import { ConsoleEmail } from '../src/integrations/email.js';
import { StubExtractor, type Extractor } from '../src/integrations/extractor.js';
import { StubGst } from '../src/integrations/gst.js';
import { MemoryStorage } from '../src/integrations/storage.js';
import { ConsoleWhatsApp } from '../src/integrations/whatsapp.js';

const HOST = process.env.TEST_DB_HOST ?? 'localhost:5433';
export const TEST_DB = 'ordershed_test';
export const ADMIN_URL = `postgres://ordershed_owner:owner_dev_only@${HOST}/ordershed`;
export const TEST_OWNER_URL = `postgres://ordershed_owner:owner_dev_only@${HOST}/${TEST_DB}`;
export const TEST_APP_URL = `postgres://ordershed_app:app_dev_only@${HOST}/${TEST_DB}`;

/** Owner connection: bypasses row-level security. Only for arranging test data and simulating tampering. */
export const ownerPool = () => new pg.Pool({ connectionString: TEST_OWNER_URL, max: 2 });

export async function testApp(overrides: Record<string, unknown> = {}, extractor: Extractor = new StubExtractor()) {
  const config = loadConfig({
    NODE_ENV: 'test', DATABASE_URL: TEST_APP_URL, WHATSAPP_APP_SECRET: 'test-app-secret', WHATSAPP_VERIFY_TOKEN: 'test-verify', AUTH_RATE_LIMIT_PER_MIN: 1000, ...overrides,
  });
  const db = createPool(TEST_APP_URL, 5);
  const whatsapp = new ConsoleWhatsApp();
  const email = new ConsoleEmail();
  const storage = new MemoryStorage();
  const app = await buildApp({ config, db, gst: new StubGst(), whatsapp, email, storage, extractor });
  return { app, db, whatsapp, email, config, storage };
}

/** Creates an org (and optionally a user with a role) directly, as the owner. */
export async function makeOrg(owner: pg.Pool, kind: 'buyer' | 'supplier' | 'platform', name: string, user?: { email?: string; phone?: string; role: string }) {
  const id = randomUUID();
  const n = (await owner.query(`select next_doc_number($1) as n`, [kind === 'supplier' ? 'VEN' : 'ORG'])).rows[0].n;
  await owner.query(`insert into orgs (id, number, kind, name) values ($1, $2, $3, $4)`, [id, n, kind, name]);
  let userId: string | null = null;
  if (user) {
    userId = (await owner.query(`insert into users (name, email, phone) values ($1, $2, $3) returning id`, [`${name} user`, user.email ?? null, user.phone ?? null])).rows[0].id;
    await owner.query(`insert into memberships (user_id, org_id, role) values ($1, $2, $3)`, [userId, id, user.role]);
  }
  return { id, number: n as string, userId };
}

export const cookieOf = (res: { cookies: { name: string; value: string }[] }) => {
  const c = res.cookies.find((x) => x.name === 'os_session');
  return c ? { os_session: c.value } : {};
};
