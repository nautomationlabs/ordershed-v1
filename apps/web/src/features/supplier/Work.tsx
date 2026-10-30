import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApi } from '@/api/client';
import { fakeHash } from '@/api/mock/data';
import type { OpenItem } from '@/api/types';
import { AiProposal, CheckRow, HashLine } from '@/components/domain';
import { Icon } from '@/components/Icon';
import { BottomSheet } from '@/components/overlays';
import { Banner, Conf, StatusChip } from '@/components/primitives';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/StateViews';
import { due, shortDate } from '@/lib/format';
import { PhoneShell } from '@/shells/PhoneShell';

const KIND_ICON: Record<OpenItem['kind'], string> = { RFQ: 'receipt', Question: 'chat', PO: 'doc', Document: 'upload', Commitment: 'clock' };

export function OpenItems() {
  const nav = useNavigate();
  const { data, isLoading, error, refetch } = useApi('openItems');
  const go = (i: OpenItem) => (i.kind === 'RFQ' ? nav(`/s/quote/${i.rfqId}`) : i.kind === 'Document' ? nav('/s/dispatch/PO-000441') : nav('/s/orders/PO-000441'));
  return (
    <PhoneShell title="Open items" flush right={<Link to="/s/profile" aria-label="Profile"><span className="avatar sm">SM</span></Link>}>
      <div className="p-section row"><span className="label">Needs you</span><span className="spacer" /><span className="mono small muted">{data?.length ?? 0}</span></div>
      {error ? <ErrorState message={error.message} requestId={error.requestId} onRetry={() => refetch()} />
        : isLoading ? <LoadingBlock lines={6} />
        : !data?.length ? <EmptyState title="Nothing open" body="New RFQs arrive on WhatsApp and here. Keep your catalogue current so buyers find you." action={<Link to="/s/catalogue">Update catalogue</Link>} />
        : (
          <div className="p-list">
            {data.map((i) => {
              const d = due(i.due);
              return (
                <button key={i.id} className="p-row" style={{ border: 0, borderBottom: '1px solid var(--border)', textAlign: 'left', width: '100%' }} onClick={() => go(i)}>
                  <span className="muted"><Icon name={KIND_ICON[i.kind]} size={20} /></span>
                  <div className="main-txt">
                    <div className="row gap-4"><span className="label" style={{ fontSize: 10 }}>{i.kind}</span>{i.rfqId && <span className="mono small faint">{i.rfqId}</span>}</div>
                    <div className="t ellipsis">{i.title}</div>
                    <div className="s ellipsis">{i.buyerType} · {i.detail}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className={`small strong ${d.tone}`}>{d.text}</div>
                    <div className="mono small faint">{shortDate(i.due)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
    </PhoneShell>
  );
}

export function QuoteScreen() {
  const { id = 'RFQ-000128' } = useParams();
  const [params] = useSearchParams();
  const [decline, setDecline] = useState(params.get('sheet') === 'decline');
  const [voice, setVoice] = useState(params.get('voice') === '1');
  const [submitted, setSubmitted] = useState(params.get('done') === '1');
  const [reason, setReason] = useState('Capacity full');

  if (submitted) {
    return (
      <PhoneShell title="Quote sealed" back="/s/open">
        <div className="p-card" style={{ borderColor: 'var(--good)', background: 'var(--good-tint)' }}>
          <div className="row"><span className="good"><Icon name="check" size={18} /></span><span className="strong">Quote Q-000431 submitted</span></div>
          <p className="small mt-8">Sealed until 24 Oct, 18:00. Nobody, including us, can see prices before then. You can revise until the deadline.</p>
        </div>
        <div className="mt-12"><HashLine hash={fakeHash('Q-000431')} label="Sealed" /></div>
        <div className="mt-16 small muted">The buyer may ask questions; answers come on WhatsApp. No price negotiation during the sealed period.</div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell
      title="Quote"
      back="/s/open"
      cta={
        <div className="col gap-8">
          <button className="btn btn-primary btn-lg btn-block" onClick={() => setSubmitted(true)}>Submit sealed quote</button>
          <div className="row" style={{ justifyContent: 'center', gap: 24 }}>
            <button className="link" onClick={() => setVoice(true)}><Icon name="mic" size={14} /> Quote by voice</button>
            <button className="link link-muted" onClick={() => setDecline(true)}>Decline</button>
          </div>
        </div>
      }
    >
      <div className="row gap-4"><span className="mono small muted">{id}</span><StatusChip status="Open" /><span className="spacer" /><span className="small warn strong">due in 3 d</span></div>
      <h2 style={{ fontSize: 18, marginTop: 6 }}>Pump casing, volute · FG260</h2>
      <div className="small muted">Pump OEM · Germany · 1,200 pcs/yr · lot 200 · FCA Chennai</div>
      <div className="row mt-8 gap-16 small">
        <Link to="/s/web/jobs/RFQ-000128">Drawing & job pack</Link>
        <button className="link">Ask a question</button>
      </div>
      <hr className="divider" />
      {voice && (
        <div className="mb-16">
          <AiProposal title="From your voice note (Tamil, 0:42)" confidence={0.88} approveLabel="Confirm" sources={['Voice note 21-10 09:31 · Sarvam ASR']}>
            <div className="small">Unit price <span className="mono strong">₹ 2,380</span> · tooling <span className="mono strong">₹ 1,60,000</span> · lead time <span className="mono strong">35 days</span> · MOQ <span className="mono strong">200</span> · valid <span className="mono strong">60 days</span></div>
          </AiProposal>
        </div>
      )}
      <div className="col gap-12">
        {[
          { l: 'Unit price, ex-works', a: '₹', v: '2,380.00', b: 'per pc' },
          { l: 'Tooling (one-time)', a: '₹', v: '1,60,000', b: '' },
          { l: 'Lead time', a: '', v: '35', b: 'days' },
          { l: 'Minimum order', a: '', v: '200', b: 'pcs' },
          { l: 'Quote valid for', a: '', v: '60', b: 'days' },
        ].map((f) => (
          <label key={f.l} className="field">
            <span className="label">{f.l}</span>
            <div className="input-affix">
              {f.a && <span className="affix">{f.a}</span>}
              <input className="input input-lg mono" defaultValue={f.v} inputMode="decimal" />
              {f.b && <span className="affix">{f.b}</span>}
            </div>
          </label>
        ))}
        <label className="field">
          <span className="label row gap-4"><Icon name="lock" size={12} /> Floor price (private)</span>
          <div className="input-affix"><span className="affix">₹</span><input className="input input-lg mono" placeholder="Optional" inputMode="decimal" /></div>
          <span className="hint">Only you see this. Never shown to buyers or used for ranking.</span>
        </label>
        <label className="field">
          <span className="label">Deviations or exclusions</span>
          <textarea className="textarea" placeholder="e.g. hydro test at buyer's cost" />
        </label>
        <div className="small muted">By quoting you accept the buyer's GCP v3 and SCP v2.</div>
      </div>
      <BottomSheet open={decline} onClose={() => setDecline(false)} title="Decline this RFQ?">
        <p className="small muted mb-12">The buyer sees only the reason. Declining does not affect your rank.</p>
        <div className="col gap-8">
          {['Capacity full', 'Not our process', 'Quantity too low', 'Material not available', 'Other'].map((r) => (
            <button key={r} className={`opt${reason === r ? ' on' : ''}`} onClick={() => setReason(r)}>{r}</button>
          ))}
        </div>
        <button className="btn btn-primary btn-lg btn-block mt-16" onClick={() => setDecline(false)}>Decline RFQ</button>
      </BottomSheet>
    </PhoneShell>
  );
}

export function Catalogue() {
  const { data, isLoading } = useApi('catalogue');
  const proposed = (data ?? []).filter((r) => r.state === 'Proposed');
  return (
    <PhoneShell title="Catalogue" flush>
      <div style={{ padding: 16 }}>
        <div className="row gap-8">
          <button className="btn btn-lg" style={{ flex: 1 }}><Icon name="upload" /> PDF or Excel</button>
          <button className="btn btn-lg" style={{ flex: 1 }}><Icon name="camera" /> Photo</button>
        </div>
        {proposed.length > 0 && (
          <div className="mt-12">
            <Banner tone="info">{proposed.length} products read from <span className="mono">SMC-catalogue-2026.pdf</span>. Check and approve; nothing goes live without you.</Banner>
          </div>
        )}
      </div>
      {isLoading ? <LoadingBlock /> : (
        <div className="p-list" style={{ borderTop: '1px solid var(--border)' }}>
          {(data ?? []).map((r) => (
            <div key={r.id} className="p-row" style={{ alignItems: 'flex-start', background: r.state === 'Proposed' ? '#fafcff' : undefined }}>
              <div className="main-txt">
                <div className="row gap-4">
                  <span className="t">{r.name}</span>
                  {r.state === 'Proposed' ? <span className="chip plain tone-accent">Proposed</span> : <span className="chip tone-good">Live</span>}
                  {r.confidence !== undefined && <Conf value={r.confidence} />}
                </div>
                <div className="s">{r.material} · {r.process}</div>
                <div className="s mono">HSN {r.hsn} · {r.sizeRange} · MOQ {r.moq}</div>
                {r.state === 'Proposed' && (
                  <div className="row mt-8 gap-16"><button className="link">Approve</button><button className="link link-muted">Edit</button></div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PhoneShell>
  );
}

const S_ORDERS = [
  { id: 'PO-000462', part: 'Gearbox housing, machined', buyer: 'Kestrel Motion GmbH', status: 'Awaiting ack' as const, next: 'Acknowledge PO', due: '2026-10-22T18:00:00+05:30' },
  { id: 'PO-000441', part: 'Pump casing, volute', buyer: 'Kestrel Motion GmbH', status: 'Held' as const, next: 'Debit note for 48 pcs', due: '2026-10-23T18:00:00+05:30' },
  { id: 'PO-000437', part: 'Bearing housing', buyer: 'Aravali EPC Projects', status: 'In production' as const, next: 'Dispatch 24 Oct', due: '2026-10-24T18:00:00+05:30' },
  { id: 'PO-000420', part: 'Counterweight', buyer: 'Aravali EPC Projects', status: 'Paid' as const, next: '—', due: '2026-10-01T18:00:00+05:30' },
];

export function SupplierOrders() {
  return (
    <PhoneShell title="Orders" flush>
      <div className="p-list">
        {S_ORDERS.map((o) => (
          <Link key={o.id} to={o.status === 'In production' ? `/s/dispatch/${o.id}` : `/s/orders/${o.id}`} className="p-row">
            <div className="main-txt">
              <div className="row gap-4"><span className="mono small">{o.id}</span><StatusChip status={o.status} /></div>
              <div className="t ellipsis">{o.part}</div>
              <div className="s ellipsis">{o.buyer} · {o.next}</div>
            </div>
            <Icon name="chevronRight" />
          </Link>
        ))}
      </div>
    </PhoneShell>
  );
}

export function OrderChat() {
  const { id = 'PO-000441' } = useParams();
  return (
    <PhoneShell
      title={id}
      back="/s/orders"
      cta={
        <div className="col gap-8">
          <div className="row gap-8">
            <button className="btn btn-lg" style={{ flex: 1 }}>Raise an issue</button>
            <button className="btn btn-primary btn-lg" style={{ flex: 1 }}>Accept debit note</button>
          </div>
          <div className="input-affix"><input className="input input-lg" placeholder="Message buyer" /><span className="affix"><Icon name="mic" /></span></div>
        </div>
      }
    >
      <div className="p-card mb-12">
        <div className="row"><span className="strong">Pump casing, volute</span><span className="spacer" /><StatusChip status="Held" /></div>
        <div className="small muted">Kestrel Motion GmbH · 800 pcs · ₹ 2,460.00 / pc</div>
        <div className="small mt-4">Payment held: invoiced 800, accepted 752.</div>
      </div>
      <div className="chat">
        <div className="bubble sys">20 Sep · GRN-000781 posted · 776 received, 752 accepted</div>
        <div className="bubble">
          <div className="who">Priya Nair · Finance · Kestrel Motion</div>
          24 pcs were short against the ASN and 24 were rejected for blow holes on the flange face. Debit note DN-000031 for 48 pcs is attached.
          <div className="time">15-10 11:22</div>
        </div>
        <div className="bubble">
          <div className="who">DN-000031.pdf · ₹ 1,18,080.00 + GST</div>
          <span className="link">Open document</span>
        </div>
        <div className="bubble me">
          <div className="who">You · voice note, transcribed</div>
          We will replace the 24 rejected pieces in the next lot. Can the short 24 be checked again at stores?
          <div className="time">15-10 18:40</div>
        </div>
        <div className="bubble sys">Ops joined · D. Menon</div>
      </div>
    </PhoneShell>
  );
}

export function Dispatch() {
  const { id = 'PO-000437' } = useParams();
  const [fixed, setFixed] = useState(false);
  return (
    <PhoneShell
      title="Dispatch check"
      back="/s/orders"
      cta={fixed ? <button className="btn btn-primary btn-lg btn-block">Mark shipped</button> : <button className="btn btn-primary btn-lg btn-block" onClick={() => setFixed(true)}>Fix and resend</button>}
    >
      <div className="small muted">{id} · Bearing housing · 1,000 pcs</div>
      <h2 style={{ fontSize: 18, marginTop: 4 }}>{fixed ? 'All 6 checks passed' : '1 of 6 checks failed'}</h2>
      <p className="small muted mt-4">We compare your invoice, packing list and e-way bill with the PO before you can mark Shipped.</p>
      <div className="row gap-8 mt-12">
        <div className="p-card" style={{ flex: 1, padding: 10 }}><div className="label">Invoice</div><div className="mono small">SMC/0431/26</div></div>
        <div className="p-card" style={{ flex: 1, padding: 10 }}><div className="label">Packing list</div><div className="mono small">photo · 1 page</div></div>
        <div className="p-card" style={{ flex: 1, padding: 10 }}><div className="label">E-way bill</div><div className="mono small">3310 8862 0127</div></div>
      </div>
      <div className="checks mt-12">
        <CheckRow state="pass" label="Quantity" detail="1,000 pcs = PO line 10" />
        <CheckRow state={fixed ? 'pass' : 'fail'} label="HSN" detail={fixed ? '8483.30 = PO' : 'Invoice 8483.90 · PO 8483.30'} />
        <CheckRow state="pass" label="Buyer GSTIN" detail="27AAICA2210B1ZX" />
        <CheckRow state="pass" label="Invoice value" detail="₹ 9,44,000.00 + GST = PO" />
        <CheckRow state="pass" label="Incoterm" detail="EXW Hosur" />
        <CheckRow state="pass" label="Consignee" detail="Aravali EPC, Bhosari, Pune" />
      </div>
      {!fixed && <div className="mt-12"><Banner tone="crit" icon="alert">Change HSN on the invoice to 8483.30, then take a new photo or upload the corrected PDF.</Banner></div>}
    </PhoneShell>
  );
}

export function WhatsAppPreview() {
  return (
    <PhoneShell title="WhatsApp · Ordershed" back="/s/profile" tabs={false} flush>
      <div className="wa">
        <div className="wa-day">Today</div>
        <div className="wa-msg out">JOIN<div className="wa-time">09:02 ✓✓</div></div>
        <div className="wa-msg">Welcome to Ordershed. Your GSTIN 33ABKFS4821M1Z6 is verified: <strong>Sri Murugan Castings, Hosur</strong>. You will get RFQs here.<div className="wa-time">09:02</div><div className="wa-btns"><button>Finish profile</button></div></div>
        <div className="wa-msg"><strong>New RFQ · Pump casing, volute · FG260</strong><br />Pump OEM · Germany. 1,200 pcs/yr, lot 200. Quote by 24 Oct, 18:00.<div className="wa-time">09:14</div><div className="wa-btns"><button>Quote</button><button>Decline</button><button>Ask a question</button></div></div>
        <div className="wa-msg out"><span className="row gap-4"><Icon name="mic" size={14} /> Voice note · 0:42 (Tamil)</span><div className="wa-time">09:31 ✓✓</div></div>
        <div className="wa-msg"><strong>Please confirm your quote</strong><br />Unit price ₹ 2,380 · Tooling ₹ 1,60,000 · Lead 35 days · MOQ 200 · Valid 60 days<div className="wa-time">09:31</div><div className="wa-btns"><button>Confirm</button><button>Edit</button></div></div>
        <div className="wa-msg out">Confirm<div className="wa-time">09:32 ✓✓</div></div>
        <div className="wa-msg">Quote Q-000431 sealed until 24 Oct 18:00. Ref sha256:3f9a…c1e2<div className="wa-time">09:32</div></div>
        <div className="wa-msg"><strong>Cross-check · PO-000437</strong><br />HSN on invoice is 8483.90; PO says 8483.30.<div className="wa-time">10:05</div><div className="wa-btns"><button>Fix and resend</button><button>Talk to ops</button></div></div>
      </div>
    </PhoneShell>
  );
}
