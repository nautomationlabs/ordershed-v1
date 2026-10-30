import { describe, expect, it } from 'vitest';
import { fictionalGstin } from '../src/integrations/gst.js';
import { gstinCheckChar, isValidGstin, normaliseGstin, panOf } from '../src/lib/gstin.js';
import { maskPhone, normalisePhone } from '../src/lib/phone.js';
import { parseWebhook, verifyWebhookSignature } from '../src/integrations/whatsapp.js';
import { hmacSha256 } from '../src/lib/crypto.js';
import { replyFor } from '../src/routes/whatsapp.js';

describe('GSTIN', () => {
  it('accepts a correctly formed GSTIN and its checksum', () => {
    expect(isValidGstin('27AAPFU0939F1ZV')).toBe(true);
    expect(gstinCheckChar('27AAPFU0939F1Z')).toBe('V');
  });
  it('rejects a single-character typo via the checksum', () => {
    expect(isValidGstin('27AAPFU0939F1ZW')).toBe(false);
    expect(isValidGstin('27AAPFU0938F1ZV')).toBe(false);
  });
  it('rejects malformed input', () => {
    expect(isValidGstin('27AAPFU0939F1Z')).toBe(false);
    expect(isValidGstin('27AAPFU0939F1XV')).toBe(false);
  });
  it('normalises spacing and case, extracts the PAN', () => {
    expect(normaliseGstin(' 27aapfu0939f1zv ')).toBe('27AAPFU0939F1ZV');
    expect(panOf('27AAPFU0939F1ZV')).toBe('AAPFU0939F');
  });
  it('fictional test GSTINs are checksum-valid', () => {
    expect(isValidGstin(fictionalGstin('33AAMFS4821K1Z'))).toBe(true);
  });
});

describe('phone numbers', () => {
  it('normalises Indian mobiles to E.164', () => {
    expect(normalisePhone('98430 21877')).toBe('+919843021877');
    expect(normalisePhone('+91 98430-21877')).toBe('+919843021877');
    expect(normalisePhone('919843021877')).toBe('+919843021877');
    expect(normalisePhone('09843021877')).toBe('+919843021877');
    expect(normalisePhone('+4915112345678')).toBe('+4915112345678');
  });
  it('rejects landline-looking and short numbers', () => {
    expect(normalisePhone('12345')).toBeNull();
    expect(normalisePhone('5843021877')).toBeNull();
  });
  it('masks for display', () => {
    expect(maskPhone('+919843021877')).toBe('+91 98430 •••77');
  });
});

describe('WhatsApp webhook', () => {
  const body = Buffer.from(JSON.stringify({
    entry: [{ changes: [{ value: {
      messages: [{ id: 'wamid.1', from: '919843021877', type: 'text', text: { body: 'join' } }],
      statuses: [{ id: 'wamid.0', status: 'delivered' }],
    } }] }],
  }));
  it('accepts only the correct signature', () => {
    const sig = `sha256=${hmacSha256('secret', body).toString('hex')}`;
    expect(verifyWebhookSignature('secret', body, sig)).toBe(true);
    expect(verifyWebhookSignature('other', body, sig)).toBe(false);
    expect(verifyWebhookSignature('secret', Buffer.concat([body, Buffer.from(' ')]), sig)).toBe(false);
    expect(verifyWebhookSignature('secret', body, undefined)).toBe(false);
  });
  it('extracts messages and statuses', () => {
    const p = parseWebhook(JSON.parse(body.toString()));
    expect(p.messages).toEqual([{ waMessageId: 'wamid.1', fromE164: '+919843021877', text: 'join', type: 'text' }]);
    expect(p.statuses).toEqual([{ waMessageId: 'wamid.0', status: 'delivered' }]);
  });
  it('answers the four keywords and ignores other text', () => {
    const ctx = { joinUrl: 'https://ordershed.com/s/join', status: null };
    expect(replyFor('JOIN', ctx)).toContain('https://ordershed.com/s/join');
    expect(replyFor('HELP', ctx)).toContain('STOP');
    expect(replyFor('STOP', ctx)).toContain('START');
    expect(replyFor('STATUS', ctx)).toContain('JOIN');
    expect(replyFor('HELLO', ctx)).toBeNull();
  });
});
