/** Audit log, verification queue and metering. Row-level security scopes every read to the caller's org (admins: all). */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDeps } from '../app.js';
import { withTx } from '../db/pool.js';
import { ctxOf, PLATFORM_ROLES, requireSession } from '../http/auth.js';
import { listAudit, verifyAudit } from '../services/audit.js';
import { rfqCosts } from '../services/metering.js';
import { listCases, reviewCase } from '../services/verification.js';

const reviewBody = z.object({ decision: z.enum(['approve', 'reject']), note: z.string().max(500).optional() });

export async function governanceRoutes(app: FastifyInstance, deps: AppDeps) {
  app.get('/v1/audit-events', async (req) => {
    const s = requireSession(req, ['buyer', 'supplier', 'platform']);
    const limit = Math.min(Number((req.query as { limit?: string }).limit ?? 200) || 200, 1000);
    return withTx(deps.db, ctxOf(s), (tx) => listAudit(tx, limit));
  });

  app.get('/v1/audit-events/verify', async (req) => {
    const s = requireSession(req, ['buyer', 'supplier', 'platform']);
    return withTx(deps.db, ctxOf(s), (tx) => verifyAudit(tx));
  });

  app.get('/v1/admin/verification', async (req) => {
    const s = requireSession(req, ['platform'], PLATFORM_ROLES.read);
    const status = (req.query as { status?: string }).status;
    return withTx(deps.db, ctxOf(s), (tx) => listCases(tx, status === 'all' ? undefined : ((status as 'pending') ?? 'pending')));
  });

  app.post('/v1/admin/verification/:number/review', async (req) => {
    const s = requireSession(req, ['platform'], PLATFORM_ROLES.review);
    const { number } = req.params as { number: string };
    const body = reviewBody.parse(req.body);
    return withTx(deps.db, ctxOf(s), (tx) => reviewCase(tx, s, number, body.decision, body.note));
  });

  app.get('/v1/admin/metering', async (req) => {
    const s = requireSession(req, ['platform'], PLATFORM_ROLES.read);
    return withTx(deps.db, ctxOf(s), (tx) => rfqCosts(tx, deps.config.RFQ_COST_ALERT_INR));
  });
}
