import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useApi, useApiArg } from '@/api/client';
import { queries, vendorById } from '@/api/mock/data';
import type { Rfq, Status } from '@/api/types';
import { DataTable } from '@/components/DataTable';
import { DocFlow, HashLine } from '@/components/domain';
import { Icon } from '@/components/Icon';
import { Banner, DocLink, KV, PageHeader, Panel, RecordMeta, SourceTag, StatusChip, Tabs, TechLabel, TierBadge } from '@/components/primitives';
import { EmptyState, LoadingBlock } from '@/components/StateViews';
import { date, dateTime, int } from '@/lib/format';

type TabId = 'all' | 'open' | 'review' | 'awarded' | 'draft';

export function RfqList() {
  const nav = useNavigate();
  const { data, isLoading, error, refetch } = useApi('rfqs');
  const [tab, setTab] = useState<TabId>('all');
  const all = data ?? [];
  const match: Record<TabId, (r: Rfq) => boolean> = {
    all: () => true,
    open: (r) => r.status === 'Sent',
    review: (r) => r.status === 'Quoted' || r.status === 'Under review',
    awarded: (r) => r.status === 'Awarded',
    draft: (r) => r.status === 'Draft',
  };
  return (
    <div className="page">
      <PageHeader
        title="RFx"
        question="Where is every request for quotation, and which ones need a decision?"
        primary={<Link to="/b/requests/new" className="btn btn-primary"><Icon name="plus" size={14} /> Create request</Link>}
        secondary={<Link to="/b/auctions">Auctions</Link>}
      />
      <Tabs<TabId>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'all', label: 'All', count: all.length },
          { id: 'open', label: 'Collecting quotes', count: all.filter(match.open).length },
          { id: 'review', label: 'Ready to compare', count: all.filter(match.review).length },
          { id: 'awarded', label: 'Awarded', count: all.filter(match.awarded).length },
          { id: 'draft', label: 'Drafts', count: all.filter(match.draft).length },
        ]}
      />
      <DataTable<Rfq>
        id="rfqs"
        rows={data ? all.filter(match[tab]) : undefined}
        loading={isLoading}
        error={error}
        onRetry={() => refetch()}
        rowKey={(r) => r.id}
        onOpen={(r) => nav(`/b/rfqs/${r.id}`)}
        initialSort={{ key: 'id', dir: 'desc' }}
        bulk={(sel, clear) => <><button className="link" onClick={clear}>Send reminder ({sel.length})</button><button className="link" onClick={clear}>Extend due date</button></>}
        empty={{ title: 'No RFQs yet', body: 'Upload a drawing, data sheet or STEP file to create the first one.', action: <Link to="/b/requests/new">Create request</Link> }}
        columns={[
          { key: 'id', header: 'RFQ', render: (r) => <DocLink id={r.id} /> },
          { key: 'title', header: 'Part' },
          { key: 'partNo', header: 'Part no.', render: (r) => <span className="mono">{r.partNo} <span className="muted">rev {r.rev}</span></span> },
          { key: 'category', header: 'Category' },
          { key: 'material', header: 'Material', hidden: true },
          { key: 'plant', header: 'Plant', render: (r) => <span className="mono">{r.plant}</span> },
          { key: 'annualQty', header: 'Annual qty', unit: 'pcs', num: true, text: (r) => int(r.annualQty), sortValue: (r) => r.annualQty },
          { key: 'quotes', header: 'Quotes', num: true, text: (r) => `${r.quotesIn} / ${r.invited}`, sortValue: (r) => r.quotesIn },
          { key: 'quoteDue', header: 'Quote due', render: (r) => <span className="mono">{date(r.quoteDue)}</span>, sortValue: (r) => r.quoteDue },
          { key: 'owner', header: 'Owner' },
          { key: 'status', header: 'Status', render: (r) => <StatusChip status={r.status} />, text: (r) => r.status },
        ]}
      />
    </div>
  );
}

const INVITE_STATE: Record<string, { status: Status; note: string }> = {
  'VEN-000041': { status: 'Submitted', note: 'WhatsApp quote · 18-10 19:42' },
  'VEN-000027': { status: 'Submitted', note: 'Web · 19-10 11:05' },
  'VEN-000058': { status: 'Submitted', note: 'Voice note (Tamil) · confirmed 19-10 22:18' },
  'VEN-000007': { status: 'Submitted', note: 'Web · 20-10 15:51' },
  'VEN-000033': { status: 'Declined', note: 'Capacity full till Dec' },
  'VEN-000019': { status: 'Expired', note: 'Viewed 2×, no reply after 2 reminders' },
};

export function RfqView() {
  const { id = 'RFQ-000123' } = useParams();
  const { data: rfq, isLoading } = useApiArg('rfq', id, api.rfq);
  const { data: qs } = useApiArg('quotes', id, api.quotes);
  const [tab, setTab] = useState<'suppliers' | 'part' | 'queries' | 'docs'>('suppliers');

  if (isLoading) return <div className="page"><LoadingBlock lines={8} /></div>;
  if (!rfq) return <div className="page"><EmptyState title={`${id} not found`} body="Check the number, or search with / ." action={<Link to="/b/rfqs">All RFx</Link>} /></div>;

  const sealedOpen = rfq.sealed;
  const rfqQueries = queries.filter((q) => q.rfqId === rfq.id);
  const invited = Object.keys(INVITE_STATE);

  return (
    <div className="page">
      <PageHeader
        crumbs={[{ label: 'Sourcing' }, { label: 'RFx', to: '/b/rfqs' }, { label: rfq.id }]}
        title={rfq.title}
        docNo={rfq.id}
        status={rfq.status}
        meta={<RecordMeta by={rfq.changedBy} at={rfq.changedAt} />}
        primary={
          rfq.quotesIn > 0 && !sealedOpen ? (
            <Link to={`/b/compare/${rfq.id}`} className="btn btn-primary">Compare {rfq.quotesIn} quotes</Link>
          ) : (
            <button className="btn btn-primary" disabled>Compare after {date(rfq.quoteDue)}</button>
          )
        }
        secondary={<><button className="link">Extend due date</button><button className="link">Add supplier</button></>}
      />

      <Panel className="mb-16">
        <DocFlow
          horizontal
          nodes={[
            { id: 'PR-77310', label: 'Requisition', sub: '13-10-2026', state: 'done' },
            { id: rfq.id, label: 'RFQ', sub: `${rfq.invited} invited`, state: 'current' },
            { id: `${rfq.quotesIn} quotes`, label: 'Quotes', sub: sealedOpen ? 'sealed' : 'unsealed 20-10 18:02', state: rfq.quotesIn ? 'done' : 'next' },
            { id: 'Decision pack', label: 'Award', sub: 'L2 approval', state: 'next' },
            { id: 'PO-______', label: 'Purchase order', state: 'next' },
            { id: 'ASN · GRN', label: 'Delivery', state: 'next' },
            { id: 'INV · 3-way', label: 'Payment', state: 'next' },
          ]}
        />
      </Panel>

      {sealedOpen ? (
        <div className="mb-12"><Banner tone="info" icon="lock">Sealed until <span className="mono">{dateTime(rfq.quoteDue)}</span>. {rfq.quotesIn} of {rfq.invited} quotes received; prices stay hidden from everyone until then. No commercial negotiation in the sealed period.</Banner></div>
      ) : null}

      <div className="grid-4 mb-16" style={{ gap: 12 }}>
        <Panel><TechLabel tech="quotes_received / invited">Quotes</TechLabel><div className="mono" style={{ fontSize: 20, marginTop: 4 }}>{rfq.quotesIn} / {rfq.invited}</div></Panel>
        <Panel><TechLabel tech="Should-cost band · normalised unit price">Should-cost</TechLabel><div className="row mt-4"><span className="mono" style={{ fontSize: 20 }}>₹ {int(rfq.shouldCost.low)}–{int(rfq.shouldCost.high)}</span><SourceTag kind="computed" refText={rfq.shouldCost.ref} /></div></Panel>
        <Panel><TechLabel tech="Last purchase price for this part">Last price</TechLabel><div className="row mt-4"><span className="mono" style={{ fontSize: 20 }}>{rfq.lastPrice ? `₹ ${int(rfq.lastPrice)}` : '—'}</span>{rfq.lastPrice && <SourceTag kind="history" refText="PO history, 2025" />}</div></Panel>
        <Panel><TechLabel tech="median(first_reply_at − sent_at)">Median reply</TechLabel><div className="mono" style={{ fontSize: 20, marginTop: 4 }}>6.5 h</div></Panel>
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'suppliers', label: 'Suppliers', count: invited.length }, { id: 'part', label: 'Part & terms' }, { id: 'queries', label: 'Queries', count: rfqQueries.length }, { id: 'docs', label: 'Documents', count: 3 }]} />

      {tab === 'suppliers' && (
        <Panel tight>
          <table className="dt">
            <thead><tr><th>Supplier</th><th>Verification</th><th>Status</th><th>Channel & time</th><th>Sealed submission</th></tr></thead>
            <tbody>
              {invited.map((vid) => {
                const v = vendorById(vid);
                const st = INVITE_STATE[vid]!;
                const qt = qs?.find((x) => x.vendorId === vid);
                return (
                  <tr key={vid}>
                    <td><Link to={`/b/vendors/${vid}`}>{v.name}</Link> <span className="muted small">{v.city}</span></td>
                    <td><TierBadge tier={v.tier} /></td>
                    <td><StatusChip status={st.status} /></td>
                    <td className="small muted">{st.note}</td>
                    <td style={{ width: 380 }}>{qt ? <HashLine hash={qt.hash} label={qt.id} /> : <span className="faint small">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}
      {tab === 'part' && (
        <div className="grid-2">
          <Panel title="Part">
            <KV items={[['Part no.', <span key="1" className="mono">{rfq.partNo} rev {rfq.rev}</span>], ['Material', rfq.material], ['Process', rfq.process], ['Category', rfq.category], ['Plant', <span key="2" className="mono">{rfq.plant}</span>]]} />
          </Panel>
          <Panel title="Terms">
            <KV items={[['Annual qty', <span key="1" className="mono">{int(rfq.annualQty)} pcs</span>], ['Lot size', <span key="2" className="mono">{int(rfq.lotQty)} pcs</span>], ['Incoterm', rfq.incoterm], ['Quote due', <span key="3" className="mono">{dateTime(rfq.quoteDue)}</span>], ['Terms accepted', 'GCP v3 · SCP v2 (required to quote)']]} />
          </Panel>
        </div>
      )}
      {tab === 'queries' && (
        <Panel tight>
          {rfqQueries.length === 0 ? <EmptyState title="No queries on this RFQ" /> : (
            <table className="dt"><tbody>{rfqQueries.map((q) => (
              <tr key={q.id}><td className="mono" style={{ width: 120 }}>{q.id}</td><td className="ellipsis" style={{ maxWidth: 520 }}>{q.question}</td><td className="muted">{q.vendorAlias}</td><td><StatusChip status={q.status} /></td><td><Link to="/b/chat">Open</Link></td></tr>
            ))}</tbody></table>
          )}
        </Panel>
      )}
      {tab === 'docs' && (
        <Panel tight>
          <table className="dt"><tbody>
            <tr><td className="mono">KM-GH-2210_revC.pdf</td><td>Drawing · watermarked</td><td className="muted">1.8 MB</td></tr>
            <tr><td className="mono">KM-GH-2210.step</td><td>3D model</td><td className="muted">6.2 MB</td></tr>
            <tr><td className="mono">GCP-v3.pdf</td><td>General conditions of purchase</td><td className="muted">220 KB</td></tr>
          </tbody></table>
        </Panel>
      )}
    </div>
  );
}
