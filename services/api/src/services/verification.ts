/**
 * Supplier verification queue. Tiers: 0 Self-declared → 1 Document-verified → 2 Site-visited → 3 Performance-verified.
 * One reviewer can approve up to Document-verified; above that, four-eyes: two different reviewers.
 * Admins change a tier, never a rank.
 */
import type { Tx } from '../db/pool.js';
import { conflict, notFound } from '../http/errors.js';
import type { Session } from './sessions.js';
import { audit } from './audit.js';

const STATUS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' } as const;

/** Same shape as the frontend's VerificationCase. */
export async function listCases(tx: Tx, status?: 'pending' | 'approved' | 'rejected') {
  const { rows } = await tx.query(
    `select v.number, o.number as org_number, o.name, d.state, v.from_tier, v.to_tier, v.evidence, v.submitted_at,
            v.status, v.updated_at, r1.name as first_reviewer, coalesce(r2.name, r1.name, 'System') as changed_by
       from verification_cases v
       join orgs o on o.id = v.org_id
       left join supplier_details d on d.org_id = v.org_id
       left join users r1 on r1.id = v.first_reviewer
       left join users r2 on r2.id = v.second_reviewer
      where ($1::text is null or v.status = $1)
      order by v.submitted_at`,
    [status ?? null],
  );
  return rows.map((r) => ({
    id: r.number as string,
    vendorId: r.org_number as string,
    vendor: r.name as string,
    city: (r.state as string | null) ?? '—',
    from: r.from_tier as number,
    to: r.to_tier as number,
    evidence: r.evidence as string[],
    submittedAt: (r.submitted_at as Date).toISOString(),
    firstReviewer: (r.first_reviewer as string | null) ?? undefined,
    status: STATUS[r.status as keyof typeof STATUS],
    changedBy: r.changed_by as string,
    changedAt: (r.updated_at as Date).toISOString(),
  }));
}

export async function reviewCase(tx: Tx, me: Session, number: string, decision: 'approve' | 'reject', note?: string) {
  const { rows } = await tx.query(
    `select v.id, v.org_id, v.to_tier, v.status, v.first_reviewer, o.name
       from verification_cases v join orgs o on o.id = v.org_id where v.number = $1 for update of v`,
    [number],
  );
  const c = rows[0];
  if (!c) throw notFound('No such verification case.');
  if (c.status !== 'pending') throw conflict('already_decided', 'This case has already been decided.');
  const who = { orgId: c.org_id as string, actorLabel: me.userName, actorRole: me.role, doc: number };

  if (decision === 'reject') {
    await tx.query(
      `update verification_cases set status = 'rejected', decided_at = now(), updated_at = now(), decision_note = $2,
              first_reviewer = coalesce(first_reviewer, $3), second_reviewer = case when first_reviewer is null or first_reviewer = $3 then null else $3 end
        where id = $1`,
      [c.id, note ?? null, me.userId],
    );
    await audit(tx, { ...who, action: 'verification.rejected', summary: `${number} rejected for ${c.name}${note ? `: ${note}` : ''}` });
    return { status: 'Rejected' as const };
  }

  const needsTwo = c.to_tier >= 2;
  if (needsTwo && !c.first_reviewer) {
    await tx.query(`update verification_cases set first_reviewer = $2, first_reviewed_at = now(), updated_at = now() where id = $1`, [c.id, me.userId]);
    await audit(tx, { ...who, action: 'verification.first_review', summary: `${number} first approval for ${c.name}; a second reviewer must approve` });
    return { status: 'Pending' as const, needsSecondReviewer: true };
  }
  if (needsTwo && c.first_reviewer === me.userId) {
    throw conflict('four_eyes', 'You gave the first approval. A different reviewer must give the second.');
  }

  await tx.query(
    needsTwo
      ? `update verification_cases set second_reviewer = $2, status = 'approved', decided_at = now(), updated_at = now(), decision_note = $3 where id = $1`
      : `update verification_cases set first_reviewer = $2, first_reviewed_at = now(), status = 'approved', decided_at = now(), updated_at = now(), decision_note = $3 where id = $1`,
    [c.id, me.userId, note ?? null],
  );
  await tx.query(`update orgs set tier = $2, updated_at = now() where id = $1`, [c.org_id, c.to_tier]);
  await audit(tx, { ...who, action: 'verification.approved', summary: `${number} approved: ${c.name} is now tier ${c.to_tier}` });
  return { status: 'Approved' as const };
}
