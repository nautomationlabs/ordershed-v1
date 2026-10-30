/**
 * WhatsApp Business Platform (Cloud API). Two implementations behind one interface:
 *  - CloudWhatsApp: sends through Meta's Graph API (test number now, Ordershed's own number later).
 *  - ConsoleWhatsApp: logs instead of sending; used in development and tests.
 * One-time codes go out as an approved "authentication" template (WHATSAPP_OTP_TEMPLATE); free text is only
 * allowed within 24 h of the supplier's last message, which is when we reply to JOIN / STATUS / HELP / STOP.
 */
import type { Config } from '../config.js';
import { hmacSha256, safeEqual } from '../lib/crypto.js';
import { waId } from '../lib/phone.js';

export interface SentMessage { id: string }

export interface WhatsApp {
  sendCode(toE164: string, code: string): Promise<SentMessage>;
  sendText(toE164: string, body: string): Promise<SentMessage>;
}

export class ConsoleWhatsApp implements WhatsApp {
  readonly sent: { to: string; kind: 'code' | 'text'; body: string }[] = [];
  private n = 0;
  constructor(private log: (msg: string) => void = () => {}) {}
  async sendCode(to: string, code: string) {
    this.sent.push({ to, kind: 'code', body: code });
    this.log(`[whatsapp:console] code ${code} → ${to}`);
    return { id: `console.${++this.n}` };
  }
  async sendText(to: string, body: string) {
    this.sent.push({ to, kind: 'text', body });
    this.log(`[whatsapp:console] text → ${to}: ${body}`);
    return { id: `console.${++this.n}` };
  }
}

export class CloudWhatsApp implements WhatsApp {
  constructor(private cfg: Pick<Config, 'WHATSAPP_TOKEN' | 'WHATSAPP_PHONE_NUMBER_ID' | 'WHATSAPP_OTP_TEMPLATE' | 'WHATSAPP_GRAPH_VERSION'>) {}

  private async post(payload: Record<string, unknown>): Promise<SentMessage> {
    const url = `https://graph.facebook.com/${this.cfg.WHATSAPP_GRAPH_VERSION}/${this.cfg.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.cfg.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string; code?: number } };
    if (!res.ok || !body.messages?.[0]) {
      throw new Error(`WhatsApp send failed (${res.status}): ${body.error?.message ?? 'no message id'}`);
    }
    return { id: body.messages[0].id };
  }

  sendCode(to: string, code: string) {
    return this.post({
      to: waId(to),
      type: 'template',
      template: {
        name: this.cfg.WHATSAPP_OTP_TEMPLATE,
        language: { code: 'en' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: code }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
        ],
      },
    });
  }

  sendText(to: string, body: string) {
    return this.post({ to: waId(to), type: 'text', text: { body, preview_url: false } });
  }
}

/** Meta signs every webhook body with the app secret: X-Hub-Signature-256: sha256=<hex>. */
export function verifyWebhookSignature(appSecret: string, rawBody: Buffer, header: string | undefined): boolean {
  if (!header?.startsWith('sha256=')) return false;
  const given = Buffer.from(header.slice(7), 'hex');
  return safeEqual(hmacSha256(appSecret, rawBody), given);
}

/** The parts of a webhook payload we use. */
export interface InboundMessage { waMessageId: string; fromE164: string; text: string; type: string }
export interface StatusUpdate { waMessageId: string; status: string }

export function parseWebhook(payload: unknown): { messages: InboundMessage[]; statuses: StatusUpdate[] } {
  const messages: InboundMessage[] = [];
  const statuses: StatusUpdate[] = [];
  const entries = (payload as { entry?: { changes?: { value?: Record<string, unknown> }[] }[] })?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      for (const m of (value.messages as Record<string, any>[] | undefined) ?? []) {
        const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? '';
        messages.push({ waMessageId: String(m.id), fromE164: `+${m.from}`, text: String(text), type: String(m.type) });
      }
      for (const s of (value.statuses as Record<string, any>[] | undefined) ?? []) {
        statuses.push({ waMessageId: String(s.id), status: String(s.status) });
      }
    }
  }
  return { messages, statuses };
}
