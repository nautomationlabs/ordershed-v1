import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '@/api/client';
import type { Vendor } from '@/api/types';
import { DataTable } from '@/components/DataTable';
import { Banner, KV, PageHeader, Panel, Seg, TierBadge } from '@/components/primitives';

type Scope = 'yours' | 'network' | 'perf' | 'near';

export function FindVendors() {
  const nav = useNavigate();
  const { data, isLoading, error, refetch } = useApi('vendors');
  const [scope, setScope] = useState<Scope>('network');
  const [invited, setInvited] = useState<string[]>(['VEN-000041', 'VEN-000027', 'VEN-000007']);

  const rows = (data ?? [])
    .filter((v) => v.categories.some((c) => ['Castings', 'Machined parts'].includes(c)))
    .filter((v) => (scope === 'yours' ? !!v.buyerMark : scope === 'perf' ? v.tier === 3 : scope === 'near' ? v.distanceKm <= 150 : true))
    .sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div className="page">
      <PageHeader
        crumbs={[{ label: 'Sourcing' }, { label: 'RFQ-000132 · draft', to: '/b/requests/new' }, { label: 'Find vendors' }]}
        title="Find vendors"
        question="Who can make this gearbox housing, and how sure are we of them?"
        meta="Ranked by similar parts, capability, certificates, OTD / PPM and distance. Rank comes only from how suppliers quote and deliver — never from payment."
        primary={<button className="btn btn-primary" disabled={!invited.length} onClick={() => nav('/b/rfqs/RFQ-000123')}>Send RFQ to {invited.length}</button>}
        secondary={<Link to="/b/requests/new">Back to fields</Link>}
      />
      <div className="md">
        <DataTable<Vendor>
          id="find-vendors"
          rows={rows}
          loading={isLoading}
          error={error}
          onRetry={() => refetch()}
          rowKey={(v) => v.id}
          toolbar={<Seg options={[{ id: 'yours', label: 'Your vendors' }, { id: 'network', label: 'Network' }, { id: 'perf', label: 'Performance-verified' }, { id: 'near', label: 'Within 150 km' }]} value={scope} onChange={setScope} />}
          bulk={(sel, clear) => (
            <button className="link" onClick={() => { setInvited(Array.from(new Set([...invited, ...sel.map((s) => s.id)]))); clear(); }}>
              Add {sel.length} to invite list
            </button>
          )}
          empty={{ title: 'No vendors match', body: 'Widen to Network, or ask ops to source new suppliers for this part family.' }}
          columns={[
            { key: 'name', header: 'Vendor', render: (v) => <span><Link to={`/b/vendors/${v.id}`} onClick={(e) => e.stopPropagation()}>{v.name}</Link>{v.buyerMark && <span className="chip plain tone-good" style={{ marginLeft: 6 }}>{v.buyerMark}</span>}</span> },
            { key: 'city', header: 'City' },
            { key: 'tier', header: 'Verification', render: (v) => <TierBadge tier={v.tier} compact />, sortValue: (v) => v.tier },
            { key: 'matchScore', header: 'Match', num: true, tech: 'Matching score 0–100 · similar parts, capability, certs, OTD/PPM, distance', render: (v) => <span className="row gap-4" style={{ justifyContent: 'flex-end' }}><span className="bar" style={{ width: 48 }}><span style={{ width: `${v.matchScore}%` }} /></span>{v.matchScore}</span> },
            { key: 'similarParts', header: 'Similar parts', num: true, hidden: true },
            { key: 'certs', header: 'Certificates', hidden: true, text: (v) => v.certs.join(', ') || '—' },
            { key: 'otdPct', header: 'OTD', unit: '%', num: true, text: (v) => v.otdPct?.toFixed(1) ?? '—', sortValue: (v) => v.otdPct ?? -1 },
            { key: 'ppm', header: 'PPM', num: true, hidden: true, text: (v) => v.ppm ?? '—', sortValue: (v) => v.ppm ?? 99999 },
            { key: 'distanceKm', header: 'Distance', unit: 'km', num: true, tech: 'Road distance to PNQ-01 Chakan' },
            { key: 'replyHours', header: 'Reply', unit: 'h', num: true, text: (v) => v.replyHours?.toFixed(1) ?? '—', hidden: true },
          ]}
        />
        <div className="detail col gap-12">
          <Panel title="RFQ-000132 · gearbox housing">
            <KV narrow items={[['Part', <span key="p" className="mono">KM-GH-2210 rev C</span>], ['Material', 'EN-GJS-500-7'], ['Annual qty', <span key="q" className="mono">4,800 pcs</span>], ['Quote due', <span key="d" className="mono">28-10-2026 18:00</span>], ['Bidding', 'Sealed · no negotiation in sealed period']]} />
          </Panel>
          <Panel title={`Invite list · ${invited.length}`} tight>
            <ul className="list-plain" style={{ padding: '0 14px' }}>
              {invited.map((id) => {
                const v = data?.find((x) => x.id === id);
                if (!v) return null;
                return (
                  <li key={id}>
                    <TierBadge tier={v.tier} compact />
                    <span>{v.name}</span>
                    <span className="small muted">{v.city}</span>
                    <span className="spacer" />
                    <span className="small muted">WhatsApp</span>
                    <button className="link small link-muted" onClick={() => setInvited(invited.filter((x) => x !== id))}>Remove</button>
                  </li>
                );
              })}
            </ul>
          </Panel>
          <Banner tone="info">Self-declared suppliers can be invited, but their quotes are flagged on Compare until documents are verified.</Banner>
          <Panel title="WhatsApp message suppliers will get">
            <div className="wa" style={{ minHeight: 0, borderRadius: 4 }}>
              <div className="wa-msg">
                <strong>New RFQ · Gearbox housing, SG iron, machined</strong>
                <br />EV drivetrain OEM · Germany. 4,800 pcs/yr, lot 400. Quote by 28 Oct, 18:00.
                <br />Drawing and job pack: <span style={{ color: '#027eb5' }}>os.example/j/7Hq2</span>
                <div className="wa-time">09:14</div>
                <div className="wa-btns"><button>Quote</button><button>Decline</button><button>Ask a question</button></div>
              </div>
            </div>
            <div className="small muted mt-8">Buyer name stays hidden until award.</div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
