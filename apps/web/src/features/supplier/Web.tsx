import type { ReactNode } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { SUPPLIER_ME } from '@/api/mock/data';
import { HashLine } from '@/components/domain';
import { Icon } from '@/components/Icon';
import { Banner, KV, PageHeader, Panel, StatusChip, TierBadge } from '@/components/primitives';
import { BRAND } from '@/config/brand';
import { DrawingSvg } from '../buyer/DrawingSvg';
import { fakeHash } from '@/api/mock/data';

/** Laptop view for suppliers who prefer a bigger screen. Same data and actions as the phone app. */
function SupplierWeb({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <header className="topbar" style={{ height: 48, padding: '0 24px', gap: 24 }}>
        <span className="row"><span className="brand" style={{ border: 0, width: 'auto', padding: 0 }}><span className="mark"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 2h10v2H1zM1 5h7v2H1zM1 8h10v2H1z" fill="#fff" /></svg></span><span className="word">{BRAND.name}</span><span className="ctx">Supplier</span></span></span>
        <nav className="row gap-16">
          <NavLink to="/s/web/jobs" className={({ isActive }) => (isActive ? 'strong' : 'muted')} end>Job board</NavLink>
          <NavLink to="/s/web/work" className={({ isActive }) => (isActive ? 'strong' : 'muted')}>My work</NavLink>
          <Link to="/s/catalogue" className="muted">Catalogue</Link>
          <Link to="/s/profile" className="muted">Profile</Link>
        </nav>
        <span className="spacer" />
        <TierBadge tier={SUPPLIER_ME.tier} />
        <div className="userchip"><span className="avatar">SM</span><div><div className="nm">{SUPPLIER_ME.org}</div><div className="rl">{SUPPLIER_ME.owner} · Owner</div></div></div>
      </header>
      <div className="page" style={{ maxWidth: 1280, margin: '0 auto' }}>{children}</div>
    </div>
  );
}

const JOBS = [
  { id: 'RFQ-000128', part: 'Pump casing, volute', mat: 'EN-GJL-260', proc: 'Sand casting + machining', qty: '1,200 / yr', buyer: 'Pump OEM · Germany', due: '24-10-2026', fit: 'Strong', status: 'Open' as const },
  { id: 'RFQ-000129', part: 'Bearing cap, machined', mat: 'EN-GJS-450-10', proc: 'SG casting + CNC', qty: '3,000 / yr', buyer: 'Valve maker · USA', due: '27-10-2026', fit: 'Strong', status: 'Open' as const },
  { id: 'RFQ-000130', part: 'Motor flange', mat: 'EN AC-46000', proc: 'HPDC + machining', qty: '6,000 / yr', buyer: 'LV maker · UK', due: '29-10-2026', fit: 'Partial', status: 'Open' as const },
  { id: 'RFQ-000123', part: 'Gearbox housing, machined', mat: 'EN-GJS-500-7', proc: 'SG casting + CNC', qty: '4,800 / yr', buyer: 'EV drivetrain OEM · Germany', due: '20-10-2026', fit: 'Strong', status: 'Submitted' as const },
];

export function JobBoard() {
  return (
    <SupplierWeb>
      <PageHeader title="Job board" question="Which RFQs fit my shop, and which should I quote first?" meta="Only RFQs you were invited to or that match your capabilities. Buyer names are hidden until award." primary={<Link to="/s/web/jobs/RFQ-000128" className="btn btn-primary">Quote RFQ-000128</Link>} />
      <Panel tight>
        <table className="dt">
          <thead><tr><th>RFQ</th><th>Part</th><th>Material</th><th>Process</th><th className="num">Qty</th><th>Buyer</th><th>Quote by</th><th>Fit</th><th>Status</th></tr></thead>
          <tbody>{JOBS.map((j) => (
            <tr key={j.id} className="clickable"><td><Link to={`/s/web/jobs/${j.id}`} className="mono">{j.id}</Link></td><td>{j.part}</td><td>{j.mat}</td><td className="muted">{j.proc}</td><td className="num">{j.qty}</td><td>{j.buyer}</td><td className="mono">{j.due}</td><td className={j.fit === 'Strong' ? 'good strong small' : 'warn strong small'}>{j.fit}</td><td><StatusChip status={j.status} /></td></tr>
          ))}</tbody>
        </table>
      </Panel>
    </SupplierWeb>
  );
}

export function JobPack() {
  const { id = 'RFQ-000128' } = useParams();
  return (
    <SupplierWeb>
      <PageHeader crumbs={[{ label: 'Job board', to: '/s/web/jobs' }, { label: id }]} title="Pump casing, volute" docNo={id} status="Open" meta="Pump OEM · Germany · quote by 24-10-2026 18:00 IST · sealed bidding" primary={<button className="btn btn-primary">Submit sealed quote</button>} secondary={<><button className="link">Ask a question</button><button className="link link-muted">Decline</button></>} />
      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', alignItems: 'start' }}>
        <Panel title="Drawing · watermarked" tight actions={<button className="link small"><Icon name="download" size={12} /> Job pack (ZIP)</button>}>
          <div className="drawing" style={{ border: 0 }}><DrawingSvg /></div>
        </Panel>
        <div className="col gap-16">
          <Panel title="What the buyer needs">
            <KV narrow items={[['Material', 'EN-GJL-260'], ['Process', 'Sand casting + machining'], ['Annual qty', <span key="q" className="mono">1,200 pcs</span>], ['Lot', <span key="l" className="mono">200 pcs</span>], ['Inspection', 'CMM on FAI · MTC 3.1 per heat'], ['Incoterm', 'FCA Chennai'], ['Terms', 'GCP v3 · SCP v2']]} />
          </Panel>
          <Panel title="Your quote">
            <div className="grid-2" style={{ gap: 10 }}>
              {[['Unit price, EXW', '₹', '2,380.00'], ['Tooling', '₹', '1,60,000'], ['Lead time', 'days', '35'], ['MOQ', 'pcs', '200'], ['Validity', 'days', '60']].map(([l, u, v]) => (
                <label key={l} className="field"><span className="label">{l}</span><div className="input-affix"><input className="input mono" defaultValue={v} /><span className="affix">{u}</span></div></label>
              ))}
              <label className="field"><span className="label">Floor price (private)</span><div className="input-affix"><input className="input mono" placeholder="Optional" /><span className="affix">₹</span></div></label>
            </div>
            <div className="mt-12"><Banner tone="info" icon="lock">Your quote is hashed when you submit. Nobody sees prices before the deadline.</Banner></div>
          </Panel>
        </div>
      </div>
    </SupplierWeb>
  );
}

const WORK: Record<string, { id: string; t: string; s: string; due: string }[]> = {
  'To quote': [{ id: 'RFQ-000128', t: 'Pump casing, volute', s: 'Pump OEM · DE', due: '24-10' }, { id: 'RFQ-000129', t: 'Bearing cap', s: 'Valve maker · US', due: '27-10' }],
  Quoted: [{ id: 'RFQ-000123', t: 'Gearbox housing', s: 'sealed · result after award', due: '—' }],
  'In production': [{ id: 'PO-000437', t: 'Bearing housing · 1,000 pcs', s: 'Aravali EPC', due: '24-10' }, { id: 'PO-000462', t: 'Gearbox housing · samples', s: 'Kestrel Motion', due: '18-11' }],
  'To dispatch / documents': [{ id: 'PO-000441', t: 'MTC 3.1 heat H-0912', s: 'Kestrel Motion', due: '22-10' }],
};

export function MyWork() {
  return (
    <SupplierWeb>
      <PageHeader title="My work" question="What do I owe whom, and by when?" primary={<button className="btn btn-primary">Upload document</button>} secondary={<button className="link">List view</button>} />
      <div className="board">
        {Object.entries(WORK).map(([lane, items]) => (
          <div className="lane" key={lane}>
            <div className="lane-head"><span className="label" style={{ color: 'var(--ink)' }}>{lane}</span><span className="mono small muted">{items.length}</span></div>
            {items.map((i) => (
              <div className="ccard" key={i.id}>
                <div className="row"><span className="mono small" style={{ color: 'var(--accent)' }}>{i.id}</span><span className="spacer" /><span className="mono small muted">{i.due}</span></div>
                <div className="item">{i.t}</div>
                <div className="meta">{i.s}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-16"><HashLine hash={fakeHash('Q-000418')} label="Last sealed quote Q-000418" at="18-10-2026 19:42" /></div>
    </SupplierWeb>
  );
}
