import { useState } from 'react';
import { useApi } from '@/api/client';
import { audit, rfqs, vendors } from '@/api/mock/data';
import type { BuyerOrg, Dispute, EvalRow, MeterRow, StuckItem, TemplateRow, VerificationCase, Vendor } from '@/api/types';
import { TIER_LABEL } from '@/api/types';
import { DataTable } from '@/components/DataTable';
import { CheckRow } from '@/components/domain';
import { Banner, DocLink, KV, Kpis, PageHeader, Panel, RecordMeta, Seg, SourceTag, Sparkline, StatusChip, TierBadge } from '@/components/primitives';
import { date, dateTime, int, shortHash } from '@/lib/format';

export function OpsHome() {
  const { data, isLoading, error, refetch } = useApi('stuck');
  return (
    <div className="page">
      <PageHeader
        title="Ops home"
        question="What is stuck right now, and who is on it?"
        meta="Software does the chasing; ops picks up what two reminders could not move."
        primary={<button className="btn btn-primary">Assign to me</button>}
        secondary={<button className="link">Phase A manual mode</button>}
      />
      <Kpis items={[
        { label: 'Quotes per RFQ', value: '3.4', delta: <span className="row gap-4">median, 30 d <SourceTag kind="computed" /></span>, target: 'target ≥ 3' },
        { label: 'Supplier reply', value: '14.2', unit: 'h', delta: 'median, 30 d', target: 'target ≤ 48 h' },
        { label: 'Cost per RFQ', value: '₹ 108', delta: <span className="warn">1 RFQ above ₹ 150</span>, target: 'alert above ₹ 150' },
        { label: 'Human time per RFQ', value: '0.7', unit: 'h', delta: 'target 0.5 h', target: 'Phase A: < 2 h' },
        { label: 'Live RFQs', value: '12', delta: '3 buyer orgs' },
      ]} />
      <div className="section">
        <div className="section-title"><h2>Stuck</h2><span className="small muted">Oldest first within severity</span></div>
        <DataTable<StuckItem>
          id="ops-stuck"
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={() => refetch()}
          rowKey={(s) => s.id}
          bulk={(sel, clear) => <button className="link" onClick={clear}>Assign {sel.length} to me</button>}
          empty={{ title: 'Nothing is stuck', body: 'Every RFQ, PO and commitment is moving on its own.' }}
          columns={[
            { key: 'severity', header: 'Severity', render: (s) => <span className={`chip tone-${s.severity === 'crit' ? 'crit' : 'warn'}`}>{s.severity === 'crit' ? 'Blocked' : 'Slow'}</span>, text: (s) => s.severity },
            { key: 'doc', header: 'Document', render: (s) => <span className="mono">{s.doc}</span> },
            { key: 'what', header: 'What is stuck' },
            { key: 'party', header: 'Party' },
            { key: 'age', header: 'Age', num: true, render: (s) => <span className="mono">{s.age}</span> },
            { key: 'owner', header: 'Owner', render: (s) => <span className={s.owner === 'Unassigned' ? 'crit strong' : ''}>{s.owner}</span>, text: (s) => s.owner },
          ]}
        />
      </div>
    </div>
  );
}

export function Verification() {
  const { data, isLoading, error, refetch } = useApi('verification');
  const [active, setActive] = useState('VER-000214');
  const c = data?.find((x) => x.id === active);
  return (
    <div className="page">
      <PageHeader
        title="Verification queue"
        question="Is this supplier who they say they are, and which tier have they earned?"
        meta="Four-eyes above Document-verified: the second reviewer must be a different person. Admin can change a tier, never a rank."
        primary={<button className="btn btn-primary" disabled={!c || c.status !== 'Pending'}>{c?.firstReviewer ? 'Confirm as second reviewer' : 'Approve as first reviewer'}</button>}
        secondary={<button className="link link-crit">Reject with reason</button>}
      />
      <div className="md">
        <DataTable<VerificationCase>
          id="verification"
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={() => refetch()}
          rowKey={(x) => x.id}
          activeKey={active}
          onOpen={(x) => setActive(x.id)}
          empty={{ title: 'Queue is empty', body: 'New suppliers land here after JOIN.' }}
          columns={[
            { key: 'id', header: 'Case', render: (x) => <span className="mono">{x.id}</span> },
            { key: 'vendor', header: 'Supplier' },
            { key: 'city', header: 'City', hidden: true },
            { key: 'from', header: 'From', render: (x) => <TierBadge tier={x.from} compact />, sortValue: (x) => x.from },
            { key: 'to', header: 'To', text: (x) => TIER_LABEL[x.to] },
            { key: 'firstReviewer', header: '1st reviewer', hidden: true, text: (x) => x.firstReviewer ?? '—' },
            { key: 'submittedAt', header: 'Submitted', hidden: true, render: (x) => <span className="mono">{date(x.submittedAt)}</span>, sortValue: (x) => x.submittedAt },
            { key: 'status', header: 'Status', render: (x) => <StatusChip status={x.status} />, text: (x) => x.status },
          ]}
        />
        <div className="detail">
          {c && (
            <Panel title={<div className="row"><span className="mono strong">{c.id}</span><StatusChip status={c.status} /></div>} foot={<RecordMeta by={c.changedBy} at={c.changedAt} />}>
              <h2 style={{ fontSize: 15 }}>{c.vendor}</h2>
              <div className="small muted mb-12">{c.city} · {TIER_LABEL[c.from]} → <strong>{TIER_LABEL[c.to]}</strong></div>
              <div className="label mb-8">Evidence</div>
              <div className="checks">{c.evidence.map((e) => <CheckRow key={e} state={/pending|No /i.test(e) ? 'warn' : 'pass'} label={e} right={<button className="link small">View</button>} />)}</div>
              <div className="label mt-16 mb-8">Reviews</div>
              <div className="doa" style={{ gridAutoColumns: '1fr' }}>
                <div className={`doa-step ${c.firstReviewer ? 'done' : 'active'}`}><span className="label">First reviewer</span><span className="who">{c.firstReviewer ?? 'You'}</span><span className="small muted">{c.firstReviewer ? 'Approved' : 'Waiting'}</span></div>
                <div className={`doa-step ${c.status === 'Approved' ? 'done' : c.firstReviewer ? 'active' : ''}`}><span className="label">Second reviewer</span><span className="who">{c.status === 'Approved' ? 'S. Rao' : c.firstReviewer ? 'You (D. Menon)' : '—'}</span><span className="small muted">{c.status === 'Approved' ? 'Approved' : 'Waiting'}</span></div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

export function RfqOps() {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  return (
    <div className="page">
      <PageHeader
        title="RFQ operations"
        question="Is every live RFQ getting enough quotes in time?"
        meta="Manual Phase A mode lets ops send RFQs and enter WhatsApp quotes by hand, with the same audit trail."
        primary={<button className="btn btn-primary">Source more suppliers</button>}
        secondary={<Seg options={[{ id: 'auto', label: 'Automated' }, { id: 'manual', label: 'Phase A manual' }]} value={mode} onChange={setMode} />}
      />
      {mode === 'manual' && <div className="mb-12"><Banner tone="warn" icon="alert">Manual mode: messages you send go out from the platform number and are logged as "Ops on behalf of buyer".</Banner></div>}
      <DataTable
        id="rfq-ops"
        rows={rfqs}
        rowKey={(r) => r.id}
        bulk={(sel, clear) => <><button className="link" onClick={clear}>Nudge suppliers ({sel.length})</button><button className="link" onClick={clear}>Extend 24 h</button></>}
        columns={[
          { key: 'id', header: 'RFQ', render: (r) => <span className="mono">{r.id}</span> },
          { key: 'buyer', header: 'Buyer org', text: () => 'Kestrel Motion GmbH' },
          { key: 'title', header: 'Part' },
          { key: 'category', header: 'Category' },
          { key: 'invited', header: 'Invited', num: true },
          { key: 'quotesIn', header: 'Quotes', num: true, render: (r) => <span className={`mono${r.status === 'Sent' && r.quotesIn < 2 ? ' warn strong' : ''}`}>{r.quotesIn}</span>, sortValue: (r) => r.quotesIn },
          { key: 'openQueries', header: 'Queries', num: true },
          { key: 'quoteDue', header: 'Due', render: (r) => <span className="mono">{date(r.quoteDue)}</span>, sortValue: (r) => r.quoteDue },
          { key: 'status', header: 'Status', render: (r) => <StatusChip status={r.status} />, text: (r) => r.status },
        ]}
      />
    </div>
  );
}

export function SupplierDirectory() {
  return (
    <div className="page">
      <PageHeader
        title="Supplier directory"
        question="Who is in our network, how verified, and where?"
        meta="Every price is visible to admin; none is editable. Outreach data (Apollo, trade data) is ours alone and never shown to suppliers or buyers."
        primary={<button className="btn btn-primary">Add supplier</button>}
        secondary={<button className="link">Export</button>}
      />
      <Kpis items={[
        { label: 'Suppliers', value: String(vendors.length), delta: 'Hosur, Pune, Coimbatore, Bengaluru, Nashik' },
        { label: 'Document-verified or above', value: String(vendors.filter((v) => v.tier >= 1).length) },
        { label: 'Site-visited or above', value: String(vendors.filter((v) => v.tier >= 2).length) },
        { label: 'Active on WhatsApp, 30 d', value: '8' },
      ]} />
      <div className="mt-16">
        <DataTable<Vendor>
          id="admin-suppliers"
          rows={vendors}
          rowKey={(v) => v.id}
          columns={[
            { key: 'id', header: 'ID', render: (v) => <span className="mono">{v.id}</span> },
            { key: 'name', header: 'Supplier' },
            { key: 'city', header: 'City' },
            { key: 'gstin', header: 'GSTIN', render: (v) => <span className="mono small">{v.gstin}</span> },
            { key: 'tier', header: 'Tier', render: (v) => <TierBadge tier={v.tier} />, sortValue: (v) => v.tier },
            { key: 'categories', header: 'Categories', text: (v) => v.categories.join(', ') },
            { key: 'quotes12m', header: 'Quotes 12m', num: true },
            { key: 'replyHours', header: 'Reply h', num: true, text: (v) => v.replyHours?.toFixed(1) ?? '—' },
            { key: 'changed', header: 'Last changed', render: (v) => <span className="small muted">{v.changedBy} · <span className="mono">{date(v.changedAt)}</span></span> },
          ]}
        />
      </div>
    </div>
  );
}

export function BuyerOrgs() {
  const { data, isLoading, error, refetch } = useApi('buyerOrgs');
  return (
    <div className="page">
      <PageHeader
        title="Buyer organisations"
        question="Who buys through us, on which plan, and are they verified?"
        meta="Plans and tiers are settings, not code. Shadow invoices from day one; trial ends at first PO or 60 days."
        primary={<button className="btn btn-primary">Invite buyer org</button>}
      />
      <DataTable<BuyerOrg>
        id="buyer-orgs"
        rows={data}
        loading={isLoading}
        error={error}
        onRetry={() => refetch()}
        rowKey={(o) => o.id}
        columns={[
          { key: 'id', header: 'Org', render: (o) => <span className="mono">{o.id}</span> },
          { key: 'name', header: 'Name' },
          { key: 'country', header: 'Country' },
          { key: 'plan', header: 'Plan' },
          { key: 'kyb', header: 'KYB', render: (o) => <StatusChip status={o.kyb} />, text: (o) => o.kyb },
          { key: 'users', header: 'Users', num: true },
          { key: 'rfqs', header: 'RFQs', num: true },
          { key: 'pos', header: 'POs', num: true },
          { key: 'costPerRfq', header: 'Cost / RFQ', unit: '₹', num: true, render: (o) => <span className={`mono${o.costPerRfq > 150 ? ' crit strong' : ''}`}>{o.costPerRfq}</span>, sortValue: (o) => o.costPerRfq },
          { key: 'trialEnds', header: 'Trial ends', render: (o) => <span className="mono">{o.trialEnds ? date(o.trialEnds) : '—'}</span> },
          { key: 'status', header: 'Status', render: (o) => <StatusChip status={o.status} />, text: (o) => o.status },
        ]}
      />
    </div>
  );
}

export function Messaging() {
  const { data, isLoading, error, refetch } = useApi('templates');
  return (
    <div className="page">
      <PageHeader
        title="Messaging & templates"
        question="Are our WhatsApp templates approved and actually reaching suppliers?"
        meta="Meta approval and DLT registration per template and language. Call provider: Exotel (sandbox)."
        primary={<button className="btn btn-primary">New template</button>}
        secondary={<button className="link">Call provider settings</button>}
      />
      <div className="mb-12"><Banner tone="crit" icon="alert"><strong>quote_reminder_ta</strong> was rejected by Meta (category mismatch). Tamil suppliers are falling back to English reminders.</Banner></div>
      <DataTable<TemplateRow>
        id="templates"
        rows={data}
        loading={isLoading}
        error={error}
        onRetry={() => refetch()}
        rowKey={(t) => t.name}
        columns={[
          { key: 'name', header: 'Template', render: (t) => <span className="mono">{t.name}</span> },
          { key: 'category', header: 'Category' },
          { key: 'language', header: 'Languages' },
          { key: 'meta', header: 'Meta', render: (t) => <StatusChip status={t.meta} />, text: (t) => t.meta },
          { key: 'dlt', header: 'DLT', render: (t) => <StatusChip status={t.dlt} />, text: (t) => t.dlt },
          { key: 'sent30d', header: 'Sent 30 d', num: true, text: (t) => int(t.sent30d) },
          { key: 'delivered', header: 'Delivered', unit: '%', num: true, text: (t) => t.delivered.toFixed(1) },
          { key: 'read', header: 'Read', unit: '%', num: true, text: (t) => t.read.toFixed(1) },
          { key: 'replied', header: 'Replied', unit: '%', num: true, text: (t) => t.replied.toFixed(1) },
        ]}
      />
    </div>
  );
}

export function CostModels() {
  const meters = useApi('meters');
  const evals = useApi('evals');
  return (
    <div className="page">
      <PageHeader
        title="Cost & models"
        question="What does each RFQ cost us in models and messages, and are the models good enough to ship?"
        meta="Every metered event carries its model cost. A model change that drops eval accuracy does not ship."
        primary={<button className="btn btn-primary">Run eval suite</button>}
        secondary={<button className="link">Routing config</button>}
      />
      <Kpis items={[
        { label: 'Cost per RFQ, 30 d', value: '₹ 108', delta: <span className="row gap-4"><Sparkline data={[182, 171, 160, 151, 140, 133, 128, 121, 118, 112, 109, 108]} width={90} height={20} color="var(--good)" target={150} /></span>, target: 'alert above ₹ 150' },
        { label: 'Drawing extraction', value: '₹ 14.20', delta: 'per drawing', target: 'target < ₹ 20' },
        { label: 'Field accuracy', value: '94.4', unit: '%', delta: <span className="warn">50 drawings · target 95%</span> },
        { label: 'Fallback rate', value: '18', unit: '%', delta: 'fields re-read by Opus-class' },
      ]} />
      <div className="section">
        <div className="section-title"><h2>Metering by RFQ</h2></div>
        <DataTable<MeterRow>
          id="meters"
          rows={meters.data}
          loading={meters.isLoading}
          error={meters.error}
          onRetry={() => meters.refetch()}
          rowKey={(m) => m.rfqId}
          columns={[
            { key: 'rfqId', header: 'RFQ', render: (m) => <span className="mono">{m.rfqId}</span> },
            { key: 'buyer', header: 'Buyer org' },
            { key: 'docs', header: 'Docs read', num: true },
            { key: 'tokensK', header: 'Tokens', unit: 'k', num: true },
            { key: 'messages', header: 'Messages', num: true },
            { key: 'callMin', header: 'Call min', num: true },
            { key: 'cost', header: 'Cost', unit: '₹', num: true, render: (m) => <span className="sourced"><span className={`mono${m.cost > 150 ? ' crit strong' : ''}`}>{m.cost.toFixed(2)}</span><SourceTag kind="computed" refText="Σ metered events × unit cost" /></span>, sortValue: (m) => m.cost },
            { key: 'status', header: 'Status', render: (m) => <StatusChip status={m.status} />, text: (m) => m.status },
          ]}
        />
      </div>
      <div className="section">
        <div className="section-title"><h2>Eval suites</h2><span className="small muted">Every real case becomes a permanent test</span></div>
        <DataTable<EvalRow>
          id="evals"
          rows={evals.data}
          loading={evals.isLoading}
          error={evals.error}
          onRetry={() => evals.refetch()}
          rowKey={(e) => e.suite}
          columns={[
            { key: 'suite', header: 'Suite' },
            { key: 'cases', header: 'Cases', num: true },
            { key: 'accuracy', header: 'Field accuracy', unit: '%', num: true, render: (e) => <span className={`mono${e.accuracy < 95 ? ' warn strong' : ''}`}>{e.accuracy.toFixed(1)}</span>, sortValue: (e) => e.accuracy },
            { key: 'calibration', header: 'Calibration ECE', num: true, text: (e) => e.calibration.toFixed(3), tech: 'Expected calibration error; lower is better' },
            { key: 'costPerDoc', header: 'Cost / doc', unit: '₹', num: true, text: (e) => e.costPerDoc.toFixed(2) },
            { key: 'p50ms', header: 'p50', unit: 's', num: true, text: (e) => (e.p50ms / 1000).toFixed(1) },
            { key: 'model', header: 'Routing' },
            { key: 'gate', header: 'Ship gate', render: (e) => <StatusChip status={e.gate} />, text: (e) => e.gate },
          ]}
        />
      </div>
    </div>
  );
}

export function Disputes() {
  const { data, isLoading, error, refetch } = useApi('disputes');
  const [active, setActive] = useState('DSP-000014');
  const d = data?.find((x) => x.id === active);
  return (
    <div className="page">
      <PageHeader
        title="Disputes & audit"
        question="Which disagreements are open, and is every admin action on the record?"
        meta="Every admin action is hash-chained. Founder role alone approves migrations, secrets and spend."
        primary={<button className="btn btn-primary">Open dispute</button>}
        secondary={<button className="link">Export audit bundle</button>}
      />
      <div className="md">
        <DataTable<Dispute>
          id="disputes"
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={() => refetch()}
          rowKey={(x) => x.id}
          activeKey={active}
          onOpen={(x) => setActive(x.id)}
          columns={[
            { key: 'id', header: 'Dispute', render: (x) => <span className="mono">{x.id}</span> },
            { key: 'doc', header: 'Document', render: (x) => <span className="mono">{x.doc}</span> },
            { key: 'type', header: 'Type' },
            { key: 'amount', header: 'Amount', unit: '₹', num: true, text: (x) => (x.amount ? int(x.amount) : '—') },
            { key: 'owner', header: 'Owner' },
            { key: 'status', header: 'Status', render: (x) => <StatusChip status={x.status} />, text: (x) => x.status },
          ]}
        />
        <div className="detail col gap-12">
          {d && (
            <Panel title={<div className="row"><span className="mono strong">{d.id}</span><StatusChip status={d.status} /></div>} foot={<RecordMeta by={d.changedBy} at={d.changedAt} />}>
              <KV narrow items={[['Parties', d.parties], ['Document', <DocLink key="d" id={d.doc} />], ['Type', d.type], ['Opened', <span key="o" className="mono">{dateTime(d.opened)}</span>], ['Owner', d.owner]]} />
            </Panel>
          )}
          <Panel title="Recent admin events" tight>
            <table className="dt"><tbody>
              {audit.filter((e) => e.role.startsWith('Admin')).concat(audit.slice(0, 2)).slice(0, 5).map((e) => (
                <tr key={e.seq}><td className="mono small">{e.seq}</td><td className="small">{e.action}</td><td className="mono small muted">{shortHash(e.hash, 6)}</td></tr>
              ))}
            </tbody></table>
          </Panel>
        </div>
      </div>
    </div>
  );
}
