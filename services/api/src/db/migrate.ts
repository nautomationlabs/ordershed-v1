/**
 * Applies migrations/*.sql in order, each in its own transaction, as the owner role.
 * Then enables login for the restricted `ordershed_app` role the API uses.
 * Usage: npm run migrate -w services/api
 */
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { loadConfig } from '../config.js';

export async function migrate(ownerUrl: string, appPassword: string, log: (m: string) => void = console.log) {
  const dir = resolve(import.meta.dirname, '../../migrations');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const client = new pg.Client({ connectionString: ownerUrl });
  await client.connect();
  try {
    await client.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
    const done = new Set((await client.query<{ name: string }>('select name from schema_migrations')).rows.map((r) => r.name));
    for (const f of files) {
      if (done.has(f)) continue;
      const sql = await readFile(resolve(dir, f), 'utf8');
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into schema_migrations (name) values ($1)', [f]);
        await client.query('commit');
        log(`applied ${f}`);
      } catch (err) {
        await client.query('rollback');
        throw new Error(`migration ${f} failed: ${(err as Error).message}`);
      }
    }
    // Password via format(%L) so it is quoted safely; ALTER ROLE does not take bind parameters.
    const { rows } = await client.query<{ sql: string }>(`select format('alter role ordershed_app with login password %L', $1::text) as sql`, [appPassword]);
    await client.query(rows[0]!.sql);
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('src/db/migrate.ts')) {
  const cfg = loadConfig();
  migrate(cfg.DATABASE_OWNER_URL, cfg.APP_DB_PASSWORD)
    .then(() => console.log('migrations up to date'))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
