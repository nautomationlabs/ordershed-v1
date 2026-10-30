import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApi } from '@/api/client';
import { orders, quotes, vendors, verification } from '@/api/mock/data';
import type { Vendor } from '@/api/types';
import { TIER_LABEL } from '@/api/types';
import { DataTable } from '@/components/DataTable';
import { CheckRow } from '@/components/domain';
import { Banner, DocLink, KV, Kpis, PageHeader, Panel, RecordMeta, SourceTag, StatusChip, Tabs, TierBadge } from '@/components/primitives';
import { EmptyState } from '@/components/StateViews';
import { date, inrShort } from '@/lib/format';

export function VendorList() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { data, isLoading, error, refetch } = useApi('vendors');
  const q = params.get('q')?.toLowerCase() ?? '';
  const rows = data ? data.filter((v) => !q || `${v.name} ${v.city} ${v.state} ${v.categories.join(' ')}`.toLowerCase().includes(q)) : undefined;
  return (
    <div className="page">
      <PageHeader
        title="Vendor list"
        question="Who do we buy from, how verified are they, and how do they perform?"
        meta={q ? <>Showing vendors matching <span className="mono">"{q}"</span> · <Link to="/b/vendors">clear</Link></> : 'Verification tier and RFQ rank are separate. Admin can change a tier, never a rank.'}
        primary={<Link to="/b/vendors/find" className="btn btn-primary">Find vendors</Link>}
        secondary={<Link to="/b/onboarding">Onboarding (2)</Link>}
      />
      <DataTable<Vendor>
        id="vendors"
        rows={rows}
        loading={isLoading}
        error={error}
        onRetry={() => refetch()}
        rowKey={(v) => v.id}
        onOpen={(v) => nav(`/b/vendors/${v.id}`)}
        bulk={(sel, clear) => <><button className="link" onClick={clear}>Mark {sel.length} Approved</button><button className="link" onClick={clear}>Add to RFQ</button></>}
        empty={{ title: 'No vendors yet', body: 'Invite your existing suppliers by WhatsApp; they join free.' }}
        columns={[
          { key: 'id', header: 'Vendor', render: (v) => <span className="mono">{v.id}</span> },
          { key: 'name', header: 'Name', render: (v) => <span>{v.name}{v.buyerMark && <span className="chip plain tone-good" style={{ marginLeft: 6 }}>{v.buyerMark}</span>}</span>, text: (v) => v.name },
          { key: 'city', header: 'City' },
          { key: 'state', header: 'State', hidden: true },
          { key: 'gstin', header: 'GSTIN', render: (v) => <span className="mono small">{v.gstin}</span> },
          { key: 'categories', header: 'Categories', text: (v) => v.categories.join(', ') },
          { key: 'tier', header: 'Verification', render: (v) => <TierBadge tier={v.tier} />, sortValue: (v) => v.tier, text: (v) => TIER_LABEL[v.tier] },
          { key: 'otdPct', header: 'OTD', unit: '%', num: true, text: (v) => v.otdPct?.toFixed(1) ?? '—', sortValue: (v) => v.otdPct ?? -1 },
          { key: 'ppm', header: 'PPM', num: true, text: (v) => v.ppm ?? '—', sortValue: (v) => v.ppm ?? 99999 },
          { key: 'quotes12m', header: 'Quotes 12m', num: true },
          { key: 'awards12m', header: 'Awards 12m', num: true },
          { key: 'employees', header: 'People', hidden: true },
        ]}
      />
    </div>
  );
}

export function VendorView() {
  const { id = 'VEN-000041' } = useParams();
  const v = vendors.find((x) => x.id === id);
  const [tab, setTab] = useState<'overview' | 'performance' | 'docs' | 'orders'>('overview');
  if (!v) return <div className="page"><EmptyState title={`${id} not found`} action={<Link to="/b/vendors">All vendors</Link>} /></div>;
  const vOrders = orders.filter((o) => o.vendorId === v.id);
  const vQuotes = quotes.filter((q) => q.vendorId === v.id);
  return (
    <div className="page">
      <PageHeader
        crumbs={[{ label: 'Vendors' }, { label: 'Vendor list', to: '/b/vendors' }, { label: v.id }]}
        title={v.name}
        docNo={v.id}
        meta={<RecordMeta by={v.changedBy} at={v.changedAt} />}
        primary={<Link to="/b/requests/new" className="btn btn-primary">Invite to RFQ</Link>}
        secondary={<><button className="link">Mark Preferred</button><button className="link link-crit">Block (four-eyes)</button></>}
      />
      <div className="row gap-16 mb-16">
        <TierBadge tier={v.tier} />
        {v.buyerMark && <span className="chip tone-good">{v.buyerMark} by Kestrel Motion</span>}
        <span className="muted">{v.city}, {v.state}</span>
        <span className="mono muted small">GSTIN {v.gstin}</span>
        <span className="small muted">Contacts hidden until award</span>
      </div>
      <Kpis items={[
        { label: 'On-time delivery', value: v.otdPct?.toFixed(1) ?? '—', unit: v.otdPct ? '%' : undefined, delta: <SourceTag kind="computed" refText="GRN date vs PO need-by, 12 months" /> },
        { label: 'Quality', value: v.ppm ?? '—', unit: v.ppm ? 'PPM' : undefined, delta: <SourceTag kind="computed" refText="Rejected / received × 10⁶" /> },
        { label: 'Reply time', value: v.replyHours?.toFixed(1) ?? '—', unit: v.replyHours ? 'h' : undefined, delta: 'median, 12 months' },
        { label: 'Quotes / awards', value: `${v.quotes12m} / ${v.awards12m}`, delta: '12 months' },
      ]} />
      <div className="mt-16">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'performance', label: 'Performance' }, { id: 'docs', label: 'Certificates & proof', count: v.certs.length + 3 }, { id: 'orders', label: 'Orders & quotes', count: vOrders.length + vQuotes.length }]} />
      </div>
      {tab === 'overview' && (
        <div className="grid-2">
          <Panel title="Capabilities">
            <KV items={[['Categories', v.categories.join(', ')], ['Processes', v.processes.join(', ')], ['Certificates', v.certs.join(', ') || 'None uploaded'], ['People', v.employees], ['Distance to PNQ-01', <span key="d" className="mono">{v.distanceKm} km</span>]]} />
          </Panel>
          <Panel title="Verification">
            <div className="checks">
              <CheckRow state="pass" label="GSTIN active" detail={<span className="mono">{v.gstin}</span>} />
              <CheckRow state={v.tier >= 1 ? 'pass' : 'pending'} label="PAN matches GST legal name" />
              <CheckRow state={v.tier >= 1 ? 'pass' : 'pending'} label="Bank verified by ₹1 test deposit" />
              <CheckRow state={v.certs.length ? 'pass' : 'warn'} label="Certificates checked" detail={v.certs.join(', ') || 'None'} />
              <CheckRow state={v.tier >= 2 ? 'pass' : 'pending'} label="Site visit or video walk-through" />
              <CheckRow state={v.tier >= 3 ? 'pass' : 'pending'} label="Performance-verified (3 POs on time, PPM < 1,000)" />
            </div>
          </Panel>
        </div>
      )}
      {tab === 'performance' && (
        <Panel title="Last 12 months">
          <table className="dt"><thead><tr><th>Month</th><th className="num">POs</th><th className="num">On time</th><th className="num">PPM</th><th className="num">Reply h</th></tr></thead>
            <tbody>{['Oct-26', 'Sep-26', 'Aug-26', 'Jul-26', 'Jun-26'].map((m, i) => (
              <tr key={m}><td className="mono">{m}</td><td className="num">{[2, 1, 2, 1, 1][i]}</td><td className="num">{[100, 100, 50, 100, 100][i]}%</td><td className="num">{[640, 0, 1450, 300, 820][i]}</td><td className="num">{[6.1, 5.4, 7.9, 6.6, 6.0][i]}</td></tr>
            ))}</tbody>
          </table>
        </Panel>
      )}
      {tab === 'docs' && (
        <Panel tight>
          <table className="dt"><thead><tr><th>Document</th><th>Status</th><th>Valid to</th><th>Checked by</th></tr></thead>
            <tbody>
              <tr><td>GST registration</td><td><StatusChip status="Verified" /></td><td className="mono">—</td><td>System · GSTN</td></tr>
              <tr><td>Udyam (MSME)</td><td><StatusChip status="Verified" /></td><td className="mono">—</td><td>K. Iyer</td></tr>
              <tr><td>Cancelled cheque / ₹1 deposit</td><td><StatusChip status="Verified" /></td><td className="mono">—</td><td>System · bank</td></tr>
              {v.certs.map((c) => <tr key={c}><td>{c}</td><td><StatusChip status="Verified" /></td><td className="mono">03-2028</td><td>S. Rao</td></tr>)}
            </tbody>
          </table>
        </Panel>
      )}
      {tab === 'orders' && (
        <Panel tight>
          <table className="dt"><thead><tr><th>Document</th><th>Part</th><th className="num">Value</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {vOrders.map((o) => <tr key={o.id}><td><DocLink id={o.id} /></td><td>{o.title}</td><td className="num">{inrShort(o.value)}</td><td className="mono">{date(o.issuedAt)}</td><td><StatusChip status={o.status} /></td></tr>)}
              {vQuotes.map((q) => <tr key={q.id}><td className="mono">{q.id}</td><td>{q.rfqId}</td><td className="num">₹ {q.exwUnit.value} / pc</td><td className="mono">{date(q.submittedAt)}</td><td><StatusChip status={q.status} /></td></tr>)}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}

export function Onboarding() {
  const pending = verification.filter((v) => v.status === 'Pending');
  const [active, setActive] = useState(pending[0]?.id ?? '');
  const sel = verification.find((v) => v.id === active);
  return (
    <div className="page">
      <PageHeader
        title="Vendor onboarding"
        question="Which suppliers asked to work with us, and are they who they say they are?"
        meta="Approve / block needs four-eyes (Purchase head + Plant head). Our ops team verifies documents; you decide whether to buy."
        primary={<button className="btn btn-primary">Approve as vendor</button>}
        secondary={<button className="link">Invite a supplier</button>}
      />
      <div className="md">
        <Panel tight>
          <table className="dt">
            <thead><tr><th>Case</th><th>Supplier</th><th>City</th><th>Tier now</th><th>Requested</th><th>Status</th></tr></thead>
            <tbody>{verification.map((c) => (
              <tr key={c.id} className={`clickable${active === c.id ? ' cursor' : ''}`} onClick={() => setActive(c.id)}>
                <td className="mono">{c.id}</td><td>{c.vendor}</td><td>{c.city}</td><td><TierBadge tier={c.from} /></td><td className="small">{TIER_LABEL[c.to]}</td><td><StatusChip status={c.status} /></td>
              </tr>
            ))}</tbody>
          </table>
        </Panel>
        <div className="detail">
          {sel && (
            <Panel title={<div className="row"><span className="mono strong">{sel.id}</span><StatusChip status={sel.status} /></div>} foot={<RecordMeta by={sel.changedBy} at={sel.changedAt} />}>
              <h2 style={{ fontSize: 15 }}>{sel.vendor}</h2>
              <div className="small muted mb-12">{sel.city} · {TIER_LABEL[sel.from]} → {TIER_LABEL[sel.to]}</div>
              <div className="label mb-8">Evidence</div>
              <div className="checks">{sel.evidence.map((e) => <CheckRow key={e} state={/pending|No /i.test(e) ? 'warn' : 'pass'} label={e} />)}</div>
              <div className="mt-12"><Banner tone="info">First review: {sel.firstReviewer ?? 'not started'}. Second reviewer must be a different person.</Banner></div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
