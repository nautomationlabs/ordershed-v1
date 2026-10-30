/**
 * Supplier Join: GSTIN → GST record → WhatsApp code → supplier org (tier 0, Self-declared) + owner + a
 * verification case for Document-verified, all in one transaction, all in the audit log.
 */
import { randomUUID } from 'node:crypto';
import type { Config } from '../config.js';
import type { Db } from '../db/pool.js';
import { withTx } from '../db/pool.js';
import type { GstLookup, GstRecord } from '../integrations/gst.js';
import type { WhatsApp } from '../integrations/whatsapp.js';
import { isValidGstin, normaliseGstin } from '../lib/gstin.js';
import { maskPhone, normalisePhone } from '../lib/phone.js';
import { badRequest, conflict, HttpError } from '../http/errors.js';
import { audit } from './audit.js';
import { meter } from './metering.js';
import { CODE_MESSAGES, CODE_TTL_MIN, checkChallenge, createChallenge } from './otp.js';
import { createSession } from './sessions.js';

export interface JoinDeps { db: Db; config: Config; gst: GstLookup; whatsapp: WhatsApp }

function parseGstin(raw: string): string {
  const gstin = normaliseGstin(raw);
  if (!isValidGstin(gstin)) throw badRequest('gstin_invalid', 'That GSTIN is not valid. Check the 15 characters on your GST certificate.');
  return gstin;
}

/** Step 1: fetch the GST record so the supplier can confirm "This is my business". */
export async function lookupGstin(deps: JoinDeps, raw: string): Promise<{ record: GstRecord; alreadyRegistered: boolean }> {
  const gstin = parseGstin(raw);
  const existing = await withTx(deps.db, { kind: 'system' }, (tx) => tx.query(`select 1 from orgs where gstin = $1`, [gstin]));
  const record = await deps.gst.lookup(gstin);
  await withTx(deps.db, { kind: 'system' }, (tx) =>
    meter(tx, { orgId: null, kind: 'verification_check', costInr: deps.config.GST_LOOKUP_COST_INR, provider: record.provider, ref: gstin }),
  );
  if (!record.found) throw badRequest('gstin_not_found', 'No GST registration was found for that GSTIN.');
  return { record, alreadyRegistered: existing.rowCount! > 0 };
}

/** Step 2: the supplier confirms the business and gives a WhatsApp number; we send a code there. */
export async function startJoin(deps: JoinDeps, input: { gstin: string; phone: string }) {
  const phone = normalisePhone(input.phone);
  if (!phone) throw badRequest('phone_invalid', 'Enter a mobile number, for example 98430 21877.');
  const { record, alreadyRegistered } = await lookupGstin(deps, input.gstin);
  if (alreadyRegistered) throw conflict('already_registered', 'This GSTIN is already on Ordershed. Sign in with the WhatsApp number used to join.');
  if (record.status !== 'Active') throw badRequest('gst_not_active', `GST status is ${record.status ?? 'unknown'}. Only active registrations can join.`);

  const created = await withTx(deps.db, { kind: 'system' }, async (tx) => {
    const optedOut = await tx.query(`select 1 from whatsapp_optouts where phone = $1`, [phone]);
    if (optedOut.rowCount) throw badRequest('phone_opted_out', 'This number sent STOP. Send START to us on WhatsApp first.');
    const inUse = await tx.query(`select 1 from users where phone = $1`, [phone]);
    if (inUse.rowCount) throw conflict('phone_in_use', 'This WhatsApp number is already linked to a supplier. Sign in instead.');

    const challenge = await createChallenge(tx, deps.config.OTP_PEPPER, { purpose: 'join', channel: 'whatsapp', destination: phone });
    const { rows } = await tx.query<{ id: string }>(
      `insert into join_applications (gstin, phone, gst_snapshot, challenge_id) values ($1, $2, $3, $4) returning id`,
      [record.gstin, phone, JSON.stringify(record), challenge.id],
    );
    await audit(tx, {
      orgId: null, actorLabel: 'System', actorRole: 'Join', action: 'supplier.join.started', doc: record.gstin,
      summary: `${record.legalName} started Join; code sent to ${maskPhone(phone)} on WhatsApp`,
      data: { applicationId: rows[0]!.id, gstProvider: record.provider },
    });
    return { applicationId: rows[0]!.id, code: challenge.code };
  });

  const sent = await deps.whatsapp.sendCode(phone, created.code).catch((err: Error) => {
    throw new HttpError(502, 'whatsapp_failed', `We could not send the code on WhatsApp. Try again shortly. (${err.message})`);
  });
  await withTx(deps.db, { kind: 'system' }, async (tx) => {
    await tx.query(`insert into whatsapp_messages (direction, wa_message_id, phone, kind, body, status) values ('out', $1, $2, 'template', 'join code', 'sent')`, [sent.id, phone]);
    await meter(tx, { orgId: null, kind: 'message_sent', costInr: deps.config.WHATSAPP_CODE_COST_INR, provider: 'whatsapp', ref: sent.id });
  });

  return { applicationId: created.applicationId, sentTo: maskPhone(phone), expiresInSec: CODE_TTL_MIN * 60 };
}

const BUSINESS_TYPES = ['Foundry', 'Forging', 'Machining', 'Fabrication', 'Valves & pumps', 'Rubber & polymer', 'T&D hardware', 'Tool room', 'Trader'];  // same list as the Join screen

/** Step 3: correct code → the supplier org exists, owner signed in, verification case in the admin queue. */
export async function completeJoin(
  deps: JoinDeps,
  input: { applicationId: string; code: string; businessTypes?: string[]; language?: string; ip?: string; userAgent?: string },
) {
  const orgId = randomUUID();
  const result = await withTx(deps.db, { kind: 'system', orgId }, async (tx) => {
    const { rows } = await tx.query(
      `select id, gstin, phone, gst_snapshot, challenge_id, status from join_applications where id = $1 for update`,
      [input.applicationId],
    );
    const app = rows[0];
    if (!app || app.status !== 'pending_code') return { failed: 'invalid' as const };
    const check = await checkChallenge(tx, deps.config.OTP_PEPPER, app.challenge_id, input.code.trim(), 'join');
    if (!check.ok) return { failed: check.reason };

    const gst = app.gst_snapshot as GstRecord;
    const name = gst.tradeName || gst.legalName || app.gstin;
    const orgNumber = (await tx.query<{ n: string }>(`select next_doc_number('VEN') as n`)).rows[0]!.n;
    await tx.query(
      `insert into orgs (id, number, kind, name, legal_name, gstin, tier) values ($1, $2, 'supplier', $3, $4, $5, 0)`,
      [orgId, orgNumber, name, gst.legalName, app.gstin],
    );
    await tx.query(
      `insert into supplier_details (org_id, gstin, legal_name, trade_name, constitution, gst_status, registered_on, address, state,
                                     business_types, language, gst_checked_at, gst_provider)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), $12)`,
      [orgId, app.gstin, gst.legalName, gst.tradeName, gst.constitution, gst.status, gst.registeredOn, gst.address, gst.state,
       (input.businessTypes ?? []).filter((t) => BUSINESS_TYPES.includes(t)), input.language ?? 'en', gst.provider],
    );
    const user = await tx.query<{ id: string }>(`insert into users (name, phone) values ('Owner', $1) returning id`, [app.phone]);
    const userId = user.rows[0]!.id;
    await tx.query(`select set_config('app.user_id', $1, true)`, [userId]);
    await tx.query(`insert into memberships (user_id, org_id, role) values ($1, $2, 'owner')`, [userId, orgId]);

    const evidence = [
      `GSTIN ${gst.status} (${gst.provider})`,
      gst.registeredOn ? `Registered ${gst.registeredOn.split('-').reverse().join('-')}` : 'Registration date not returned',
      `Legal name: ${gst.legalName}`,
      'WhatsApp number verified by code',
    ];
    const ver = (await tx.query<{ n: string }>(`select next_doc_number('VER') as n`)).rows[0]!.n;
    await tx.query(
      `insert into verification_cases (number, org_id, from_tier, to_tier, evidence) values ($1, $2, 0, 1, $3)`,
      [ver, orgId, JSON.stringify(evidence)],
    );
    await tx.query(`update join_applications set status = 'joined', org_id = $2, updated_at = now() where id = $1`, [app.id, orgId]);

    await audit(tx, {
      orgId, actorLabel: 'Owner', actorRole: 'Supplier owner', action: 'supplier.joined', doc: orgNumber,
      summary: `${name} joined with GSTIN ${app.gstin}; WhatsApp number verified`,
      data: { gstin: app.gstin, applicationId: app.id },
    });
    await audit(tx, {
      orgId, actorLabel: 'System', actorRole: 'Verification', action: 'verification.opened', doc: ver,
      summary: `${ver} opened for ${name}: Self-declared → Document-verified`,
    });

    const token = await createSession(tx, { userId, orgId, role: 'owner', ip: input.ip, userAgent: input.userAgent }, deps.config.SESSION_TTL_HOURS);
    return { failed: null, token, org: { number: orgNumber, name, tier: 0 }, verification: { number: ver, status: 'Pending' } };
  }).catch((err: { code?: string; constraint?: string }) => {
    if (err.code === '23505') throw conflict('already_registered', 'This GSTIN or WhatsApp number joined a moment ago. Sign in instead.');
    throw err;
  });

  if (result.failed) throw badRequest(`code_${result.failed}`, CODE_MESSAGES[result.failed]);
  return result;
}
