import { Banner, KV, PageHeader, Panel, StatusChip } from '@/components/primitives';
import { Icon } from '@/components/Icon';

const LOTS = [
  { lot: 'Lot 1', part: 'Steering knuckle forging · KM-SK-1180', qty: '9,600 pcs', bidders: 5, leader: 'Rank 1 held 4 min', ext: 2, status: 'Live' as const },
  { lot: 'Lot 2', part: 'Lower control arm bracket · KM-LA-0410', qty: '9,600 pcs', bidders: 4, leader: 'Rank 1 held 11 min', ext: 0, status: 'Live' as const },
  { lot: 'Lot 3', part: 'Hub flange · KM-HF-0220', qty: '19,200 pcs', bidders: 3, leader: '—', ext: 0, status: 'Scheduled' as const },
];

export function Auctions() {
  return (
    <div className="page">
      <PageHeader
        title="Reverse auction"
        docNo="AUC-000004 · RFQ-000122"
        status="Live"
        question="Is the auction running fairly, and does anything need a pause?"
        meta="Rank-only visibility for suppliers. Auto-extends 3 min when rank 1 changes in the last 2 min."
        primary={<button className="btn btn-primary" disabled>End auction</button>}
        secondary={<><button className="link">Pause</button><button className="link">Message all bidders</button></>}
      />
      <div className="mb-12"><Banner tone="info" icon="info">Phase 2 feature. This screen is designed and wired to sandbox data; live bidding ships after the Phase 2 gate (5 paying buyers).</Banner></div>
      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', alignItems: 'start' }}>
        <Panel title="Lots" tight>
          <table className="dt">
            <thead><tr><th>Lot</th><th>Part</th><th className="num">Qty</th><th className="num">Bidders</th><th>Leader</th><th className="num">Extensions</th><th>Status</th></tr></thead>
            <tbody>
              {LOTS.map((l) => (
                <tr key={l.lot}><td className="mono">{l.lot}</td><td>{l.part}</td><td className="num">{l.qty}</td><td className="num">{l.bidders}</td><td className="muted">{l.leader}</td><td className="num">{l.ext}</td><td><StatusChip status={l.status} /></td></tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <div className="col gap-16">
          <Panel title="Time remaining · Lot 1">
            <div className="row" style={{ alignItems: 'baseline' }}>
              <span className="mono" style={{ fontSize: 34, letterSpacing: '-0.02em' }}>00:07:42</span>
              <span className="small muted">ends 11:42 IST · +2 extensions</span>
            </div>
            <div className="progress mt-8"><span style={{ width: '74%' }} /></div>
            <div className="row mt-12 gap-16 small">
              <button className="link row gap-4"><Icon name="pause" size={12} /> Pause lot</button>
              <button className="link link-muted">Extend 5 min</button>
            </div>
          </Panel>
          <Panel title="Rules">
            <KV narrow items={[['Visibility', 'Rank only'], ['Start price', 'Lowest sealed normalised quote'], ['Decrement', 'Min 0.5%'], ['Extension', '3 min if rank 1 changes in last 2 min'], ['Award', 'Not automatic; decision pack + DoA']]} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
