import { useState } from 'react';
import { useApi } from '@/api/client';
import type { AuditEvent, DoaRule } from '@/api/types';
import { DataTable } from '@/components/DataTable';
import { Icon } from '@/components/Icon';
import { Banner, DocLink, PageHeader, Panel, RecordMeta, Tabs } from '@/components/primitives';
import { dateTime, shortHash } from '@/lib/format';

export function Audit() {
  const { data, isLoading, error, refetch } = useApi('audit');
  return (
    <div className="page">
      <PageHeader
        title="Audit log"
        question="Who did what, when, and can we prove nothing was changed after?"
        meta="Every approval, send, admin action and document is hash-chained and written to S3 Object Lock (compliance mode, 72 months)."
        primary={<button className="btn btn-primary">Export audit bundle</button>}
        secondary={<button className="link">Verify chain</button>}
      />
      <div className="mb-12">
        <Banner tone="good" icon="shield">Chain verified · events 48202 → 48213 · last anchor <span className="mono">sha256:{shortHash(data?.[0]?.hash ?? '0000000000000000', 12)}</span> written to S3 Object Lock at <span className="mono">21-10-2026 08:45</span> IST.</Banner>
      </div>
      <DataTable<AuditEvent>
        id="audit"
        rows={data}
        loading={isLoading}
        error={error}
        onRetry={() => refetch()}
        rowKey={(e) => String(e.seq)}
        empty={{ title: 'No events in this range', body: 'Widen the date range. Events are never deleted.' }}
        columns={[
          { key: 'seq', header: 'Seq', num: true, render: (e) => <span className="mono">{e.seq}</span> },
          { key: 'at', header: 'Time (IST)', render: (e) => <span className="mono">{dateTime(e.at)}</span>, sortValue: (e) => e.at },
          { key: 'actor', header: 'Actor' },
          { key: 'role', header: 'Role' },
          { key: 'action', header: 'Action', render: (e) => <span className="strong">{e.action}</span>, text: (e) => e.action },
          { key: 'doc', header: 'Document', render: (e) => <DocLink id={e.doc} />, text: (e) => e.doc },
          { key: 'detail', header: 'Detail', render: (e) => <span className="ellipsis" style={{ display: 'inline-block', maxWidth: 300 }}>{e.detail}</span>, text: (e) => e.detail },
          { key: 'hash', header: 'Hash', render: (e) => <span className="mono small muted" title={`prev ${e.prev}\nhash ${e.hash}`}>{shortHash(e.hash, 8)}</span>, text: (e) => e.hash },
        ]}
      />
    </div>
  );
}

type SettingsTab = 'doa' | 'plants' | 'roles' | 'templates' | 'sla' | 'kpi' | 'integrations';

export function Settings() {
  const { data } = useApi('doa');
  const [tab, setTab] = useState<SettingsTab>('doa');
  return (
    <div className="page">
      <PageHeader
        title="Settings & DoA"
        question="Who can approve what, and how is this organisation configured?"
        meta="Configuration over code. Every change creates a new version and an audit event; changes to approval paths need four-eyes."
        primary={<button className="btn btn-primary">Propose change</button>}
        secondary={<button className="link">Version history</button>}
      />
      <Tabs<SettingsTab> value={tab} onChange={setTab} tabs={[{ id: 'doa', label: 'Delegation of authority' }, { id: 'plants', label: 'Plants', count: 2 }, { id: 'roles', label: 'Users & roles', count: 9 }, { id: 'templates', label: 'Templates' }, { id: 'sla', label: 'SLAs & reminders' }, { id: 'kpi', label: 'KPI weights' }, { id: 'integrations', label: 'Integrations' }]} />
      {tab === 'doa' && (
        <DataTable<DoaRule>
          id="doa"
          noToolbar
          rows={data}
          rowKey={(r) => r.level}
          columns={[
            { key: 'level', header: 'Level / action', render: (r) => <span className="strong">{r.level}</span> },
            { key: 'maxInr', header: 'Up to', unit: '₹', num: true, text: (r) => (r.maxInr === null ? 'No limit' : r.maxInr >= 1e7 ? `${r.maxInr / 1e7} Cr` : `${r.maxInr / 1e5} L`) },
            { key: 'approvers', header: 'Approvers in order', text: (r) => r.approvers.join(' → ') },
            { key: 'fourEyes', header: 'Four-eyes', render: (r) => (r.fourEyes ? <span className="strong">Required</span> : <span className="muted">—</span>) },
            { key: 'version', header: 'Version', num: true, render: (r) => <span className="mono">v{r.version}</span> },
            { key: 'changed', header: 'Last changed', render: (r) => <RecordMeta by={r.changedBy} at={r.changedAt} /> },
          ]}
        />
      )}
      {tab === 'plants' && (
        <Panel tight>
          <table className="dt"><thead><tr><th>Code</th><th>Name</th><th>Country</th><th>GSTIN / VAT</th><th>Currency</th><th>Default Incoterm</th></tr></thead>
            <tbody>
              <tr><td className="mono">PNQ-01</td><td>Chakan, Pune</td><td>IN</td><td className="mono">27AAKCK9921R1ZP</td><td className="mono">INR</td><td>EXW supplier works</td></tr>
              <tr><td className="mono">STR-01</td><td>Stuttgart</td><td>DE</td><td className="mono">DE 318 774 902</td><td className="mono">EUR</td><td>FCA Nhava Sheva</td></tr>
            </tbody>
          </table>
        </Panel>
      )}
      {tab === 'roles' && (
        <Panel tight>
          <table className="dt"><thead><tr><th>User</th><th>Role</th><th>Plants</th><th>Sign-in</th><th>Last active</th></tr></thead>
            <tbody>
              {[['Rohan Deshpande', 'Purchase head', 'PNQ-01, STR-01', 'SSO · M365', '21-10-2026 09:02'], ['Lena Fischer', 'Buyer', 'STR-01', 'SSO · M365', '21-10-2026 08:55'], ['Arjun Mehta', 'Buyer', 'PNQ-01', 'Email + OTP', '21-10-2026 08:15'], ['Priya Nair', 'Finance', 'PNQ-01', 'Email + OTP', '20-10-2026 18:40'], ['Markus Brandt', 'Plant head', 'STR-01', 'SSO · M365', '18-10-2026 11:00'], ['Stefan Koch', 'CFO', 'All', 'SSO · M365', '10-10-2026 16:20'], ['M. Kulkarni', 'Viewer · Stores', 'PNQ-01', 'Email + OTP', '16-10-2026 15:30']].map((r) => (
                <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td className="mono small">{r[2]}</td><td className="muted">{r[3]}</td><td className="mono small">{r[4]}</td></tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
      {tab === 'templates' && <Panel><div className="small muted">PO, GCP v3, SCP v2, debit note and RFQ email templates. Your template or ours; documents are generated from PO data.</div></Panel>}
      {tab === 'sla' && (
        <Panel tight>
          <table className="dt"><thead><tr><th>Event</th><th className="num">First reminder</th><th className="num">Second</th><th>Then</th></tr></thead>
            <tbody>
              {[['Quote not received', '24 h', '48 h', 'Ops task'], ['PO not acknowledged', '8 h', '24 h', 'Ops task'], ['Commitment due', 'On due date', '+24 h', 'Ops task'], ['Query unanswered (buyer)', '4 h before', 'At deadline', 'Escalate to purchase head']].map((r) => (
                <tr key={r[0]}><td>{r[0]}</td><td className="num">{r[1]}</td><td className="num">{r[2]}</td><td>{r[3]}</td></tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
      {tab === 'kpi' && <Panel><div className="small muted">Supplier score weights: OTD 40 · PPM 30 · reply time 15 · document accuracy 15. Weights change ranking for your org only.</div></Panel>}
      {tab === 'integrations' && (
        <Panel tight>
          <table className="dt"><thead><tr><th>Integration</th><th>Status</th><th>Detail</th></tr></thead>
            <tbody>
              <tr><td>Microsoft 365 send-as</td><td className="good strong small">Connected</td><td className="muted">purchasing@kestrel-motion.example</td></tr>
              <tr><td>RFQ inbox</td><td className="good strong small">Active</td><td className="mono small">rfq@in.ordershed.example</td></tr>
              <tr><td>SAP S/4 (PO export)</td><td className="muted small">Not connected</td><td className="muted">CSV export available</td></tr>
              <tr><td>Tally / Zoho</td><td className="muted small">Phase 3</td><td className="muted">—</td></tr>
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}

export function MaskedCall() {
  return (
    <div className="page">
      <PageHeader
        crumbs={[{ label: 'Queries & chat' }, { label: 'QRY-000088' }, { label: 'Call' }]}
        title="Masked call"
        docNo="CALL-000052 · RFQ-000123"
        status="Live"
        question="Talk to the supplier without either side seeing the other's number."
        meta="Both sides dial a platform number. The call is recorded with notice and stored on the RFQ. Contacts release only at award."
        primary={<button className="btn btn-primary btn-danger" style={{ background: 'var(--critical)', borderColor: 'var(--critical)', color: '#fff' }}>End call</button>}
      />
      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', alignItems: 'start' }}>
        <Panel title="Call">
          <div className="row gap-24" style={{ padding: '12px 0' }}>
            <div className="col" style={{ alignItems: 'center', gap: 6 }}>
              <span className="avatar" style={{ width: 52, height: 52, fontSize: 16 }}>LF</span>
              <span className="strong">Lena Fischer</span>
              <span className="small muted">Kestrel Motion · buyer</span>
            </div>
            <div className="col" style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <span className="mono" style={{ fontSize: 28 }}>04:17</span>
              <span className="small muted row gap-4"><Icon name="lock" size={12} /> via +91 80 4718 2290 · recording</span>
            </div>
            <div className="col" style={{ alignItems: 'center', gap: 6 }}>
              <span className="avatar light" style={{ width: 52, height: 52, fontSize: 16 }}>SB</span>
              <span className="strong">Supplier B</span>
              <span className="small muted">Hosur · masked</span>
            </div>
          </div>
          <hr className="divider" />
          <div className="row gap-16">
            <button className="btn btn-sm"><Icon name="mic" size={13} /> Mute</button>
            <button className="link">Add ops to call</button>
            <span className="spacer" />
            <span className="small muted">Provider: Exotel (sandbox)</span>
          </div>
        </Panel>
        <Panel title="Live notes · proposed by AI">
          <div className="ai">
            <div className="ai-head"><span className="label">Proposed summary</span><span className="conf mid">0.81</span></div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li>Supplier can hone the bearing seat only; adds ₹ 38 / pc as a separate line.</li>
              <li>Pattern lead time 3 weeks; samples 18-11-2026.</li>
              <li>Asked about sea-worthy packing; will quote separately.</li>
            </ul>
            <div className="ai-actions"><button className="btn btn-sm">Save to RFQ</button><button className="link">Edit</button></div>
          </div>
          <div className="small muted mt-12">Consent notice played to both parties at 00:00. Recording stored in S3 (ap-south-1), linked to RFQ-000123.</div>
        </Panel>
      </div>
    </div>
  );
}
