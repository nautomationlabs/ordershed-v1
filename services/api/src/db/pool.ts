import pg from 'pg';

// Return numeric and bigint as strings; money is never passed through a JS float on the way in or out.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => v);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => v);

export type Db = pg.Pool;
export type Tx = pg.PoolClient;

export function createPool(connectionString: string, max = 10): Db {
  return new pg.Pool({ connectionString, max });
}

export type OrgKind = 'buyer' | 'supplier' | 'platform';
export interface DbContext {
  kind: OrgKind | 'system';
  orgId?: string | null;
  userId?: string | null;
}

/**
 * Run `fn` in one transaction with the row-level-security context set (see migrations/0006_rls.sql).
 * Every query the API makes goes through here, so the database always knows whose request it is.
 */
export async function withTx<T>(db: Db, ctx: DbContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const tx = await db.connect();
  try {
    await tx.query('begin');
    await tx.query(
      `select set_config('app.org_kind', $1, true), set_config('app.org_id', $2, true), set_config('app.user_id', $3, true)`,
      [ctx.kind, ctx.orgId ?? '', ctx.userId ?? ''],
    );
    const out = await fn(tx);
    await tx.query('commit');
    return out;
  } catch (err) {
    await tx.query('rollback').catch(() => {});
    throw err;
  } finally {
    tx.release();
  }
}
