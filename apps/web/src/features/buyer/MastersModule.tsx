import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '@/api/client';
import type { DocRecord, Material } from '@/api/types';
import { DataTable } from '@/components/DataTable';
import { Banner, DocLink, KV, PageHeader, Panel, RecordMeta, Seg, SourceTag, Sparkline, StatusChip, TechLabel } from '@/components/primitives';
import { date, dateTime, money } from '@/lib/format';

export function Materials() {
  const [params] = useSearchParams();
  const { data, isLoading, error, refetch } = useApi('materials');
  const [active, setActive] = useState<string>(params.get('doc') ?? 'MAT-000098');
  const m = data?.find((x) => x.id === active);
  return (
    <div className="page">
      <PageHeader
        title="Material master"
        question="What do we know about each part: spec, suppliers, price history, documents?"
        meta="One record per part revision. ERP mapping keeps your SAP / Tally codes in step."
        primary={<button className="btn btn-primary">Add material</button>}
        secondary={<button className="link">Import from ERP</button>}
      />
      <div className="md">
        <DataTable<Material>
          id="materials"
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={() => refetch()}
          rowKey={(x) => x.id}
          activeKey={active}
          onOpen={(x) => setActive(x.id)}
          empty={{ title: 'No materials yet', body: 'A material record is created with every new RFQ part.' }}
          columns={[
            { key: 'partCode', header: 'Part code', render: (x) => <span className="mono" style={{ color: 'var(--accent)' }}>{x.partCode}</span> },
            { key: 'erpCode', header: 'ERP code', hidden: true, render: (x) => <span className="mono small">{x.erpCode}</span>, tech: 'MARA-MATNR mapping' },
            { key: 'desc', header: 'Description' },
            { key: 'material', header: 'Material', hidden: true },
            { key: 'hsn', header: 'HSN', render: (x) => <span className="mono">{x.hsn}</span> },
            { key: 'rev', header: 'Rev', hidden: true, render: (x) => <span className="mono">{x.rev}</span> },
            { key: 'suppliers', header: 'Suppliers', num: true, render: (x) => <span className={x.singleSource ? 'warn mono strong' : 'mono'}>{x.suppliers}{x.singleSource ? ' · single' : ''}</span>, sortValue: (x) => x.suppliers },
            { key: 'lastPrice', header: 'Last price', unit: '₹', num: true, text: (x) => x.lastPrice.toFixed(2), sortValue: (x) => x.lastPrice },
            { key: 'trend', header: '6-month trend', render: (x) => <Sparkline data={x.priceTrend} width={80} height={20} /> },
          ]}
        />
        <div className="detail">
          {m && (
            <Panel title={<div className="row"><span className="mono strong">{m.partCode}</span><span className="muted mono small">rev {m.rev} · {m.id}</span></div>} foot={<RecordMeta by={m.changedBy} at={m.changedAt} />}>
              <h2 style={{ fontSize: 15 }} className="mb-12">{m.desc}</h2>
              <KV narrow items={[
                [<TechLabel key="e" tech="MARA-MATNR">ERP code</TechLabel>, <span key="e2" className="mono">{m.erpCode}</span>],
                ['Material', m.material],
                ['Process', m.process],
                ['Heat treatment', m.heatTreatment],
                ['Finish', m.finish],
                ['Net weight', <span key="w" className="mono">{m.weightKg} kg</span>],
                ['HSN', <span key="h" className="mono">{m.hsn}</span>],
                ['Last price', <span key="l" className="sourced" style={{ justifyContent: 'flex-start' }}><span className="mono">{money(m.lastPrice)}</span><SourceTag kind="history" refText="Last PO line" /></span>],
              ]} />
              <div className="label mt-16 mb-8">Price history · 6 months</div>
              <Sparkline data={m.priceTrend} width={400} height={60} />
              {m.singleSource && <div className="mt-12"><Banner tone="warn" icon="alert">Single-source part. Consider a second-source RFQ.</Banner></div>}
              <div className="label mt-16 mb-8">Material Data File</div>
              <table className="dt" style={{ border: '1px solid var(--border)' }}>
                <tbody>
                  <tr><td>MDF v2</td><td className="muted">Drawing rev {m.rev}, TDS, PPAP, MTC set</td><td className="mono small">{date(m.changedAt)}</td></tr>
                  <tr><td>MDF v1</td><td className="muted">Created at award</td><td className="mono small">—</td></tr>
                </tbody>
              </table>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

export function DocsLibrary() {
  const { data, isLoading, error, refetch } = useApi('docs');
  const [pack, setPack] = useState<'all' | 'domestic' | 'export'>('all');
  const exportTypes = ['Shipping bill', 'Bill of lading', 'Certificate of origin'];
  const rows = data?.filter((d) => pack === 'all' || (pack === 'export' ? exportTypes.includes(d.type) : !exportTypes.includes(d.type)));
  return (
    <div className="page">
      <PageHeader
        title="Docs library"
        question="Is every document on file, linked to its PO line, and verified?"
        meta="Every document line links to its PO line (order ontology). Suppliers issue documents; we generate drafts from PO data in your template."
        primary={<button className="btn btn-primary">Export audit bundle</button>}
        secondary={<button className="link">Templates</button>}
      />
      <DataTable<DocRecord>
        id="docs"
        rows={rows}
        loading={isLoading}
        error={error}
        onRetry={() => refetch()}
        rowKey={(d) => d.id}
        toolbar={<Seg options={[{ id: 'all', label: 'All' }, { id: 'domestic', label: 'Domestic pack' }, { id: 'export', label: 'Export pack' }]} value={pack} onChange={setPack} />}
        bulk={(sel, clear) => <button className="link" onClick={clear}>Download {sel.length}</button>}
        empty={{ title: 'No documents yet', body: 'Documents appear here as suppliers upload them against a PO.' }}
        columns={[
          { key: 'id', header: 'Document no.', render: (d) => <span className="mono">{d.id}</span> },
          { key: 'type', header: 'Type' },
          { key: 'poId', header: 'PO', render: (d) => <DocLink id={d.poId} /> },
          { key: 'party', header: 'Issued by' },
          { key: 'source', header: 'Source' },
          { key: 'linked', header: 'PO line link', render: (d) => (d.linked ? <span className="good small strong">Linked · ln 10</span> : <span className="crit small strong">Unlinked</span>) },
          { key: 'issuedAt', header: 'Date', render: (d) => <span className="mono">{dateTime(d.issuedAt)}</span>, sortValue: (d) => d.issuedAt },
          { key: 'status', header: 'Status', render: (d) => <StatusChip status={d.status} />, text: (d) => d.status },
        ]}
      />
    </div>
  );
}
