import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '@/api/client';
import { kpiSeries, ME, vendorById } from '@/api/mock/data';
import type { Rfq } from '@/api/types';
import { DataTable } from '@/components/DataTable';
import { CommitmentCard } from '@/components/domain';
import { Icon } from '@/components/Icon';
import { DocLink, Kpis, PageHeader, Panel, SourceTag, Sparkline, StatusChip } from '@/components/primitives';
import { date, dateTime, due, inrShort } from '@/lib/format';

export function Home() {
  const nav = useNavigate();
  const rfqs = useApi('rfqs');
  const commitments = useApi('commitments');
  const invoices = useApi('invoices');
  const orders = useApi('orders');

  const inFlight = (rfqs.data ?? []).filter((r) => ['Sent', 'Quoted', 'Under review', 'Draft'].includes(r.status));
  const dueSoon = (commitments.data ?? []).filter((c) => c.lane !== 'Done').sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);
  const held = (invoices.data ?? []).filter((i) => i.status === 'Held');
  const openPoValue = (orders.data ?? []).filter((o) => !['Matched', 'Received'].includes(o.status)).reduce((a, o) => a + o.value, 0);

  const decisions = [
    { id: 'RFQ-000123', what: 'Award decision pack ready · gearbox housing', who: 'You · L2 approver 2 of 2', due: '2026-10-22T18:00:00+05:30', to: '/b/award/RFQ-000123', status: 'Under review' as const },
    { id: 'QRY-000088', what: 'AI draft answer waiting · bore finish Ra 1.6', who: 'L. Fischer', due: '2026-10-21T17:00:00+05:30', to: '/b/chat', status: 'Open' as const },
    { id: 'INV-000306', what: 'Invoice held · HSN 8483.40 vs PO 8483.10', who: 'P. Nair', due: '2026-10-23T18:00:00+05:30', to: '/b/payments?doc=INV-000306', status: 'Held' as const },
    { id: 'ASN-000213', what: 'Dispatch blocked by cross-check · HSN', who: 'Kaveri Precision Forge', due: '2026-10-21T16:00:00+05:30', to: '/b/shipments?doc=ASN-000213', status: 'Blocked' as const },
    { id: 'DN-000031', what: 'Debit note draft for 48 pcs short / rejected', who: 'P. Nair', due: '2026-10-18T18:00:00+05:30', to: '/b/payments?doc=INV-000298', status: 'Draft' as const },
  ];

  return (
    <div className="page">
      <PageHeader
        title={`Good morning, ${ME.name.split(' ')[0]}`}
        question="What needs you today, and are suppliers keeping their word?"
        meta={<>Plants PNQ-01 Chakan, STR-01 Stuttgart · data as of <span className="mono">{dateTime('2026-10-21T09:00:00+05:30')}</span> IST</>}
        primary={
          <Link to="/b/requests/new" className="btn btn-primary">
            <Icon name="plus" size={14} /> Create request
          </Link>
        }
        secondary={<Link to="/b/reports">CPO report</Link>}
      />

      <Kpis
        items={[
          { label: 'Quotes per RFQ', tech: 'median(quotes_received) over RFQs closed, 12 wk', value: '3.6', delta: <span className="row gap-4"><Sparkline data={kpiSeries.quotesPerRfq} target={3} width={96} height={22} color="var(--good)" /><SourceTag kind="computed" refText="Median of 27 RFQs" /></span>, target: 'target ≥ 3' },
          { label: 'Supplier reply time', tech: 'median(first_reply_at − sent_at)', value: '13.5', unit: 'h', delta: <span className="row gap-4"><Sparkline data={kpiSeries.replyHours} target={48} width={96} height={22} color="var(--good)" /><SourceTag kind="computed" refText="Median, 12 wk" /></span>, target: 'target ≤ 48 h' },
          { label: 'Cost per RFQ', tech: 'sum(metered_cost) / rfq_count', value: '₹ 104', delta: <span className="row gap-4"><Sparkline data={kpiSeries.costPerRfq} target={150} width={96} height={22} color="var(--good)" /><SourceTag kind="computed" refText="Metering events" /></span>, target: 'alert above ₹ 150' },
          { label: 'Open PO value', tech: 'sum(po.value) where status not in (Received, Matched)', value: inrShort(openPoValue), delta: <span className="row gap-4">5 POs <SourceTag kind="computed" refText="Sum of open PO values" /></span>, target: 'PNQ-01 + STR-01' },
        ]}
      />

      <div className="grid-2 mt-16" style={{ gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)', alignItems: 'start' }}>
        <Panel title="Needs your decision" actions={<span className="small muted mono">{decisions.length} items</span>} tight>
          <table className="dt">
            <thead>
              <tr>
                <th>Document</th>
                <th>What</th>
                <th>Owner</th>
                <th>Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {decisions.map((d) => {
                const dd = due(d.due);
                return (
                  <tr key={d.id} className="clickable" onClick={() => nav(d.to)}>
                    <td className="mono" style={{ color: 'var(--accent)' }}>{d.id}</td>
                    <td className="ellipsis" style={{ maxWidth: 250 }} title={d.what}>{d.what}</td>
                    <td className="muted ellipsis" style={{ maxWidth: 150 }}>{d.who}</td>
                    <td className={`small ${dd.tone}`} style={{ fontWeight: 600 }}>{dd.text}</td>
                    <td><StatusChip status={d.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        <Panel title="Commitments due" actions={<Link to="/b/commitments" className="small">Board</Link>}>
          <div className="col">
            {dueSoon.map((c) => (
              <CommitmentCard key={c.id} c={c} onAction={() => nav('/b/commitments')} />
            ))}
          </div>
        </Panel>
      </div>

      <div className="section">
        <div className="section-title">
          <h2>RFQs in flight</h2>
          <span className="spacer" />
          <Link to="/b/rfqs" className="small">All RFx</Link>
        </div>
        <DataTable<Rfq>
          id="home-rfqs"
          noToolbar
          rows={inFlight}
          loading={rfqs.isLoading}
          error={rfqs.error}
          onRetry={() => rfqs.refetch()}
          rowKey={(r) => r.id}
          onOpen={(r) => nav(`/b/rfqs/${r.id}`)}
          empty={{ title: 'No RFQs in flight', body: 'Upload a drawing to start one.', action: <Link to="/b/requests/new">Create request</Link> }}
          columns={[
            { key: 'id', header: 'RFQ', render: (r) => <DocLink id={r.id} /> },
            { key: 'title', header: 'Part', render: (r) => <span>{r.title} <span className="muted mono small">{r.partNo}</span></span> },
            { key: 'plant', header: 'Plant', render: (r) => <span className="mono">{r.plant}</span> },
            { key: 'quotes', header: 'Quotes', num: true, text: (r) => `${r.quotesIn} / ${r.invited}`, sortValue: (r) => r.quotesIn },
            { key: 'queries', header: 'Open queries', num: true, text: (r) => r.openQueries },
            { key: 'due', header: 'Quote due', render: (r) => <span className="mono">{date(r.quoteDue)}</span>, sortValue: (r) => r.quoteDue },
            { key: 'status', header: 'Status', render: (r) => <StatusChip status={r.status} />, text: (r) => r.status },
          ]}
        />
      </div>

      {held.length > 0 && (
        <div className="section">
          <div className="section-title">
            <h2>Payments on hold</h2>
            <span className="small muted">Three-way match failed; nothing is paid until a person clears it.</span>
          </div>
          <Panel tight>
            <table className="dt">
              <tbody>
                {held.map((i) => (
                  <tr key={i.id} className="clickable" onClick={() => nav(`/b/payments?doc=${i.id}`)}>
                    <td style={{ width: 120 }}><DocLink id={i.id} /></td>
                    <td>{vendorById(i.vendorId).name}</td>
                    <td className="muted">{i.note}</td>
                    <td className="num">{inrShort(i.amount)}</td>
                    <td style={{ width: 90 }}><StatusChip status={i.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      )}
    </div>
  );
}
