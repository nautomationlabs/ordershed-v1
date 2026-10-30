/**
 * Sign-in with a one-time code. Buyer and admin: email. Supplier: WhatsApp.
 * The response is the same whether or not the address belongs to a user, so the endpoint cannot be used to
 * discover who is on the platform. Admin passkeys and Cognito/SSO come later (needs-founder).
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDeps } from '../app.js';
import { withTx } from '../db/pool.js';
import { badRequest, unauthorised } from '../http/errors.js';
import { setSessionCookie } from '../http/auth.js';
import { maskEmail, maskPhone, normalisePhone } from '../lib/phone.js';
import { audit } from '../services/audit.js';
import { CODE_MESSAGES, CODE_TTL_MIN, checkChallenge, createChallenge } from '../services/otp.js';
import { createSession, revokeSession, SESSION_COOKIE } from '../services/sessions.js';

const PORTAL_KIND = { buyer: 'buyer', supplier: 'supplier', admin: 'platform' } as const;

const codeBody = z.object({ portal: z.enum(['buyer', 'supplier', 'admin']), destination: z.string().min(3).max(200) });
const verifyBody = z.object({ challengeId: z.string().uuid(), code: z.string().min(4).max(10) });

export async function authRoutes(app: FastifyInstance, deps: AppDeps) {
  const limit = { config: { rateLimit: { max: deps.config.AUTH_RATE_LIMIT_PER_MIN, timeWindow: '1 minute' } } };

  app.post('/v1/auth/code', limit, async (req, reply) => {
    const body = codeBody.parse(req.body);
    const kind = PORTAL_KIND[body.portal];
    const channel = body.portal === 'supplier' ? 'whatsapp' : 'email';
    const destination = channel === 'whatsapp' ? normalisePhone(body.destination) : body.destination.trim().toLowerCase();
    if (!destination || (channel === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(destination))) {
      throw badRequest('destination_invalid', channel === 'email' ? 'Enter your work email.' : 'Enter your WhatsApp number.');
    }

    const created = await withTx(deps.db, { kind: 'system' }, async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        `select u.id from users u join memberships m on m.user_id = u.id join orgs o on o.id = m.org_id
          where ${channel === 'email' ? 'u.email' : 'u.phone'} = $1 and o.kind = $2 and o.status in ('active', 'trial') limit 1`,
        [destination, kind],
      );
      const userId = rows[0]?.id ?? null;
      const ch = await createChallenge(tx, deps.config.OTP_PEPPER, { purpose: 'login', portal: kind, channel, destination, userId });
      return { ...ch, userId };
    });

    if (created.userId) {
      if (channel === 'email') await deps.email.sendCode(destination, created.code);
      else await deps.whatsapp.sendCode(destination, created.code);
    }
    reply.code(202);
    return { challengeId: created.id, sentTo: channel === 'email' ? maskEmail(destination) : maskPhone(destination), expiresInSec: CODE_TTL_MIN * 60 };
  });

  app.post('/v1/auth/verify', limit, async (req, reply) => {
    const body = verifyBody.parse(req.body);
    const result = await withTx(deps.db, { kind: 'system' }, async (tx) => {
      const check = await checkChallenge(tx, deps.config.OTP_PEPPER, body.challengeId, body.code.trim(), 'login');
      if (!check.ok) return { failed: check.reason };
      if (!check.challenge.userId) return { failed: 'invalid' as const };   // unknown address: never succeeds
      const { rows } = await tx.query(
        `select m.org_id, m.role, o.kind, o.number, o.name as org_name, u.name
           from memberships m join orgs o on o.id = m.org_id join users u on u.id = m.user_id
          where m.user_id = $1 and o.kind = $2 order by m.created_at limit 1`,
        [check.challenge.userId, check.challenge.portal],
      );
      const m = rows[0];
      if (!m) return { failed: 'invalid' as const };
      const token = await createSession(tx, { userId: check.challenge.userId, orgId: m.org_id, role: m.role, ip: req.ip, userAgent: req.headers['user-agent'] }, deps.config.SESSION_TTL_HOURS);
      return { failed: null, token, userId: check.challenge.userId as string, m };
    });
    if (result.failed) throw badRequest(`code_${result.failed}`, CODE_MESSAGES[result.failed]);

    const { m } = result;
    await withTx(deps.db, { kind: m.kind, orgId: m.org_id, userId: result.userId }, (tx) =>
      audit(tx, { orgId: m.org_id, actorLabel: m.name, actorRole: m.role, action: 'auth.signed_in', summary: `${m.name} signed in` }),
    );
    setSessionCookie(reply, result.token, deps.config.SESSION_TTL_HOURS, deps.config.NODE_ENV === 'production');
    return { user: { name: m.name }, org: { number: m.number, name: m.org_name, kind: m.kind }, role: m.role };
  });

  app.get('/v1/auth/me', async (req) => {
    const s = req.session;
    if (!s) throw unauthorised();
    return { user: { name: s.userName }, org: { number: s.orgNumber, name: s.orgName, kind: s.orgKind }, role: s.role };
  });

  app.post('/v1/auth/logout', async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) await revokeSession(deps.db, token);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });

}
