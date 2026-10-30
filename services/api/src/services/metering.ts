/** One metering event per paid action; rolled up per RFQ with an alert above the configured threshold (₹150). */
import type { Tx } from '../db/pool.js';

export type MeterKind =
  | 'rfq_created' | 'document_extracted' | 'quote_drafted' | 'message_sent'
  | 'call_minute' | 'document_generated' | 'verification_check';

export async function meter(tx: Tx, e: { orgId: string | null; rfqId?: string | null; kind: MeterKind; units?: number; costInr: number; provider: string; ref?: string | null }) {
  await tx.query(
    `insert into metering_events (org_id, rfq_id, kind, units, cost_inr, provider, ref) values ($1, $2, $3, $4, $5, $6, $7)`,
    [e.orgId, e.rfqId ?? null, e.kind, e.units ?? 1, e.costInr.toFixed(4), e.provider, e.ref ?? null],
  );
}

/** Same shape as the frontend's MeterRow. Cost is summed in the database (numeric), not in JS floats. */
export async function rfqCosts(tx: Tx, alertInr: number) {
  const { rows } = await tx.query(
    `select r.number, o.name as buyer, c.cost_inr, c.documents, c.messages, coalesce(c.call_minutes, 0) as call_minutes,
            c.cost_inr > $1 as over
       from rfq_costs c join rfqs r on r.id = c.rfq_id join orgs o on o.id = c.org_id
      order by c.cost_inr desc`,
    [alertInr],
  );
  return rows.map((r) => ({
    rfqId: r.number as string,
    buyer: r.buyer as string,
    docs: Number(r.documents),
    tokensK: 0,
    messages: Number(r.messages),
    callMin: Number(r.call_minutes),
    cost: Number(r.cost_inr),
    status: r.over ? 'Escalated' : 'Passed',
  }));
}
