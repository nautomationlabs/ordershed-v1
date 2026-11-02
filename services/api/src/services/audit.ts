/** Audit log access. Writes go through the database function audit_append() (migrations/0002_audit.sql). */
import type { Tx } from '../db/pool.js';

export interface AuditInput {
  orgId: string | null;
  actorLabel: string;
  actorRole: string;
  action: string;
  doc?: string | null;
  summary: string;
  data?: Record<string, unknown>;
}

export async function audit(tx: Tx, e: AuditInput): Promise<{ seq: string; hash: string }> {
  const { rows } = await tx.query<{ seq: string; hash: string }>(
    `select seq, encode(hash, 'hex') as hash from audit_append($1, $2, $3, $4, $5, $6)`,
    [e.orgId, e.actorLabel, e.actorRole, e.action, e.doc ?? null, JSON.stringify({ summary: e.summary, ...e.data })],
  );
  return rows[0]!;
}

const LABELS: Record<string, string> = {
  'supplier.join.started': 'Join started',
  'supplier.joined': 'Supplier joined',
  'verification.opened': 'Verification case opened',
  'verification.first_review': 'Verification first review',
  'verification.approved': 'Verification approved',
  'verification.rejected': 'Verification rejected',
  'auth.signed_in': 'Signed in',
  'whatsapp.opted_out': 'WhatsApp opt-out',
  'rfq.draft_created': 'RFQ draft created',
  'document.extracted': 'Drawing read by AI',
  'document.extraction_failed': 'Drawing could not be read',
  'extraction.field_confirmed': 'Field confirmed',
  'extraction.field_corrected': 'Field corrected',
};

const ROLES: Record<string, string> = {
  buyer: 'Buyer', purchase_head: 'Purchase head', plant_head: 'Plant head', finance: 'Finance', viewer: 'Viewer',
  owner: 'Supplier owner', quoting: 'Quoting', dispatch: 'Dispatch',
  ops: 'Ops', verifier: 'Verifier', platform_finance: 'Platform finance', super_admin: 'Super-admin',
};

/** Same shape as the frontend's AuditEvent (apps/web/src/api/types.ts). */
export interface AuditEventView {
  seq: number; at: string; actor: string; role: string; action: string; doc: string; detail: string; hash: string; prev: string;
}

export async function listAudit(tx: Tx, limit = 200): Promise<AuditEventView[]> {
  const { rows } = await tx.query(
    `select seq, occurred_at, actor_label, actor_role, action, doc, detail->>'summary' as summary,
            encode(hash, 'hex') as hash, encode(prev_hash, 'hex') as prev
       from audit_events order by seq desc limit $1`,
    [limit],
  );
  return rows.map((r) => ({
    seq: Number(r.seq),
    at: (r.occurred_at as Date).toISOString(),
    actor: r.actor_label,
    role: ROLES[r.actor_role] ?? r.actor_role,
    action: LABELS[r.action] ?? r.action,
    doc: r.doc ?? '—',
    detail: r.summary ?? '',
    hash: r.hash,
    prev: r.prev,
  }));
}

export async function verifyAudit(tx: Tx) {
  const { rows } = await tx.query(`select ok, checked, first_bad_seq, head_hash from audit_verify()`);
  const r = rows[0]!;
  return { ok: r.ok as boolean, checked: Number(r.checked), firstBadSeq: r.first_bad_seq === null ? null : Number(r.first_bad_seq), head: r.head_hash as string | null };
}
