import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, useApiArg } from '@/api/client';
import { vendorById } from '@/api/mock/data';
import type { Quote } from '@/api/types';
import { DataTable } from '@/components/DataTable';
import { HashLine } from '@/components/domain';
import { Drawer } from '@/components/overlays';
import { Banner, Num, PageHeader, Panel, SourceTag, TechLabel, TierBadge } from '@/components/primitives';
import { bandPosition, landedUnit, normalisedUnit, savingsPct, type LandedResult } from '@/lib/costing';
import { int, money } from '@/lib/format';

/** Landed-cost assumptions for STR-01 Stuttgart (sandbox; live rates come from the freight/duty services). */
const LANE = {
  fxRate: { value: 92.4, source: 'computed' as const, ref: 'RBI reference rate 18-10-2026' },
  freightUnit: { value: 1.1, source: 'freight' as const, ref: 'FQ-000031 · Nhava Sheva → Hamburg LCL + road to Stuttgart' },
  insurancePct: { value: 0.3, source: 'computed' as const, ref: 'Open cover policy rate' },
  dutyPct: { value: 2.7, source: 'hts' as const, ref: 'HS 8483.90 · TARIC 2026-10' },
  brokerageUnit: { value: 0.35, source: 'freight' as const, ref: 'FQ-000031 · customs clearance' },
};

interface Row { q: Quote; norm: number; landed: LandedResult; band: 'below' | 'within' | 'above' }

export function Compare() {
  const { id = 'RFQ-000123' } = useParams();
  const { data: rfq } = useApiArg('rfq', id, api.rfq);
  const { data: qs, isLoading, error, refetch } = useApiArg('quotes', id, api.quotes);
  const [drawer, setDrawer] = useState<Row | null>(null);
  const [pick, setPick] = useState<string>('Q-000418');

  const rows: Row[] = useMemo(() => {
    if (!qs || !rfq) return [];
    return qs.map((q) => {
      const n = normalisedUnit({ exwUnit: q.exwUnit, tooling: q.tooling, annualQty: rfq.annualQty }).value;
      return {
        q,
        norm: n,
        landed: landedUnit({ exwUnit: q.exwUnit, tooling: q.tooling, annualQty: rfq.annualQty, buyerCurrency: 'EUR', ...LANE }),
        band: bandPosition(n, rfq.shouldCost.low, rfq.shouldCost.high),
      };
    });
  }, [qs, rfq]);

  const best = rows.length ? Math.min(...rows.map((r) => r.norm)) : 0;

  return (
    <div className="page">
      <PageHeader
        crumbs={[{ label: 'Sourcing' }, { label: 'RFx', to: '/b/rfqs' }, { label: id, to: `/b/rfqs/${id}` }, { label: 'Compare' }]}
        title="Compare quotes"
        docNo={id}
        status="Under review"
        question="Which quote is best on a like-for-like, landed basis, and what are we not seeing?"
        meta={rfq && <>{rfq.title} · <span className="mono">{rfq.partNo} rev {rfq.rev}</span> · {int(rfq.annualQty)} pcs/yr · deliver to STR-01 Stuttgart · all prices computed in code from sealed quotes</>}
        primary={<Link to={`/b/award/${id}`} className="btn btn-primary">Prepare award</Link>}
        secondary={<><button className="link">Export comparison</button><button className="link">Start negotiation round</button></>}
      />

      <div className="grid-4 mb-16" style={{ gap: 12 }}>
        <Panel><TechLabel tech="min(normalised unit price)">Best normalised</TechLabel><div className="row mt-4"><span className="mono" style={{ fontSize: 20 }}>{money(best)}</span><SourceTag kind="computed" refText="EXW + tooling / annual qty" /></div></Panel>
        <Panel><TechLabel tech="Should-cost band">Should-cost</TechLabel><div className="row mt-4"><span className="mono" style={{ fontSize: 20 }}>₹ {int(rfq?.shouldCost.low ?? 0)}–{int(rfq?.shouldCost.high ?? 0)}</span><SourceTag kind="computed" refText={rfq?.shouldCost.ref} /></div></Panel>
        <Panel><TechLabel tech="Savings of recommended vs last price">Savings vs last price</TechLabel><div className="row mt-4"><span className="mono good" style={{ fontSize: 20 }}>{savingsPct(1890, rfq?.lastPrice ?? 1890).toFixed(1)}%</span><SourceTag kind="computed" refText="(2,050 − 1,890) / 2,050" /></div></Panel>
        <Panel><TechLabel tech="Quotes received / invited">Coverage</TechLabel><div className="mono" style={{ fontSize: 20, marginTop: 4 }}>4 of 6 · 1 declined</div></Panel>
      </div>

      <div className="mb-12">
        <Banner tone="warn" icon="flag">
          <strong>Annapoorna Engineering</strong> is self-declared and sits below the should-cost band. Its quote excludes MTC per heat and machining of M8 threads — check scope before treating it as cheapest.
        </Banner>
      </div>

      <DataTable<Row>
        id="compare"
        rows={rows}
        loading={isLoading}
        error={error}
        onRetry={() => refetch()}
        rowKey={(r) => r.q.id}
        activeKey={pick}
        onOpen={(r) => setPick(r.q.id)}
        initialSort={{ key: 'norm', dir: 'asc' }}
        expand={(r) => (
          <div className="grid-3" style={{ gap: 16 }}>
            <div>
              <div className="label mb-8">Deviations</div>
              {r.q.deviations.length ? r.q.deviations.map((d) => <div key={d} className="small">· {d}</div>) : <div className="small muted">None</div>}
              <div className="label mb-8 mt-12">Exclusions</div>
              {r.q.exclusions.length ? r.q.exclusions.map((d) => <div key={d} className="small crit">· {d}</div>) : <div className="small muted">None</div>}
            </div>
            <div>
              <div className="label mb-8">Commercial</div>
              <div className="small">Payment: {r.q.paymentTerms}</div>
              <div className="small">Validity: {r.q.validityDays} days · MOQ {int(r.q.moq)} pcs</div>
              <div className="small">Channel: {r.q.channel}</div>
            </div>
            <div>
              <div className="label mb-8">Sealed submission</div>
              <HashLine hash={r.q.hash} label={r.q.id} />
            </div>
          </div>
        )}
        columns={[
          { key: 'pick', header: '', width: 30, render: (r) => <input type="radio" name="pick" checked={pick === r.q.id} onChange={() => setPick(r.q.id)} aria-label={`Select ${r.q.id}`} /> },
          { key: 'vendor', header: 'Supplier', render: (r) => { const v = vendorById(r.q.vendorId); return <span>{v.name}{v.tier === 0 && <span className="chip plain tone-warn" style={{ marginLeft: 6 }}>Flagged</span>}</span>; }, text: (r) => vendorById(r.q.vendorId).name },
          { key: 'tier', header: 'Tier', tech: 'Verification tier · separate from rank', render: (r) => <TierBadge tier={vendorById(r.q.vendorId).tier} compact />, sortValue: (r) => vendorById(r.q.vendorId).tier },
          { key: 'exw', header: 'EXW unit', unit: '₹', num: true, tech: 'Ex-works unit price, as quoted', render: (r) => <Num value={r.q.exwUnit} />, sortValue: (r) => r.q.exwUnit.value },
          { key: 'tooling', header: 'Tooling', unit: '₹', num: true, tech: 'One-time tooling, as quoted', render: (r) => <Num value={r.q.tooling} digits={0} />, sortValue: (r) => r.q.tooling.value },
          { key: 'norm', header: 'Normalised', unit: '₹/pc', num: true, tech: 'Normalised price · EXW + tooling / annual qty', render: (r) => <span className="sourced"><span className={`mono${r.norm === best ? ' strong' : ''}`}>{money(r.norm)}</span><SourceTag kind="computed" refText={`${r.q.exwUnit.value} + ${r.q.tooling.value} / ${rfq?.annualQty}`} /></span>, sortValue: (r) => r.norm },
          { key: 'band', header: 'vs should-cost', render: (r) => <BandCell price={r.norm} low={rfq?.shouldCost.low ?? 0} high={rfq?.shouldCost.high ?? 1} pos={r.band} />, sortValue: (r) => r.norm },
          { key: 'landed', header: 'Landed STR-01', unit: '€/pc', num: true, tech: 'EXW + tooling alloc + freight + insurance + duty + brokerage', render: (r) => <span className="sourced"><button className="link mono" onClick={(e) => { e.stopPropagation(); setDrawer(r); }}>{money(r.landed.total.value, 'EUR')}</button><SourceTag kind="computed" refText="Open drawer for every line" /></span>, sortValue: (r) => r.landed.total.value },
          { key: 'lead', header: 'Lead', unit: 'days', num: true, text: (r) => r.q.leadDays, sortValue: (r) => r.q.leadDays },
          { key: 'moq', header: 'MOQ', unit: 'pcs', num: true, hidden: true, text: (r) => int(r.q.moq), sortValue: (r) => r.q.moq },
          { key: 'dev', header: 'Dev. / excl.', num: true, hidden: true, text: (r) => `${r.q.deviations.length} / ${r.q.exclusions.length}`, sortValue: (r) => r.q.deviations.length + r.q.exclusions.length },
        ]}
      />

      <Drawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        title={drawer ? `Landed cost · ${vendorById(drawer.q.vendorId).name}` : ''}
        sub={drawer ? `${drawer.q.id} · per piece · delivered STR-01 Stuttgart · EUR` : ''}
        foot={<><span className="small muted">Every line is computed in code. Change an input to see the effect; the quote itself never changes.</span></>}
      >
        {drawer && (
          <>
            <table className="dt">
              <thead><tr><th>Line</th><th className="num">€ / pc</th><th>Source</th></tr></thead>
              <tbody>
                {drawer.landed.lines.map((l) => (
                  <tr key={l.key}>
                    <td>{l.label}</td>
                    <td className="num">{l.value.value.toFixed(2)}</td>
                    <td className="small" style={{ whiteSpace: 'normal' }}><SourceTag kind={l.value.source} refText={l.value.ref} /> <span className="muted">{l.value.ref}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td>Landed cost per piece</td><td className="num">{money(drawer.landed.total.value, 'EUR')}</td><td><SourceTag kind="computed" refText={drawer.landed.total.ref} /></td></tr>
              </tfoot>
            </table>
            <div className="grid-2 mt-16" style={{ gap: 10 }}>
              <label className="field"><span className="label">FX INR per EUR</span><input className="input mono" defaultValue={LANE.fxRate.value} /></label>
              <label className="field"><span className="label">Duty rate %</span><input className="input mono" defaultValue={LANE.dutyPct.value} /></label>
              <label className="field"><span className="label">Freight € / pc</span><input className="input mono" defaultValue={LANE.freightUnit.value} /></label>
              <label className="field"><span className="label">Annual quantity</span><input className="input mono" defaultValue="4,800" /></label>
            </div>
            <div className="mt-16"><Banner tone="info">Annual landed spend at 4,800 pcs: <span className="mono strong">{money(drawer.landed.total.value * 4800, 'EUR')}</span> <SourceTag kind="computed" /></Banner></div>
          </>
        )}
      </Drawer>
    </div>
  );
}

function BandCell({ price, low, high, pos }: { price: number; low: number; high: number; pos: 'below' | 'within' | 'above' }) {
  const min = low * 0.85;
  const max = high * 1.1;
  const p = (v: number) => `${Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))}%`;
  return (
    <span className="row gap-4">
      <span className="band" style={{ width: 64, display: 'inline-block' }}>
        <span className="track" />
        <span className="range" style={{ left: p(low), width: `calc(${p(high)} - ${p(low)})` }} />
        <span className={`tick${pos !== 'within' ? ' out' : ''}`} style={{ left: p(price) }} />
      </span>
      <span className={`small ${pos === 'within' ? 'muted' : 'crit'}`}>{pos === 'within' ? 'within' : pos}</span>
    </span>
  );
}
