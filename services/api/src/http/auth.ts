/** Session cookie → request.session, and the role checks every route uses. */
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { OrgKind } from '../db/pool.js';
import { forbidden, unauthorised } from './errors.js';
import { SESSION_COOKIE, type Session } from '../services/sessions.js';

declare module 'fastify' {
  interface FastifyRequest {
    session: Session | null;
  }
}

export const PLATFORM_ROLES = { review: ['verifier', 'super_admin'], read: ['ops', 'verifier', 'platform_finance', 'super_admin'] } as const;

/** Throws 401/403 unless the request has a session of one of `kinds` (and, if given, one of `roles`). */
export function requireSession(req: FastifyRequest, kinds: OrgKind[], roles?: readonly string[]): Session {
  const s = req.session;
  if (!s) throw unauthorised();
  if (!kinds.includes(s.orgKind)) throw forbidden();
  if (roles && !roles.includes(s.role)) throw forbidden();
  return s;
}

export function setSessionCookie(reply: FastifyReply, token: string, ttlHours: number, secure: boolean) {
  reply.setCookie(SESSION_COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', secure, maxAge: ttlHours * 3600 });
}

export const ctxOf = (s: Session) => ({ kind: s.orgKind, orgId: s.orgId, userId: s.userId });
