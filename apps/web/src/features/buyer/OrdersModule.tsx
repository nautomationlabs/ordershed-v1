import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '@/api/client';
import { commitments, grns, invoices, orders, shipments, vendorById } from '@/api/mock/data';
import type { Grn, Invoice, Order, Shipment } from '@/api/types';
import { DataTable } from '@/components/DataTable';
import { AiProposal, CheckRow, CommitmentCard, DocFlow, type FlowNode } from '@/components/domain';
import { Icon } from '@/components/Icon';
import { Banner, DocLink, KV, Kpis, PageHeader, Panel, RecordMeta, Seg, SourceTag, StatusChip, TechLabel } from '@/components/primitives';
import { threeWayMatch } from '@/lib/costing';
import { date, dateTime, inrShort, int, money } from '@/lib/format';

function flowFor(po: Order): FlowNode[] {
  const asn = shipments.find((s) => s.poId === po.id);
  const grn = grns.find((g) => g.poId === po.id);
  const inv = invoices.find((i) => i.poId === po.id);
  return [
    { id: po.rfqId, label: 'RFQ', state: 'done' },
    { id: po.id, label: 'Purchase order', sub: `issued ${date(po.issuedAt)}`, state: 'current' },
    { id: po.ackAt ? `ACK · ${date(po.ackAt)}` : 'Acknowledgement', label: 'Acknowledgement', state: po.ackAt ? 'done' : 'next' },
    { id: asn?.id ?? 'ASN', label: 'Shipment', sub: asn ? `${int(asn.shippedQty)} pcs · ${asn.status}` : undefined, state: asn ? 'done' : 'next' },
    { id: grn?.id ?? 'GRN', label: 'Goods receipt', sub: grn ? `${int(grn.qtyAccepted)} accepted` : undefined, state: grn ? 'done' : 'next' },
    { id: inv?.id ?? 'INV', label: 'Invoice · 3-way match', sub: inv ? inv.status : undefined, state: inv ? 'done' : 'next' },
  ];
}

export function Orders() {
  const [params] = useSearchParams();
  const { data, isLoading, error, refetch } = useApi('orders');
  const [active, setActive] = useState<string>(params.get('doc') ?? 'PO-000456');
  const po = data?.find((o) => o.id === active);

  return (
    <div className="page">
      <PageHeader
        title="Orders"
        question="Is every PO acknowledged, on track and documented?"
        primary={<button className="btn btn-primary">Create PO</button>}
        secondary={<Link to="/b/shipments">Shipments</Link>}
      />
      <div className="md md-wide">
        <DataTable<Order>
          id="orders"
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={() => refetch()}
          rowKey={(o) => o.id}
          activeKey={active}
          onOpen={(o) => setActive(o.id)}
          initialSort={{ key: 'id', dir: 'desc' }}
          bulk={(sel, clear) => <button className="link" onClick={clear}>Nudge {sel.length} on WhatsApp</button>}
          empty={{ title: 'No purchase orders yet', body: 'POs are created from an approved award.' }}
          columns={[
            { key: 'id', header: 'PO', render: (o) => <span className="mono" style={{ color: 'var(--accent)' }}>{o.id}</span> },
            { key: 'vendor', header: 'Supplier', text: (o) => vendorById(o.vendorId).name },
            { key: 'title', header: 'Part', hidden: true },
            { key: 'plant', header: 'Plant', hidden: true, render: (o) => <span className="mono">{o.plant}</span> },
            { key: 'value', header: 'Value', unit: '₹', num: true, text: (o) => inrShort(o.value), sortValue: (o) => o.value },
            { key: 'needBy', header: 'Need by', render: (o) => <span className="mono">{date(o.needBy)}</span>, sortValue: (o) => o.needBy },
            { key: 'status', header: 'Status', render: (o) => <StatusChip status={o.status} />, text: (o) => o.status },
          ]}
        />
        <div className="detail">
          {po ? (
            <Panel
              title={<div className="row"><span className="mono strong">{po.id}</span><StatusChip status={po.status} /></div>}
              actions={<button className="link small">Open full record</button>}
              foot={<RecordMeta by={po.changedBy} at={po.changedAt} />}
            >
              <h2 style={{ fontSize: 15 }}>{po.title}</h2>
              <div className="muted small mb-12">{vendorById(po.vendorId).name} · {vendorById(po.vendorId).city}</div>
              <KV narrow items={[
                ['Value', <span key="v" className="sourced" style={{ justifyContent: 'flex-start' }}><span className="mono">{money(po.value)}</span><SourceTag kind="computed" refText="Σ qty × unit price" /></span>],
                ['Incoterm', po.incoterm],
                ['Payment', po.paymentTerms],
                ['Need by', <span key="n" className="mono">{date(po.needBy)}</span>],
                ['Acknowledged', po.ackAt ? <span key="a" className="mono">{dateTime(po.ackAt)}</span> : <span key="a" className="warn strong">Waiting · 1 reminder sent</span>],
              ]} />
              <div className="label mt-16 mb-8">Lines</div>
              <table className="dt" style={{ border: '1px solid var(--border)' }}>
                <thead><tr><th>Ln</th><th>Part</th><th className="num">Qty</th><th className="num">Unit ₹</th><th>HSN</th><th className="num">GST</th></tr></thead>
                <tbody>{po.lines.map((l) => (
                  <tr key={l.line}><td className="mono">{l.line}</td><td className="mono">{l.partNo}</td><td className="num">{int(l.qty)}</td><td className="num">{l.unitPrice.toFixed(2)}</td><td className="mono">{l.hsn}</td><td className="num">{l.taxPct}%</td></tr>
                ))}</tbody>
              </table>
              <div className="label mt-16 mb-8">Production progress</div>
              <div className="row"><div className="progress w-full"><span style={{ width: `${po.progressPct}%` }} /></div><span className="mono small">{po.progressPct}%</span></div>
              <div className="label mt-16 mb-8">Document flow</div>
              <DocFlow nodes={flowFor(po)} />
              {commitments.filter((c) => c.doc === po.id && c.lane !== 'Done').length > 0 && (
                <>
                  <div className="label mt-16 mb-8">Open commitments</div>
                  <div className="col">{commitments.filter((c) => c.doc === po.id && c.lane !== 'Done').map((c) => <CommitmentCard key={c.id} c={c} />)}</div>
                </>
              )}
            </Panel>
          ) : (
            <Panel><div className="state">Select a PO.</div></Panel>
          )}
        </div>
      </div>
    </div>
  );
}

export function Shipments() {
  const [params] = useSearchParams();
  const { data, isLoading, error, refetch } = useApi('shipments');
  const [active, setActive] = useState<string>(params.get('doc') ?? 'ASN-000213');
  const s = data?.find((x) => x.id === active);
  return (
    <div className="page">
      <PageHeader
        title="Shipments"
        question="What is on the road, does it match the PO, and when does it land?"
        meta="Dispatch cross-check runs before a supplier can mark Shipped: quantity, HSN, GSTIN, value, Incoterm, consignee."
        primary={<Link to="/b/transport" className="btn btn-primary">Transport RFQ</Link>}
      />
      <div className="md">
        <DataTable<Shipment>
          id="shipments"
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={() => refetch()}
          rowKey={(x) => x.id}
          activeKey={active}
          onOpen={(x) => setActive(x.id)}
          empty={{ title: 'Nothing in transit', body: 'Shipments appear when a supplier passes the dispatch cross-check.' }}
          columns={[
            { key: 'id', header: 'ASN', render: (x) => <span className="mono" style={{ color: 'var(--accent)' }}>{x.id}</span> },
            { key: 'poId', header: 'PO', render: (x) => <DocLink id={x.poId} /> },
            { key: 'vendor', header: 'Supplier', text: (x) => vendorById(x.vendorId).name },
            { key: 'mode', header: 'Mode', hidden: true },
            { key: 'lrNo', header: 'LR / B/L', hidden: true, render: (x) => <span className="mono small">{x.lrNo}</span> },
            { key: 'qty', header: 'Shipped / recd', unit: 'pcs', num: true, text: (x) => `${int(x.shippedQty)} / ${x.receivedQty !== undefined ? int(x.receivedQty) : '—'}` },
            { key: 'eta', header: 'ETA', render: (x) => <span className="mono">{date(x.eta)}</span>, sortValue: (x) => x.eta },
            { key: 'status', header: 'Status', render: (x) => <StatusChip status={x.status} />, text: (x) => x.status },
          ]}
        />
        <div className="detail">
          {s && (
            <Panel title={<div className="row"><span className="mono strong">{s.id}</span><StatusChip status={s.status} /></div>} foot={<RecordMeta by={s.changedBy} at={s.changedAt} />}>
              <KV narrow items={[['PO', <DocLink key="p" id={s.poId} />], ['Supplier', vendorById(s.vendorId).name], ['Carrier', s.carrier], ['E-way bill', <span key="e" className="mono">{s.ewayBill ?? '—'}</span>], ['Dispatched', <span key="d" className="mono">{dateTime(s.dispatchedAt)}</span>], ['ETA', <span key="t" className="mono">{dateTime(s.eta)}</span>]]} />
              <div className="label mt-16 mb-8">Dispatch cross-check</div>
              <div className="checks">
                {s.crossCheck.map((c) => (
                  <CheckRow key={c.key} state={c.ok ? 'pass' : 'fail'} label={c.label} detail={!c.ok ? <>PO <span className="mono">{c.po}</span> · packing list <span className="mono">{c.doc}</span></> : undefined} />
                ))}
              </div>
              {s.status === 'Blocked' && (
                <div className="mt-12 col">
                  <Banner tone="crit" icon="alert">Supplier cannot mark Shipped until the HSN on the packing list and invoice matches PO line 10. Two WhatsApp reminders sent.</Banner>
                  <AiProposal title="Proposed message to supplier" confidence={0.93} sources={['PO-000456 line 10', 'Packing list PL-KPF-0412']}>
                    HSN on your packing list is 8483.40; the PO says 8483.10 (shafts). Please correct the packing list and invoice and resend. Tap Fix and resend.
                  </AiProposal>
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

export function Transport() {
  const bids = [
    { lsp: 'VRL Logistics', mode: 'FTL 19 ft', price: 38500, transit: 2, insurance: 'Included', rating: 4.4 },
    { lsp: 'TCI Freight', mode: 'FTL 19 ft', price: 41200, transit: 2, insurance: 'Included', rating: 4.6 },
    { lsp: 'Gati', mode: 'PTL 6 t', price: 29800, transit: 4, insurance: '0.2% extra', rating: 4.1 },
    { lsp: 'Safexpress', mode: 'PTL 6 t', price: 31400, transit: 3, insurance: 'Included', rating: 4.3 },
  ];
  return (
    <div className="page">
      <PageHeader
        title="Transport RFQ"
        docNo="TRQ-000017"
        status="Quoted"
        question="Which carrier should move this load, at what price and transit time?"
        meta="Hosur → Chakan, Pune · 800 pcs pump casings · 14.6 t gross · 22 pallets · ready 24-10-2026"
        primary={<button className="btn btn-primary">Book VRL Logistics</button>}
        secondary={<button className="link">Add carrier</button>}
      />
      <div className="mb-12"><Banner tone="info">Phase 6 milestone (logistics providers). Bids here are sandbox; live rates come from integrated LSPs.</Banner></div>
      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', alignItems: 'start' }}>
        <Panel title="Carrier bids" tight>
          <table className="dt">
            <thead><tr><th>Carrier</th><th>Mode</th><th className="num">Price ₹</th><th className="num">Transit days</th><th>Insurance</th><th className="num">Rating</th></tr></thead>
            <tbody>{bids.map((b, i) => (
              <tr key={b.lsp} className={i === 0 ? 'cursor' : ''}><td>{b.lsp}</td><td>{b.mode}</td><td className="num"><span className="sourced"><span className="mono">{int(b.price)}</span><SourceTag kind="freight" refText={`${b.lsp} bid · 21-10-2026`} /></span></td><td className="num">{b.transit}</td><td className="muted">{b.insurance}</td><td className="num">{b.rating.toFixed(1)}</td></tr>
            ))}</tbody>
          </table>
        </Panel>
        <Panel title="Load">
          <KV narrow items={[['From', 'Sri Murugan Castings, Hosur 635126'], ['To', 'Kestrel Motion, Chakan 410501'], ['Linked PO', <DocLink key="p" id="PO-000441" />], ['Weight', <span key="w" className="mono">14.6 t</span>], ['Pallets', <span key="pl" className="mono">22 × 1200 × 1000</span>], ['E-way bill', 'Generated by supplier on dispatch']]} />
        </Panel>
      </div>
    </div>
  );
}

export function GrnScreen() {
  const [params] = useSearchParams();
  const { data, isLoading, error, refetch } = useApi('grns');
  const [active, setActive] = useState<string>(params.get('doc') ?? 'GRN-000781');
  const g = data?.find((x) => x.id === active);
  return (
    <div className="page">
      <PageHeader
        title="Goods receipt"
        question="What arrived, how much did we accept, and what goes back?"
        meta="GRN posts against the ASN and PO line. Rejections create a debit-note draft automatically."
        primary={<button className="btn btn-primary">Post GRN for ASN-000211</button>}
      />
      <div className="md">
        <DataTable<Grn>
          id="grns"
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={() => refetch()}
          rowKey={(x) => x.id}
          activeKey={active}
          onOpen={(x) => setActive(x.id)}
          empty={{ title: 'No goods receipts yet', body: 'Post a GRN when a shipment reaches the plant.' }}
          columns={[
            { key: 'id', header: 'GRN', render: (x) => <span className="mono" style={{ color: 'var(--accent)' }}>{x.id}</span> },
            { key: 'poId', header: 'PO', render: (x) => <DocLink id={x.poId} /> },
            { key: 'asnId', header: 'ASN', hidden: true, render: (x) => <span className="mono">{x.asnId}</span> },
            { key: 'vendor', header: 'Supplier', text: (x) => vendorById(x.vendorId).name },
            { key: 'qtyReceived', header: 'Received', unit: 'pcs', num: true, hidden: true, text: (x) => int(x.qtyReceived) },
            { key: 'qtyAccepted', header: 'Accepted', unit: 'pcs', num: true, text: (x) => int(x.qtyAccepted) },
            { key: 'qtyRejected', header: 'Rejected', unit: 'pcs', num: true, render: (x) => <span className={x.qtyRejected ? 'crit mono' : 'mono'}>{x.qtyRejected}</span>, sortValue: (x) => x.qtyRejected },
            { key: 'status', header: 'Status', render: (x) => <StatusChip status={x.status} />, text: (x) => x.status },
          ]}
        />
        <div className="detail">
          {g && (
            <Panel title={<div className="row"><span className="mono strong">{g.id}</span><StatusChip status={g.status} /></div>} foot={<RecordMeta by={g.changedBy} at={g.changedAt} />}>
              <KV narrow items={[['PO / ASN', <span key="p"><DocLink id={g.poId} /> · <span className="mono">{g.asnId}</span></span>], ['Plant', <span key="pl" className="mono">{g.plant}</span>], ['Received', <span key="r" className="mono">{dateTime(g.receivedAt)}</span>], ['Inspector', g.inspector]]} />
              <table className="dt mt-12" style={{ border: '1px solid var(--border)' }}>
                <thead><tr><th>Quantity</th><th className="num">pcs</th><th>Source</th></tr></thead>
                <tbody>
                  <tr><td>Shipped (ASN)</td><td className="num">{int(shipments.find((s) => s.id === g.asnId)?.shippedQty ?? g.qtyReceived)}</td><td><SourceTag kind="supplier" refText="ASN" /></td></tr>
                  <tr><td>Received</td><td className="num">{int(g.qtyReceived)}</td><td className="small muted">Stores count</td></tr>
                  <tr><td>Accepted</td><td className="num">{int(g.qtyAccepted)}</td><td className="small muted">Inspection</td></tr>
                  <tr><td>Rejected</td><td className="num crit">{int(g.qtyRejected)}</td><td className="small muted">Inspection</td></tr>
                </tbody>
              </table>
              {g.note && <div className="mt-12"><Banner tone="warn" icon="alert">{g.note}</Banner></div>}
              {g.qtyRejected > 0 && (
                <div className="mt-12">
                  <AiProposal title="Proposed debit note DN-000031" confidence={0.97} sources={['GRN-000781', 'PO-000441 line 10 @ ₹ 2,460']} approveLabel="Approve draft">
                    48 pcs × ₹ 2,460.00 = <span className="mono strong">₹ 1,18,080.00</span> + GST 18%. Reason: 24 short against ASN, 24 rejected (blow holes on flange face). <SourceTag kind="computed" />
                  </AiProposal>
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

export function Payments() {
  const [params] = useSearchParams();
  const { data, isLoading, error, refetch } = useApi('invoices');
  const [filter, setFilter] = useState<'all' | 'Matched' | 'Held' | 'Pending'>('all');
  const [active, setActive] = useState<string>(params.get('doc') ?? 'INV-000306');
  const inv = data?.find((x) => x.id === active);
  const rows = (data ?? []).filter((i) => filter === 'all' || i.status === filter);
  const sum = (s: string) => (data ? inrShort(data.filter((i) => i.status === s).reduce((a, i) => a + i.amount + i.tax, 0)) : '—');

  return (
    <div className="page">
      <PageHeader
        title="Payments"
        question="Which invoices match PO and GRN and can be released, and which are held?"
        meta="Three-way match on quantity, price, HSN and tax. MSME 45-day due dates tracked. No escrow in V1; payment runs from your ERP."
        primary={<button className="btn btn-primary">Approve matched (1)</button>}
        secondary={<button className="link">Export payment file</button>}
      />
      <Kpis items={[
        { label: 'Matched, ready', value: sum('Matched'), delta: <SourceTag kind="computed" /> },
        { label: 'Held', value: sum('Held'), delta: <span className="crit">2 invoices</span> },
        { label: 'Waiting for GRN', value: sum('Pending'), delta: '1 invoice' },
        { label: 'MSME due ≤ 15 d', value: '1', delta: <span className="warn">INV-000298 · 04-11</span> },
      ]} />
      <div className="md md-wide mt-16">
        <DataTable<Invoice>
          id="invoices"
          rows={data ? rows : undefined}
          loading={isLoading}
          error={error}
          onRetry={() => refetch()}
          rowKey={(x) => x.id}
          activeKey={active}
          onOpen={(x) => setActive(x.id)}
          toolbar={<Seg options={[{ id: 'all', label: 'All' }, { id: 'Matched', label: 'Matched' }, { id: 'Held', label: 'Held' }, { id: 'Pending', label: 'Pending' }]} value={filter} onChange={setFilter} />}
          bulk={(sel, clear) => <button className="link" onClick={clear}>Approve {sel.filter((s) => s.status === 'Matched').length} matched</button>}
          empty={{ title: 'No invoices', body: 'Supplier invoices arrive with the e-invoice IRN and are matched automatically.' }}
          columns={[
            { key: 'id', header: 'Invoice', render: (x) => <span className="mono" style={{ color: 'var(--accent)' }}>{x.id}</span> },
            { key: 'supplierInvoiceNo', header: 'Supplier inv. no.', hidden: true, render: (x) => <span className="mono small">{x.supplierInvoiceNo}</span> },
            { key: 'vendor', header: 'Supplier', text: (x) => vendorById(x.vendorId).name },
            { key: 'poId', header: 'PO', render: (x) => <DocLink id={x.poId} /> },
            { key: 'amount', header: 'Gross', unit: '₹', num: true, text: (x) => inrShort(x.amount + x.tax), sortValue: (x) => x.amount + x.tax },
            { key: 'match', header: 'Q P H T', tech: 'Quantity · Price · HSN · Tax', render: (x) => <span className="mono">{matchFor(x).checks.map((c) => <span key={c.key} className={c.state === 'pass' ? 'good' : c.state === 'fail' ? 'crit' : 'faint'} style={{ marginRight: 4 }}>{c.state === 'pass' ? '✓' : c.state === 'fail' ? '✗' : '·'}</span>)}</span> },
            { key: 'msmeDue', header: 'MSME due', hidden: true, render: (x) => <span className="mono">{x.msmeDue ? date(x.msmeDue) : '—'}</span> },
            { key: 'status', header: 'Status', render: (x) => <StatusChip status={x.status} />, text: (x) => x.status },
          ]}
        />
        <div className="detail">
          {inv && <InvoiceDetail inv={inv} />}
        </div>
      </div>
    </div>
  );
}

/** Three-way match for one invoice: PO line ↔ GRN ↔ invoice line. Quantity stays pending until a GRN exists. */
function matchFor(inv: Invoice) {
  const po = orders.find((o) => o.id === inv.poId)!;
  const grn = grns.find((g) => g.id === inv.grnId);
  const line = po.lines[0]!;
  const m = threeWayMatch({
    po: { qty: line.qty, unitPrice: line.unitPrice, hsn: line.hsn, taxPct: line.taxPct },
    grn: { qtyAccepted: grn?.qtyAccepted ?? 0 },
    invoice: { qty: inv.qty, unitPrice: inv.unitPrice, hsn: inv.hsn, taxPct: inv.taxPct },
  });
  const checks = m.checks.map((c) => ({ ...c, state: (c.key === 'qty' && !grn ? 'pending' : c.ok ? 'pass' : 'fail') as 'pass' | 'fail' | 'pending', detail: c.key === 'qty' && !grn ? `Invoiced ${inv.qty} · no GRN yet` : c.detail }));
  return { grn, checks };
}

function InvoiceDetail({ inv }: { inv: Invoice }) {
  const { grn, checks } = matchFor(inv);
  const label: Record<string, string> = { qty: 'Quantity', price: 'Unit price', hsn: 'HSN', tax: 'GST rate' };
  return (
    <Panel title={<div className="row"><span className="mono strong">{inv.id}</span><StatusChip status={inv.status} /></div>} foot={<RecordMeta by={inv.changedBy} at={inv.changedAt} />}>
      <KV narrow items={[
        ['Supplier', vendorById(inv.vendorId).name],
        ['Invoice no.', <span key="i" className="mono">{inv.supplierInvoiceNo}</span>],
        ['IRN', <span key="r" className="mono">{inv.irn ?? '—'}</span>],
        ['Taxable', <span key="t" className="sourced" style={{ justifyContent: 'flex-start' }}><span className="mono">{money(inv.amount)}</span><SourceTag kind="supplier" refText="Tax invoice" /></span>],
        ['GST', <span key="g" className="mono">{money(inv.tax)}</span>],
        ['Due', <span key="d" className="mono">{date(inv.dueAt)}</span>],
      ]} />
      <div className="row mt-16 mb-8"><TechLabel tech="PO line ↔ GRN ↔ invoice line">Three-way match</TechLabel><span className="spacer" /><span className="small muted"><DocLink id={inv.poId} /> · {grn ? <DocLink id={grn.id} /> : 'no GRN yet'}</span></div>
      <div className="checks">
        {checks.map((c) => <CheckRow key={c.key} state={c.state} label={label[c.key]} detail={<span className="mono">{c.detail}</span>} />)}
      </div>
      {inv.note && <div className="mt-12"><Banner tone={inv.status === 'Held' ? 'crit' : 'info'} icon="alert">{inv.note}</Banner></div>}
      <div className="row mt-16 gap-16">
        {inv.status === 'Matched' && <button className="btn btn-sm"><Icon name="check" size={13} /> Approve for payment</button>}
        {inv.status === 'Held' && <><button className="btn btn-sm">Request corrected invoice</button><button className="link">Release with note</button></>}
      </div>
    </Panel>
  );
}
