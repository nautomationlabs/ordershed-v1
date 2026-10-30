/**
 * WhatsApp webhook. Meta calls GET once to verify the URL, then POSTs every inbound message and delivery status.
 * Every POST must carry a valid X-Hub-Signature-256 over the raw body, or it is rejected.
 * Keywords: JOIN, STATUS, HELP, STOP (and START to opt back in).
 */
import type { FastifyInstance } from 'fastify';
import type { AppDeps } from '../app.js';
import { withTx } from '../db/pool.js';
import { forbidden } from '../http/errors.js';
import { parseWebhook, verifyWebhookSignature } from '../integrations/whatsapp.js';
import { maskPhone } from '../lib/phone.js';
import { audit } from '../services/audit.js';

export function replyFor(keyword: string, ctx: { joinUrl: string; status: string | null }): string | null {
  switch (keyword) {
    case 'JOIN':
      return `Welcome to Ordershed. Engineering RFQs from verified buyers, free for suppliers. Join here with your GSTIN (2 minutes): ${ctx.joinUrl}`;
    case 'STATUS':
      return ctx.status ?? 'We could not find a supplier account for this number. Send JOIN to get started.';
    case 'HELP':
      return 'Send JOIN to sign up, STATUS to check your verification, STOP to stop messages. A person from our team will also reply here.';
    case 'STOP':
      return 'You will not get more messages from Ordershed. Send START any time to turn them back on.';
    case 'START':
      return 'Messages are back on. Send HELP for options.';
    default:
      return null;
  }
}

export async function whatsappRoutes(app: FastifyInstance, deps: AppDeps) {
  // Raw body is needed for the signature check, so this route parses JSON itself.
  app.register(async (scope) => {
    scope.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => done(null, body));

    scope.get('/v1/webhooks/whatsapp', async (req, reply) => {
      const q = req.query as Record<string, string>;
      if (q['hub.mode'] === 'subscribe' && deps.config.WHATSAPP_VERIFY_TOKEN && q['hub.verify_token'] === deps.config.WHATSAPP_VERIFY_TOKEN) {
        reply.type('text/plain');
        return q['hub.challenge'] ?? '';
      }
      throw forbidden('Verification token mismatch.');
    });

    scope.post('/v1/webhooks/whatsapp', async (req, reply) => {
      const raw = req.body as Buffer;
      if (!deps.config.WHATSAPP_APP_SECRET || !verifyWebhookSignature(deps.config.WHATSAPP_APP_SECRET, raw, req.headers['x-hub-signature-256'] as string | undefined)) {
        throw forbidden('Invalid signature.');
      }
      const { messages, statuses } = parseWebhook(JSON.parse(raw.toString('utf8')));

      for (const st of statuses) {
        await withTx(deps.db, { kind: 'system' }, (tx) =>
          tx.query(`update whatsapp_messages set status = $2, updated_at = now() where wa_message_id = $1`, [st.waMessageId, st.status]));
      }

      for (const m of messages) {
        const keyword = m.text.trim().split(/\s+/)[0]?.toUpperCase() ?? '';
        const status = await withTx(deps.db, { kind: 'system' }, async (tx) => {
          const dup = await tx.query(
            `insert into whatsapp_messages (direction, wa_message_id, phone, kind, body) values ('in', $1, $2, $3, $4)
             on conflict (wa_message_id) do nothing returning id`,
            [m.waMessageId, m.fromE164, m.type, m.text.slice(0, 2000)]);
          if (!dup.rowCount) return { duplicate: true, text: null };   // Meta retries; handle each message once
          if (keyword === 'STOP') {
            await tx.query(`insert into whatsapp_optouts (phone) values ($1) on conflict do nothing`, [m.fromE164]);
            await audit(tx, { orgId: null, actorLabel: maskPhone(m.fromE164), actorRole: 'WhatsApp', action: 'whatsapp.opted_out', summary: `${maskPhone(m.fromE164)} sent STOP` });
          }
          if (keyword === 'START') await tx.query(`delete from whatsapp_optouts where phone = $1`, [m.fromE164]);
          if (keyword !== 'STATUS') return { duplicate: false, text: null };
          const { rows } = await tx.query(
            `select o.name, o.tier, v.number, v.status from users u join memberships mb on mb.user_id = u.id join orgs o on o.id = mb.org_id
               left join lateral (select number, status from verification_cases where org_id = o.id order by submitted_at desc limit 1) v on true
              where u.phone = $1 and o.kind = 'supplier' limit 1`, [m.fromE164]);
          const r = rows[0];
          return { duplicate: false, text: r ? `${r.name}: tier ${r.tier}. Latest verification ${r.number ?? '—'} is ${r.status ?? 'not started'}.` : null };
        });
        if (status.duplicate) continue;
        const text = replyFor(keyword, { joinUrl: `${deps.config.PUBLIC_WEB_URL}/s/join`, status: status.text });
        if (!text) continue;
        const sent = await deps.whatsapp.sendText(m.fromE164, text).catch((err: Error) => { req.log.warn({ err }, 'whatsapp reply failed'); return null; });
        if (sent) {
          await withTx(deps.db, { kind: 'system' }, (tx) =>
            tx.query(`insert into whatsapp_messages (direction, wa_message_id, phone, kind, body, status) values ('out', $1, $2, 'text', $3, 'sent')`, [sent.id, m.fromE164, text]));
        }
      }
      reply.code(200);
      return { ok: true };
    });
  });
}
