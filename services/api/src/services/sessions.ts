/** Server-side sessions. The cookie holds a random token; the database holds only its sha256. */
import type { Db, OrgKind, Tx } from '../db/pool.js';
import { withTx } from '../db/pool.js';
import { newToken, sha256 } from '../lib/crypto.js';

export const SESSION_COOKIE = 'os_session';

export interface Session {
  sessionId: string;
  userId: string;
  userName: string;
  orgId: string;
  orgKind: OrgKind;
  orgNumber: string;
  orgName: string;
  role: string;
}

export async function createSession(tx: Tx, s: { userId: string; orgId: string; role: string; ip?: string; userAgent?: string }, ttlHours: number) {
  const token = newToken();
  await tx.query(
    `insert into sessions (token_hash, user_id, org_id, role, expires_at, ip, user_agent)
     values ($1, $2, $3, $4, now() + make_interval(hours => $5), $6, $7)`,
    [sha256(token), s.userId, s.orgId, s.role, ttlHours, s.ip ?? null, s.userAgent?.slice(0, 300) ?? null],
  );
  return token;
}

export async function findSession(db: Db, token: string): Promise<Session | null> {
  return withTx(db, { kind: 'system' }, async (tx) => {
    const { rows } = await tx.query(
      `select s.id, s.user_id, u.name as user_name, s.org_id, o.kind, o.number, o.name as org_name, s.role
         from sessions s join users u on u.id = s.user_id join orgs o on o.id = s.org_id
        where s.token_hash = $1 and s.revoked_at is null and s.expires_at > now()`,
      [sha256(token)],
    );
    const r = rows[0];
    return r
      ? { sessionId: r.id, userId: r.user_id, userName: r.user_name, orgId: r.org_id, orgKind: r.kind, orgNumber: r.number, orgName: r.org_name, role: r.role }
      : null;
  });
}

export async function revokeSession(db: Db, token: string) {
  await withTx(db, { kind: 'system' }, (tx) => tx.query(`update sessions set revoked_at = now() where token_hash = $1`, [sha256(token)]));
}
