/**
 * One-time codes for sign-in and Join: 6 digits, 10 minutes, 5 attempts, at most 3 codes per destination
 * per 15 minutes. Only HMAC(pepper, challengeId:code) is stored.
 */
import { randomUUID } from 'node:crypto';
import type { Tx } from '../db/pool.js';
import { hmacSha256, newCode, safeEqual } from '../lib/crypto.js';
import { tooMany } from '../http/errors.js';

export const CODE_TTL_MIN = 10;
const MAX_PER_WINDOW = 3;

export interface ChallengeInput {
  purpose: 'login' | 'join';
  portal?: 'buyer' | 'supplier' | 'platform' | null;
  channel: 'email' | 'whatsapp';
  destination: string;
  userId?: string | null;
}

export async function createChallenge(tx: Tx, pepper: string, input: ChallengeInput): Promise<{ id: string; code: string }> {
  const { rows } = await tx.query<{ n: string }>(
    `select count(*) as n from otp_challenges where destination = $1 and created_at > now() - interval '15 minutes'`,
    [input.destination],
  );
  if (Number(rows[0]!.n) >= MAX_PER_WINDOW) throw tooMany('Too many codes requested. Wait 15 minutes and try again.');

  const id = randomUUID();
  const code = newCode();
  await tx.query(
    `insert into otp_challenges (id, purpose, portal, channel, destination, code_hash, expires_at, user_id)
     values ($1, $2, $3, $4, $5, $6, now() + make_interval(mins => $7), $8)`,
    [id, input.purpose, input.portal ?? null, input.channel, input.destination, hmacSha256(pepper, `${id}:${code}`), CODE_TTL_MIN, input.userId ?? null],
  );
  return { id, code };
}

export type CheckResult =
  | { ok: true; challenge: { id: string; purpose: string; portal: string | null; destination: string; userId: string | null } }
  | { ok: false; reason: 'invalid' | 'expired' | 'locked' };

/**
 * Checks a code. Failed attempts are recorded, so the caller must let this transaction commit
 * and raise its error afterwards (see routes).
 */
export async function checkChallenge(tx: Tx, pepper: string, id: string, code: string, purpose: 'login' | 'join'): Promise<CheckResult> {
  const { rows } = await tx.query(
    `select id, purpose, portal, destination, user_id, code_hash, attempts, max_attempts,
            consumed_at is not null as consumed, expires_at < now() as expired
       from otp_challenges where id = $1 and purpose = $2 for update`,
    [id, purpose],
  );
  const c = rows[0];
  if (!c || c.consumed) return { ok: false, reason: 'invalid' };
  if (c.expired) return { ok: false, reason: 'expired' };
  if (c.attempts >= c.max_attempts) return { ok: false, reason: 'locked' };

  const matches = /^\d{6}$/.test(code) && safeEqual(hmacSha256(pepper, `${id}:${code}`), c.code_hash);
  if (!matches) {
    await tx.query(`update otp_challenges set attempts = attempts + 1 where id = $1`, [id]);
    return { ok: false, reason: c.attempts + 1 >= c.max_attempts ? 'locked' : 'invalid' };
  }
  await tx.query(`update otp_challenges set consumed_at = now() where id = $1`, [id]);
  return { ok: true, challenge: { id: c.id, purpose: c.purpose, portal: c.portal, destination: c.destination, userId: c.user_id } };
}

export const CODE_MESSAGES: Record<'invalid' | 'expired' | 'locked', string> = {
  invalid: 'That code is not right. Check the latest message and try again.',
  expired: 'That code has expired. Ask for a new one.',
  locked: 'Too many wrong codes. Ask for a new one.',
};
