import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { actions, ApiError, isLive, type GstRecord } from '@/api/client';
import { SUPPLIER_ME } from '@/api/mock/data';
import { CheckRow } from '@/components/domain';
import { Icon } from '@/components/Icon';
import { Banner, TierBadge } from '@/components/primitives';
import { BRAND } from '@/config/brand';
import { PhoneShell } from '@/shells/PhoneShell';

const LANGS = ['English', 'தமிழ்', 'हिन्दी', 'ಕನ್ನಡ', 'తెలుగు'];
const LANG_CODE: Record<string, string> = { English: 'en', 'தமிழ்': 'ta', 'हिन्दी': 'hi', 'ಕನ್ನಡ': 'kn', 'తెలుగు': 'te' };
const TYPES = ['Foundry', 'Forging', 'Machining', 'Fabrication', 'Valves & pumps', 'Rubber & polymer', 'T&D hardware', 'Tool room', 'Trader'];

export function Join() {
  return isLive('join') ? <JoinLive /> : <JoinSandbox />;
}

/** Join against the backend: GST lookup → WhatsApp code → business types → supplier org + verification case. */
function JoinLive() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState('English');
  const [gstin, setGstin] = useState('');
  const [gst, setGst] = useState<GstRecord | null>(null);
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState<{ applicationId: string; sentTo: string } | null>(null);
  const [code, setCode] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [joined, setJoined] = useState<{ org: { number: string; name: string }; verification: { number: string } } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const fetchGst = () => run(async () => setGst(await actions.joinLookup(gstin)));
  const sendCode = () => run(async () => setSent(await actions.joinStart(gst!.gstin, phone)));
  const finish = () =>
    run(async () => {
      try {
        setJoined(await actions.joinVerify({ applicationId: sent!.applicationId, code, businessTypes: types, language: LANG_CODE[lang] }));
        setStep(3);
      } catch (e) {
        if (e instanceof ApiError && e.code.startsWith('code_')) setStep(1);   // wrong or expired code: back to the code field
        throw e;
      }
    });

  const canJoin = gst && gst.status === 'Active' && !gst.alreadyRegistered;
  const btn = (label: string, onClick: () => void, disabled = false) => (
    <button className="btn btn-primary btn-lg btn-block" onClick={onClick} disabled={busy || disabled}>{busy ? 'Please wait…' : label}</button>
  );
  const cta =
    step === 0 ? (gst ? btn('This is my business', () => setStep(1), !canJoin) : btn('Fetch from GST', fetchGst, gstin.trim().length < 15))
    : step === 1 ? (sent ? btn('Continue', () => setStep(2), code.trim().length !== 6) : btn('Send code on WhatsApp', sendCode, phone.trim().length < 10))
    : step === 2 ? btn('Join', finish)
    : btn('See open items', () => nav('/s/open'));

  return (
    <PhoneShell
      title="Join"
      tabs={false}
      cta={cta}
      right={
        <select className="select" style={{ width: 'auto', height: 32, fontSize: 13 }} value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
          {LANGS.map((l) => <option key={l}>{l}</option>)}
        </select>
      }
    >
      <div className="progress mb-16"><span style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
      {err && <div className="mb-12"><Banner tone="crit">{err}</Banner></div>}
      {step === 0 && (
        <div className="col gap-16">
          <div>
            <h2 style={{ fontSize: 20 }}>Get engineering RFQs from verified buyers</h2>
            <p className="muted mt-4">Free for suppliers, always. We never sell your rank or your contacts.</p>
          </div>
          <label className="field">
            <span className="label">GSTIN</span>
            <input className="input input-lg mono" value={gstin} onChange={(e) => { setGstin(e.target.value.toUpperCase()); setGst(null); }} maxLength={15} inputMode="text" autoCapitalize="characters" placeholder="15 characters from your GST certificate" />
          </label>
          {gst && (
            <div className="p-card">
              <div className="label mb-8">Fetched from GST</div>
              <div className="strong" style={{ fontSize: 15 }}>{gst.legalName}</div>
              <div className="small muted">{[gst.tradeName && `Trade name: ${gst.tradeName}`, gst.constitution].filter(Boolean).join(' · ')}</div>
              {gst.address && <div className="small mt-8">{gst.address}</div>}
              <hr className="divider" />
              <div className="checks">
                <CheckRow state={gst.status === 'Active' ? 'pass' : 'fail'} label={`GST status ${gst.status ?? 'unknown'}`} detail={gst.registeredOn ? `Registered ${gst.registeredOn.split('-').reverse().join('-')}` : undefined} />
                <CheckRow state={gst.alreadyRegistered ? 'warn' : 'pass'} label={gst.alreadyRegistered ? 'Already on Ordershed' : 'Not yet on Ordershed'} />
              </div>
              {gst.alreadyRegistered && <div className="small mt-8">This business has joined. <Link to="/login">Sign in</Link> with the WhatsApp number used to join.</div>}
            </div>
          )}
          <div className="small muted">
            Prefer WhatsApp? Send <span className="mono strong">JOIN</span> to <span className="mono">{BRAND.whatsappNumber}</span>.
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="col gap-16">
          <h2 style={{ fontSize: 20 }}>Your WhatsApp number</h2>
          <p className="muted">RFQs, questions and POs come here. One message, one ask.</p>
          <label className="field">
            <span className="label">Mobile</span>
            <div className="input-affix"><span className="affix">+91</span><input className="input input-lg mono" value={phone} onChange={(e) => { setPhone(e.target.value); setSent(null); }} inputMode="tel" placeholder="98430 21877" /></div>
          </label>
          {sent && (
            <label className="field">
              <span className="label">Code sent on WhatsApp</span>
              <input className="input input-lg mono" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" style={{ letterSpacing: '0.3em' }} autoFocus />
              <span className="hint">Sent to {sent.sentTo}. Valid for 10 minutes. <button className="link" onClick={sendCode} disabled={busy}>Send again</button></span>
            </label>
          )}
        </div>
      )}
      {step === 2 && (
        <div className="col gap-16">
          <h2 style={{ fontSize: 20 }}>What do you make?</h2>
          <p className="muted">Pick all that fit. You can add products and photos later.</p>
          <div className="chips-sel">
            {TYPES.map((t) => (
              <button key={t} className={`chip-sel${types.includes(t) ? ' on' : ''}`} onClick={() => setTypes(types.includes(t) ? types.filter((x) => x !== t) : [...types, t])}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
      {step === 3 && joined && (
        <div className="col gap-16">
          <div className="p-card" style={{ borderColor: 'var(--good)', background: 'var(--good-tint)' }}>
            <div className="row"><span className="good"><Icon name="check" size={18} /></span><h2 style={{ fontSize: 18 }}>You are in</h2></div>
            <p className="mt-8">{joined.org.name} joined as <span className="mono">{joined.org.number}</span>.</p>
          </div>
          <div className="row"><span className="label">Verification</span><span className="spacer" /><TierBadge tier={0} /></div>
          <Banner tone="info">Our team is checking your GST record (case <span className="mono">{joined.verification.number}</span>). Next tier: Document-verified. Buyers see your tier; it never changes your rank.</Banner>
        </div>
      )}
    </PhoneShell>
  );
}

function JoinSandbox() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [step, setStep] = useState(Number(params.get('step') ?? 0));
  const [types, setTypes] = useState<string[]>(['Foundry', 'Machining']);
  const [lang, setLang] = useState('English');

  const progress = ((step + 1) / 4) * 100;
  const cta =
    step === 0 ? <button className="btn btn-primary btn-lg btn-block" onClick={() => setStep(1)}>This is my business</button>
    : step === 1 ? <button className="btn btn-primary btn-lg btn-block" onClick={() => setStep(2)}>Verify on WhatsApp</button>
    : step === 2 ? <button className="btn btn-primary btn-lg btn-block" onClick={() => setStep(3)}>Continue</button>
    : <button className="btn btn-primary btn-lg btn-block" onClick={() => nav('/s/open')}>See open items</button>;

  return (
    <PhoneShell
      title="Join"
      tabs={false}
      cta={cta}
      right={
        <select className="select" style={{ width: 'auto', height: 32, fontSize: 13 }} value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
          {LANGS.map((l) => <option key={l}>{l}</option>)}
        </select>
      }
    >
      <div className="progress mb-16"><span style={{ width: `${progress}%` }} /></div>
      {step === 0 && (
        <div className="col gap-16">
          <div>
            <h2 style={{ fontSize: 20 }}>Get engineering RFQs from verified buyers</h2>
            <p className="muted mt-4">Free for suppliers, always. We never sell your rank or your contacts.</p>
          </div>
          <label className="field">
            <span className="label">GSTIN</span>
            <input className="input input-lg mono" defaultValue={SUPPLIER_ME.gstin} inputMode="text" autoCapitalize="characters" />
          </label>
          <div className="p-card">
            <div className="label mb-8">Fetched from GST</div>
            <div className="strong" style={{ fontSize: 15 }}>SRI MURUGAN CASTINGS</div>
            <div className="small muted">Trade name: Sri Murugan Castings · Partnership</div>
            <div className="small mt-8">Plot 41, SIPCOT Phase II, Hosur, Krishnagiri, Tamil Nadu 635109</div>
            <hr className="divider" />
            <div className="checks">
              <CheckRow state="pass" label="GST status Active" detail="Registered 14-06-2017" />
              <CheckRow state="pass" label="PAN matches legal name" />
              <CheckRow state="pass" label="Not on block list" />
            </div>
          </div>
          <div className="small muted">
            Prefer WhatsApp? Send <span className="mono strong">JOIN</span> to <span className="mono">{BRAND.whatsappNumber}</span>.
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="col gap-16">
          <h2 style={{ fontSize: 20 }}>Your WhatsApp number</h2>
          <p className="muted">RFQs, questions and POs come here. One message, one ask.</p>
          <label className="field">
            <span className="label">Mobile</span>
            <div className="input-affix"><span className="affix">+91</span><input className="input input-lg mono" defaultValue="98430 21877" inputMode="tel" /></div>
          </label>
          <label className="field">
            <span className="label">Code sent on WhatsApp</span>
            <input className="input input-lg mono" defaultValue="4 8 1 9 0 2" inputMode="numeric" style={{ letterSpacing: '0.3em' }} />
            <span className="hint">Resend in 0:24</span>
          </label>
        </div>
      )}
      {step === 2 && (
        <div className="col gap-16">
          <h2 style={{ fontSize: 20 }}>What do you make?</h2>
          <p className="muted">Pick all that fit. You can add products and photos later.</p>
          <div className="chips-sel">
            {TYPES.map((t) => (
              <button key={t} className={`chip-sel${types.includes(t) ? ' on' : ''}`} onClick={() => setTypes(types.includes(t) ? types.filter((x) => x !== t) : [...types, t])}>
                {t}
              </button>
            ))}
          </div>
          <label className="field">
            <span className="label">Website or catalogue (optional)</span>
            <input className="input input-lg" placeholder="www.example.in or upload a PDF later" />
          </label>
        </div>
      )}
      {step === 3 && (
        <div className="col gap-16">
          <div className="p-card" style={{ borderColor: 'var(--good)', background: 'var(--good-tint)' }}>
            <div className="row"><span className="good"><Icon name="check" size={18} /></span><h2 style={{ fontSize: 18 }}>You are in</h2></div>
            <p className="mt-8">Sri Murugan Castings is approved to receive RFQs. Approved on <span className="mono">18-10-2026</span>.</p>
          </div>
          <div className="row"><span className="label">Verification</span><span className="spacer" /><TierBadge tier={1} /></div>
          <Banner tone="info">Next tier: a site visit or a 10-minute video walk-through. Buyers see your tier; it never changes your rank.</Banner>
          <Link to="/s/profile" className="p-row" style={{ border: '1px solid var(--border)', borderRadius: 4 }}>
            <div className="main-txt"><div className="t">Finish your profile</div><div className="s">4 of 6 done · takes 10 minutes</div></div>
            <Icon name="chevronRight" />
          </Link>
        </div>
      )}
    </PhoneShell>
  );
}

const SECTIONS = [
  { id: 'business', t: 'Business', s: 'GST, PAN, bank, Udyam, address', done: true },
  { id: 'products', t: 'Products & codes', s: 'HSN / SAC, markets, IEC, LUT', done: true },
  { id: 'capabilities', t: 'Capabilities & proof', s: 'Machines, processes, certificates, photos', done: true },
  { id: 'page', t: 'Your page', s: 'What buyers see · contacts hidden until award', done: true },
  { id: 'export', t: 'Export roadmap', s: 'IEC, DSC, AD code, LUT, RCMC, e-BRC', done: false },
  { id: 'benefits', t: 'Benefits', s: 'RoDTEP, drawback, EPCG, Advance Authorisation', done: false },
];

export function Profile() {
  return (
    <PhoneShell title="Profile" back="/s/open">
      <div className="row mb-12">
        <span className="avatar" style={{ width: 40, height: 40 }}>SM</span>
        <div>
          <div className="strong">{SUPPLIER_ME.org}</div>
          <div className="small muted">{SUPPLIER_ME.owner} · Owner · {SUPPLIER_ME.city}</div>
        </div>
      </div>
      <div className="row mb-8"><span className="label">Profile</span><span className="spacer" /><span className="mono small">4 / 6</span></div>
      <div className="progress good mb-16"><span style={{ width: '66%' }} /></div>
      <div className="p-list" style={{ margin: '0 -16px', borderTop: '1px solid var(--border)' }}>
        {SECTIONS.map((s) => (
          <Link key={s.id} to={`/s/profile/${s.id}`} className="p-row">
            <span className={s.done ? 'good' : 'faint'}><Icon name={s.done ? 'check' : 'clock'} size={18} /></span>
            <div className="main-txt"><div className="t">{s.t}</div><div className="s">{s.s}</div></div>
            <Icon name="chevronRight" />
          </Link>
        ))}
      </div>
      <div className="row mt-16 gap-16 small">
        <Link to="/s/whatsapp">WhatsApp preview</Link>
        <Link to="/s/web/jobs">Open on laptop</Link>
        <span className="spacer" />
        <span className="muted">Users: Owner · Quoting · Dispatch</span>
      </div>
    </PhoneShell>
  );
}

const SECTION_BODY: Record<string, { title: string; rows: { label: string; state: 'pass' | 'pending' | 'warn'; detail?: string }[]; note?: string }> = {
  business: { title: 'Business', rows: [{ label: 'GSTIN 33ABKFS4821M1Z6', state: 'pass', detail: 'Active · fetched from GST' }, { label: 'PAN matches', state: 'pass' }, { label: 'Bank verified by ₹1 deposit', state: 'pass', detail: 'Indian Bank · ****4417' }, { label: 'Udyam registration', state: 'pass', detail: 'UDYAM-TN-12-0048821 · Small' }] },
  products: { title: 'Products & codes', rows: [{ label: 'HSN 8413.91 · pump parts', state: 'pass' }, { label: 'HSN 8483.90 · gearbox parts', state: 'pass' }, { label: 'IEC', state: 'warn', detail: 'Not added · needed to export directly' }, { label: 'Markets', state: 'pass', detail: 'India · Germany (via buyer)' }] },
  capabilities: { title: 'Capabilities & proof', rows: [{ label: 'SG and grey iron casting, 2–60 kg', state: 'pass' }, { label: 'CNC: 6 VMC, 3 HMC, 1 CMM', state: 'pass' }, { label: 'ISO 9001:2015', state: 'pass', detail: 'Valid to 03-2028' }, { label: 'Shop-floor photos', state: 'pass', detail: '12 photos' }] },
  page: { title: 'Your page', rows: [{ label: 'About, 3 lines', state: 'pass' }, { label: 'Typical parts and sizes', state: 'pass' }, { label: 'Contacts', state: 'pass', detail: 'Hidden until a buyer awards you' }] },
  export: { title: 'Export roadmap', note: 'In order. Each step links to the official portal. We never file on your behalf.', rows: [{ label: 'IEC (DGFT)', state: 'pending' }, { label: 'DSC class 3', state: 'pending' }, { label: 'AD code with your bank', state: 'pending' }, { label: 'LUT for zero-rated exports', state: 'pending' }, { label: 'RCMC (EEPC India)', state: 'pending' }, { label: 'e-BRC', state: 'pending' }, { label: 'Then: market-specific (CE / PED, REACH)', state: 'pending' }] },
  benefits: { title: 'Benefits', note: 'Indicative only. Always confirm with your CA.', rows: [{ label: 'RoDTEP', state: 'pending', detail: 'Remission of duties on exported products' }, { label: 'Duty drawback', state: 'pending' }, { label: 'EPCG', state: 'pending', detail: 'Capital goods at zero duty against export obligation' }, { label: 'Advance Authorisation', state: 'pending' }] },
};

export function ProfileSection() {
  const { section = 'business' } = useParams();
  const body = SECTION_BODY[section] ?? SECTION_BODY.business!;
  return (
    <PhoneShell title={body.title} back="/s/profile" cta={<button className="btn btn-primary btn-lg btn-block">Save</button>}>
      {body.note && <div className="mb-12"><Banner tone="info">{body.note}</Banner></div>}
      <div className="checks">
        {body.rows.map((r) => <CheckRow key={r.label} state={r.state} label={r.label} detail={r.detail} />)}
      </div>
    </PhoneShell>
  );
}
