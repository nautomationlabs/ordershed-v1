import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDeps } from '../app.js';
import { setSessionCookie } from '../http/auth.js';
import { completeJoin, lookupGstin, startJoin } from '../services/join.js';

const lookupBody = z.object({ gstin: z.string().min(10).max(20) });
const startBody = z.object({ gstin: z.string().min(10).max(20), phone: z.string().min(8).max(20) });
const verifyBody = z.object({
  applicationId: z.string().uuid(),
  code: z.string().min(4).max(10),
  businessTypes: z.array(z.string().max(40)).max(12).optional(),
  language: z.enum(['en', 'ta', 'hi', 'kn', 'te']).optional(),
});

export async function joinRoutes(app: FastifyInstance, deps: AppDeps) {
  const limit = { config: { rateLimit: { max: deps.config.AUTH_RATE_LIMIT_PER_MIN, timeWindow: '1 minute' } } };

  app.post('/v1/join/lookup', limit, async (req) => {
    const { record, alreadyRegistered } = await lookupGstin(deps, lookupBody.parse(req.body).gstin);
    return { ...record, alreadyRegistered };
  });

  app.post('/v1/join/start', limit, async (req, reply) => {
    reply.code(202);
    return startJoin(deps, startBody.parse(req.body));
  });

  app.post('/v1/join/verify', limit, async (req, reply) => {
    const body = verifyBody.parse(req.body);
    const r = await completeJoin(deps, { ...body, ip: req.ip, userAgent: req.headers['user-agent'] });
    setSessionCookie(reply, r.token, deps.config.SESSION_TTL_HOURS, deps.config.NODE_ENV === 'production');
    return { org: r.org, verification: r.verification };
  });
}
