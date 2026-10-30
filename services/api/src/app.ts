/**
 * The HTTP API. Built from injected dependencies so tests run it with console WhatsApp/email and the GST stand-in.
 * In AWS it sits behind CloudFront at /v1/* (same origin as the web app), so there is no CORS.
 */
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { randomBytes } from 'node:crypto';
import { ZodError } from 'zod';
import type { Config } from './config.js';
import type { Db } from './db/pool.js';
import { HttpError, forbidden } from './http/errors.js';
import type { Email } from './integrations/email.js';
import type { GstLookup } from './integrations/gst.js';
import type { WhatsApp } from './integrations/whatsapp.js';
import { authRoutes } from './routes/auth.js';
import { governanceRoutes } from './routes/governance.js';
import { joinRoutes } from './routes/join.js';
import { whatsappRoutes } from './routes/whatsapp.js';
import { findSession, SESSION_COOKIE } from './services/sessions.js';

export interface AppDeps {
  config: Config;
  db: Db;
  gst: GstLookup;
  whatsapp: WhatsApp;
  email: Email;
}

export async function buildApp(deps: AppDeps, opts: Pick<FastifyServerOptions, 'logger'> = {}) {
  const app = Fastify({
    logger: opts.logger ?? false,
    trustProxy: true,
    bodyLimit: 1_000_000,
    genReqId: () => `req_${randomBytes(6).toString('hex')}`,
  });
  const allowedOrigins = new Set(deps.config.WEB_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean));

  await app.register(cookie);
  await app.register(rateLimit, { global: false });
  app.decorateRequest('session', null);

  app.addHook('onRequest', async (req, reply) => {
    reply.header('x-request-id', req.id);
    // State-changing requests from a browser must come from our own web app (CSRF). Webhooks are signed instead.
    const origin = req.headers.origin;
    if (req.method !== 'GET' && req.method !== 'HEAD' && origin && !allowedOrigins.has(origin) && !req.url.startsWith('/v1/webhooks/')) {
      throw forbidden('Request origin not allowed.');
    }
    const token = req.cookies[SESSION_COOKIE];
    req.session = token ? await findSession(deps.db, token) : null;
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(422).send({ error: { code: 'invalid_input', message: 'Some fields are missing or not valid.', details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) }, requestId: req.id });
    }
    if (err instanceof HttpError) {
      return reply.code(err.status).send({ error: { code: err.code, message: err.message, details: err.details }, requestId: req.id });
    }
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status >= 400 && status < 500) {
      return reply.code(status).send({ error: { code: status === 429 ? 'rate_limited' : 'bad_request', message: (err as Error).message }, requestId: req.id });
    }
    req.log.error({ err }, 'unhandled error');
    return reply.code(500).send({ error: { code: 'internal', message: 'Something went wrong on our side. Nothing was changed.' }, requestId: req.id });
  });

  app.get('/v1/health', async () => {
    await deps.db.query('select 1');
    return { ok: true, whatsapp: deps.config.WHATSAPP_MODE, gst: deps.gst.name };
  });

  await authRoutes(app, deps);
  await joinRoutes(app, deps);
  await governanceRoutes(app, deps);
  await whatsappRoutes(app, deps);
  return app;
}
