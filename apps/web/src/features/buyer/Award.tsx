import { Link, useParams } from 'react-router-dom';
import { doaRules, quotes, rfqById, vendorById } from '@/api/mock/data';
import { CheckRow, DocFlow, DoaStrip, HashLine } from '@/components/domain';
import { Banner, KV, PageHeader, Panel, RecordMeta, SourceTag, TierBadge } from '@/components/primitives';
import { doaLevelFor, normalisedUnit, round2, savingsPct } from '@/lib/costing';
import { inrShort, int, money } from '@/lib/format';

export function Award() {
  const { id = 'RFQ-000123' } = useParams();
  const rfq = rfqById(id) ?? rfqById('RFQ-000123')!;
  const q = quotes.find((x) => x.id === 'Q-000418')!;
  const v = vendorById(q.vendorId);
  const honing = 38; // bearing-seat honing line agreed through QRY-000088
  const norm = normalisedUnit({ exwUnit: q.exwUnit, tooling: q.tooling, annualQty: rfq.annualQty }).value;
  const adjusted = round2(norm + honing);
  const value = rfq.annualQty * (q.exwUnit.value + honing) + q.tooling.value;
  const level = doaLevelFor(value, doaRules.filter((r) => r.level.startsWith('L')));

  return (
    <div className="page">
      <PageHeader
        crumbs={[{ label: 'Sourcing' }, { label: rfq.id, to: `/b/rfqs/${rfq.id}` }, { label: 'Compare', to: `/b/compare/${rfq.id}` }, { label: 'Award' }]}
        title="Award & decision pack"
        docNo={`${rfq.id} → ${v.name}`}
        status="Under review"
        question="Should we award this part to this supplier, on these terms?"
        meta={<RecordMeta by="L. Fischer" at="2026-10-21T08:55:00+05:30" />}
        primary={<button className="btn btn-primary">Approve award</button>}
        secondary={<><button className="link">Send back</button><button className="link">Download pack (PDF)</button></>}
      />

      <div className="mb-16">
        <DoaStrip
          level={`${level.level} · up to ₹ 2 Cr`}
          steps={[
            { role: 'Buyer', who: 'L. Fischer', state: 'done', at: '21-10 08:55' },
            { role: 'Purchase head', who: 'R. Deshpande (you)', state: 'active' },
          ]}
        />
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', alignItems: 'start' }}>
        <div className="col gap-16">
          <Panel title="Recommendation">
            <div className="row" style={{ alignItems: 'baseline' }}>
              <h2 style={{ fontSize: 17 }}>{v.name}</h2>
              <span className="muted">{v.city}</span>
              <TierBadge tier={v.tier} />
            </div>
            <p className="mt-8">
              Lowest normalised price among verified suppliers after adding bearing-seat honing (agreed through QRY-000088). Within the should-cost band. Annapoorna was cheaper but is self-declared and excluded MTC and M8 threads.
            </p>
            <div className="grid-3 mt-12" style={{ gap: 12 }}>
              <div><div className="label">Normalised + honing</div><div className="row mt-4"><span className="mono" style={{ fontSize: 18 }}>{money(adjusted)}</span><SourceTag kind="computed" refText={`${norm} + honing ${honing}`} /></div></div>
              <div><div className="label">Award value</div><div className="row mt-4"><span className="mono" style={{ fontSize: 18 }}>{inrShort(value)}</span><SourceTag kind="computed" refText="4,800 × (1,840 + 38) + 2,40,000 tooling" /></div></div>
              <div><div className="label">Savings vs last price</div><div className="row mt-4"><span className="mono good" style={{ fontSize: 18 }}>{savingsPct(adjusted, rfq.lastPrice ?? adjusted).toFixed(1)}%</span><SourceTag kind="computed" refText={`(2,050 − ${adjusted}) / 2,050`} /></div></div>
            </div>
          </Panel>

          <Panel title="Decision pack" tight>
            <table className="dt">
              <tbody>
                {[
                  ['Technical fit', 'All critical features accepted; Ra 1.6 on bearing seat via honing line', 'pass'],
                  ['Normalised price', `${money(adjusted)} per pc · rank 1 of 3 verified`, 'pass'],
                  ['Should-cost', `Within band ₹ ${int(rfq.shouldCost.low)}–${int(rfq.shouldCost.high)}`, 'pass'],
                  ['Exclusions', 'Packing for sea freight — add to PO as line 20 (₹ 22 / pc quoted separately)', 'warn'],
                  ['Tooling ownership', 'Pattern and fixtures owned by Kestrel Motion after full payment; marked and insured at supplier', 'pass'],
                  ['Samples & FAI', '5 samples + CMM report by 18-11-2026; FAI at supplier 25-11-2026', 'pass'],
                  ['Payment terms', q.paymentTerms, 'pass'],
                  ['MOQ / lead time', `${q.moq} pcs · ${q.leadDays} days from FAI approval`, 'pass'],
                  ['Incoterm', rfq.incoterm, 'pass'],
                  ['GCP / SCP', 'GCP v3 and SCP v2 accepted at quote time', 'pass'],
                  ['Deviations', q.deviations[0] ?? 'None', 'warn'],
                ].map(([k, d, s]) => (
                  <tr key={k}>
                    <td style={{ width: 160 }} className="muted">{k}</td>
                    <td style={{ whiteSpace: 'normal', padding: '7px 10px' }}>{d}</td>
                    <td style={{ width: 80 }} className={`small strong ${s === 'pass' ? 'good' : 'warn'}`}>{s === 'pass' ? 'OK' : 'Check'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>

        <div className="col gap-16">
          <Panel title="Sealed quote">
            <KV narrow items={[['Quote', <span key="q" className="mono">{q.id}</span>], ['EXW unit', <span key="e" className="sourced" style={{ justifyContent: 'flex-start' }}><span className="mono">{money(q.exwUnit.value)}</span><SourceTag kind="supplier" refText={q.exwUnit.ref} /></span>], ['Tooling', <span key="t" className="sourced" style={{ justifyContent: 'flex-start' }}><span className="mono">{money(q.tooling.value, 'INR', 0)}</span><SourceTag kind="supplier" refText={q.tooling.ref} /></span>], ['Validity', `${q.validityDays} days`], ['Channel', q.channel]]} />
            <div className="mt-12"><HashLine hash={q.hash} label="Sealed" at="18-10-2026 19:42" /></div>
          </Panel>
          <Panel title="On approval, the system will">
            <div className="checks">
              <CheckRow state="pending" label="Draft PO-000459 from the quote and decision pack" detail="Lines 10 (part), 20 (sea packing), 30 (tooling)" />
              <CheckRow state="pending" label="Send award on WhatsApp: Acknowledge PO · Raise an issue" detail="Buyer name and contact released to supplier at award" />
              <CheckRow state="pending" label="Create commitments: samples, FAI, PO acknowledgement" />
              <CheckRow state="pending" label="Open Material Data File v1 for KM-GH-2210" />
              <CheckRow state="pending" label="Notify the 3 other suppliers, without prices" />
            </div>
          </Panel>
          <Panel title="Document flow">
            <DocFlow nodes={[
              { id: 'PR-77310', label: 'Requisition', state: 'done' },
              { id: rfq.id, label: 'RFQ', sub: '6 invited · 4 quoted', state: 'done' },
              { id: q.id, label: 'Quote', sub: v.name, state: 'done' },
              { id: 'Award', label: 'Decision pack', sub: 'Waiting for L2 approver 2 of 2', state: 'current' },
              { id: 'PO-000459', label: 'Purchase order', state: 'next' },
            ]} />
          </Panel>
          <Banner tone="info">Approving needs your passkey. This action and the pack are written to the audit log.</Banner>
          <Link to={`/b/compare/${rfq.id}`} className="small">Back to comparison</Link>
        </div>
      </div>
    </div>
  );
}
