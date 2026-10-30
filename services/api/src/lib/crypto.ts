import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest();

export const hmacSha256 = (key: string, data: string | Buffer) => createHmac('sha256', key).update(data).digest();

/** Constant-time comparison for codes, tokens and signatures. */
export function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** 6-digit one-time code, uniform over 000000–999999. */
export const newCode = () => randomInt(0, 1_000_000).toString().padStart(6, '0');

/** Opaque session token for the cookie; only its sha256 is stored. */
export const newToken = () => randomBytes(32).toString('base64url');
