import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { actions, ApiError, isLive } from '@/api/client';
import { CheckRow } from '@/components/domain';
import { Icon } from '@/components/Icon';
import { Banner, Seg, SourceTag } from '@/components/primitives';
import { BRAND, ENV } from '@/config/brand';

const INDEX: { group: string; device: string; items: [string, string, string?][] }[] = [
  { group: 'Entry', device: 'Desktop / phone', items: [['Sign in (Buyer · Supplier · Admin)', '/login'], ['Buyer sign-up & KYB', '/signup', 'new'], ['Self-serve Get a quote', '/get-a-quote']] },
  { group: 'Buyer', device: 'Desktop 1440 × 900', items: [['Home', '/b/home'], ['Commitments board', '/b/commitments'], ['Queries & chat', '/b/chat'], ['Masked call', '/b/call/QRY-000088', 'new'], ['Create request (drawing review)', '/b/requests/new'], ['Find vendors', '/b/vendors/find'], ['RFx list', '/b/rfqs'], ['RFQ view', '/b/rfqs/RFQ-000123'], ['Compare quotes + landed-cost drawer', '/b/compare/RFQ-000123', 'new'], ['Reverse auction', '/b/auctions'], ['Award & decision pack', '/b/award/RFQ-000123'], ['Orders', '/b/orders'], ['Shipments', '/b/shipments'], ['Transport RFQ', '/b/transport', 'new'], ['Goods receipt (GRN)', '/b/grn', 'new'], ['Payments (three-way match)', '/b/payments'], ['Vendor list', '/b/vendors'], ['Vendor view', '/b/vendors/VEN-000041'], ['Vendor onboarding review', '/b/onboarding'], ['Material master', '/b/materials'], ['Docs library', '/b/docs'], ['Intelligence', '/b/intelligence'], ['Reports (CPO)', '/b/reports'], ['Audit log', '/b/audit'], ['Settings & DoA', '/b/settings']] },
  { group: 'Supplier', device: 'Phone 390 × 844', items: [['Join', '/s/join'], ['Join · approved', '/s/join?step=3'], ['Profile (six rows)', '/s/profile'], ['Set-up: Business', '/s/profile/business'], ['Set-up: Export roadmap', '/s/profile/export'], ['Set-up: Benefits', '/s/profile/benefits'], ['Open items', '/s/open'], ['Quote', '/s/quote/RFQ-000128'], ['Quote · voice confirmation', '/s/quote/RFQ-000128?voice=1'], ['Quote · decline sheet', '/s/quote/RFQ-000128?sheet=decline'], ['Catalogue', '/s/catalogue'], ['Orders', '/s/orders'], ['Orders & chat', '/s/orders/PO-000441', 'new'], ['Dispatch cross-check', '/s/dispatch/PO-000437', 'new'], ['WhatsApp flow', '/s/whatsapp']] },
  { group: 'Supplier web', device: 'Laptop', items: [['Job board', '/s/web/jobs'], ['Job pack', '/s/web/jobs/RFQ-000128'], ['My work', '/s/web/work']] },
  { group: 'Admin console', device: 'Desktop 1440 × 900', items: [['Ops home', '/a/ops', 'new'], ['Verification queue', '/a/verification', 'new'], ['RFQ operations', '/a/rfqs', 'new'], ['Supplier directory', '/a/suppliers', 'new'], ['Buyer organisations', '/a/buyers', 'new'], ['Messaging & templates', '/a/messaging', 'new'], ['Cost & models', '/a/cost', 'new'], ['Disputes & audit', '/a/disputes', 'new']] },
  { group: 'States', device: 'Any list', items: [['Empty state (any list)', '/b/orders?demo=empty'], ['Loading state', '/b/rfqs?demo=loading'], ['Error state', '/b/payments?demo=error']] },
];

export function ScreenIndex() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px' }}>
        <div className="row mb-8">
          <span className="brand" style={{ border: 0, width: 'auto', padding: 0 }}><span className="mark"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 2h10v2H1zM1 5h7v2H1zM1 8h10v2H1z" fill="#fff" /></svg></span><span className="word" style={{ fontSize: 18 }}>{BRAND.name}</span></span>
          <span className="chip plain tone-warn">{ENV.label}</span>
          <span className="spacer" />
          <Link to="/login" className="btn btn-primary">Sign in</Link>
        </div>
        <h1 style={{ fontSize: 26, marginTop: 24 }}>Screen index</h1>
        <p className="muted mt-4" style={{ maxWidth: 720 }}>Every screen in the frontend build, by role. Data is a fictional sandbox. Press <span className="kbd">/</span> inside the Buyer or Admin app for the command bar.</p>
        <div className="grid-3 mt-24" style={{ alignItems: 'start' }}>
          {INDEX.map((g) => (
            <section key={g.group} className="panel">
              <div className="panel-head"><span className="label" style={{ color: 'var(--ink)' }}>{g.group}</span><span className="spacer" /><span className="small muted">{g.device}</span></div>
              <ul className="list-plain" style={{ padding: '0 14px' }}>
                {g.items.map(([label, to, tag]) => (
                  <li key={to}><Link to={to}>{label}</Link><span className="spacer" />{tag && <span className="chip plain tone-accent">{tag}</span>}<span className="mono small faint">{to.length > 22 ? `${to.slice(0, 22)}…` : to}</span></li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Login() {
  const [role, setRole] = useState<'buyer' | 'supplier' | 'admin'>('buyer');
  const nav = useNavigate();
  const live = isLive('auth');
  const [dest, setDest] = useState('');
  const [challenge, setChallenge] = useState<{ id: string; sentTo: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const HOME = { buyer: '/b/home', supplier: '/s/open', platform: '/a/ops' } as const;

  function switchRole(r: typeof role) {
    setRole(r);
    setDest('');
    setChallenge(null);
    setCode('');
    setErr(null);
  }

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
  const sendCode = (fallback: string) => {
    if (!live) return nav(fallback);
    return run(async () => {
      const r = await actions.signInCode(role, dest);
      setChallenge({ id: r.challengeId, sentTo: r.sentTo });
    });
  };
  const verify = () => run(async () => {
    const me = await actions.signInVerify(challenge!.id, code);
    nav(HOME[me.org.kind]);
  });

  const codeStep = live && challenge && (
    <>
      <label className="field">
        <span className="label">Code</span>
        <input className="input input-lg mono" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" style={{ letterSpacing: '0.3em' }} autoFocus />
        <span className="hint">If {challenge.sentTo} is registered, a code is on its way. Valid for 10 minutes.</span>
      </label>
      <button className="btn btn-primary btn-lg" onClick={verify} disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Sign in'}</button>
      <button className="link small" onClick={() => setChallenge(null)}>Use a different {role === 'supplier' ? 'number' : 'email'}</button>
    </>
  );

  return (
    <div className="auth">
      <div className="auth-left">
        <span className="row"><span className="mark" style={{ width: 24, height: 24, borderRadius: 3, background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 2h10v2H1zM1 5h7v2H1zM1 8h10v2H1z" fill="#111418" /></svg></span><span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: '#fff' }}>{BRAND.name}</span></span>
        <div style={{ marginTop: 'auto', maxWidth: 520 }}>
          <h1 style={{ color: '#fff', fontSize: 30, lineHeight: 1.2 }}>Engineered parts, made in India. Verified suppliers, sealed quotes, every number sourced.</h1>
          <p style={{ color: '#9aa3ad', marginTop: 16 }}>Software does the chasing. People approve the money.</p>
          <div className="row gap-24 mt-24" style={{ color: '#c9ced4', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <span>3.6 quotes / RFQ</span><span>13.5 h median reply</span><span>₹ 104 / RFQ</span>
          </div>
          <div style={{ color: '#6b747e', fontSize: 11, marginTop: 6 }}>Sandbox figures</div>
        </div>
      </div>
      <div className="auth-right">
        <h2 style={{ fontSize: 22 }}>Sign in</h2>
        <Seg options={[{ id: 'buyer', label: 'Buyer' }, { id: 'supplier', label: 'Supplier' }, { id: 'admin', label: 'Admin' }]} value={role} onChange={switchRole} />
        {err && <Banner tone="crit">{err}</Banner>}
        {codeStep}
        {!codeStep && role === 'buyer' && (
          <>
            <label className="field"><span className="label">Work email</span><input className="input input-lg" value={live ? dest : undefined} defaultValue={live ? undefined : 'rohan.d@kestrel-motion.example'} onChange={(e) => setDest(e.target.value)} type="email" autoComplete="email" /></label>
            <button className="btn btn-primary btn-lg" onClick={() => sendCode('/b/home')} disabled={busy}>Send one-time code</button>
            <button className="btn btn-lg" disabled={live} title={live ? 'Microsoft sign-in comes with Cognito SSO' : undefined}>Continue with Microsoft (SSO)</button>
            <div className="small muted">New buyer? <Link to="/signup">Create an organisation</Link> · or <Link to="/get-a-quote">get a quote without an account</Link></div>
          </>
        )}
        {!codeStep && role === 'supplier' && (
          <>
            <label className="field"><span className="label">WhatsApp number</span><div className="input-affix"><span className="affix">+91</span><input className="input input-lg mono" value={live ? dest : undefined} defaultValue={live ? undefined : '98430 21877'} onChange={(e) => setDest(e.target.value)} inputMode="tel" /></div></label>
            <button className="btn btn-primary btn-lg" onClick={() => sendCode('/s/open')} disabled={busy}>Send code on WhatsApp</button>
            <div className="small muted">Your GSTIN is your organisation key. New? <Link to="/s/join">Join free</Link> or send JOIN to <span className="mono">{BRAND.whatsappNumber}</span>.</div>
          </>
        )}
        {!codeStep && role === 'admin' && (
          <>
            <label className="field"><span className="label">Email</span><input className="input input-lg" value={live ? dest : undefined} defaultValue={live ? undefined : 'divya@ordershed.example'} onChange={(e) => setDest(e.target.value)} type="email" autoComplete="email" /></label>
            {live ? (
              <>
                <button className="btn btn-primary btn-lg" onClick={() => sendCode('/a/ops')} disabled={busy}>Send one-time code</button>
                <div className="small muted">Sandbox: email code. Passkeys replace this before go-live. Every admin action is logged.</div>
              </>
            ) : (
              <>
                <button className="btn btn-primary btn-lg" onClick={() => nav('/a/ops')}><Icon name="key" /> Sign in with passkey</button>
                <div className="small muted">Admin access is passkey-only and every action is logged.</div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const KYB_STEPS = ['Country', 'Company ID', 'Confirm company', 'Your role', 'Plants', 'Connect mail'];

export function BuyerSignup() {
  const [params] = useSearchParams();
  const [step, setStep] = useState(Number(params.get('step') ?? 2));
  const [country, setCountry] = useState<'IN' | 'DE' | 'US' | 'UK' | 'AE'>('DE');
  const idLabel: Record<typeof country, string> = { IN: 'GSTIN or PAN', DE: 'Handelsregister number', US: 'EIN', UK: 'Companies House number', AE: 'Trade licence number' };
  const idValue: Record<typeof country, string> = { IN: '27AAKCK9921R1ZP', DE: 'HRB 774 902 · Amtsgericht Stuttgart', US: '84-2219034', UK: '14402198', AE: 'DED 1188204' };
  return (
    <div className="onb">
      <aside className="onb-side">
        <span className="row"><span className="mark" style={{ width: 22, height: 22, borderRadius: 3, background: 'var(--ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 2h10v2H1zM1 5h7v2H1zM1 8h10v2H1z" fill="#fff" /></svg></span><span className="word" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{BRAND.name}</span></span>
        <div>
          <h2 style={{ fontSize: 18 }}>Set up your buying organisation</h2>
          <p className="small muted mt-4">One field at a time. About three minutes. Free until your first PO or 60 days.</p>
        </div>
        <div className="steps">
          {KYB_STEPS.map((s, i) => (
            <div key={s} className={`step${i < step ? ' done' : i === step ? ' current' : ''}`}>
              <span className="dot">{i < step && <Icon name="check" size={10} />}</span>
              <span className="t">{s}</span>
              <span className="v">{i === 0 && step > 0 ? country : i === 1 && step > 1 ? idValue[country].split(' ·')[0] : ''}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'auto' }} className="small muted">Your data is never shown to other buyers. Supplier contacts are released only at award.</div>
      </aside>
      <main className="onb-main">
        <div className="onb-form">
          <div className="label">Step {step + 1} of {KYB_STEPS.length}</div>
          {step === 0 && (
            <>
              <h1 style={{ fontSize: 24 }}>Where is your company registered?</h1>
              <div className="col gap-8">
                {(['DE', 'IN', 'US', 'UK', 'AE'] as const).map((c) => (
                  <button key={c} className={`opt${country === c ? ' on' : ''}`} onClick={() => setCountry(c)}>
                    <span className="mono" style={{ width: 28 }}>{c}</span>{{ DE: 'Germany', IN: 'India', US: 'United States', UK: 'United Kingdom', AE: 'United Arab Emirates' }[c]}
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h1 style={{ fontSize: 24 }}>{idLabel[country]}</h1>
              <input className="input input-lg mono" defaultValue={idValue[country]} autoFocus />
              <span className="hint">We look this up in the official register and fill the rest.</span>
            </>
          )}
          {step === 2 && (
            <>
              <h1 style={{ fontSize: 24 }}>Is this your company?</h1>
              <div className="panel" style={{ padding: 16 }}>
                <div className="strong" style={{ fontSize: 16 }}>Kestrel Motion GmbH</div>
                <div className="small muted">HRB 774 902 · Amtsgericht Stuttgart · registered 03-2021</div>
                <div className="small mt-8">Heilbronner Straße 140, 70191 Stuttgart, Germany</div>
                <hr className="divider" />
                <div className="checks">
                  <CheckRow state="pass" label="Company is active in the register" detail={<>Source: Handelsregister · fetched <span className="mono">21-10-2026 09:04</span></>} />
                  <CheckRow state="pass" label="Email domain matches company" detail="kestrel-motion.example" />
                  <CheckRow state="pending" label="Indian entity (optional)" detail="Add GSTIN for PNQ-01 Chakan at the Plants step" />
                </div>
              </div>
              <div className="row small muted">Not right? <button className="link" onClick={() => setStep(1)}>Change the number</button></div>
            </>
          )}
          {step === 3 && (
            <>
              <h1 style={{ fontSize: 24 }}>What is your role?</h1>
              <div className="col gap-8">{['Buyer', 'Purchase head', 'Plant head', 'Finance', 'Viewer'].map((r, i) => <button key={r} className={`opt${i === 1 ? ' on' : ''}`}>{r}</button>)}</div>
              <span className="hint">Approval limits come from your Delegation of Authority settings, not from this choice.</span>
            </>
          )}
          {step === 4 && (
            <>
              <h1 style={{ fontSize: 24 }}>Where do parts get delivered?</h1>
              <div className="panel" style={{ padding: 12 }}><span className="mono strong">STR-01</span> Stuttgart, DE <span className="muted small">· VAT DE 318 774 902</span></div>
              <div className="panel" style={{ padding: 12 }}><span className="mono strong">PNQ-01</span> Chakan, Pune, IN <span className="muted small">· GSTIN 27AAKCK9921R1ZP · verified</span></div>
              <button className="link" style={{ alignSelf: 'flex-start' }}>Add plant</button>
            </>
          )}
          {step === 5 && (
            <>
              <h1 style={{ fontSize: 24 }}>Send RFQs from your own address</h1>
              <p className="muted">Connect Microsoft 365 so supplier mail goes from purchasing@kestrel-motion.example. You can skip this.</p>
              <button className="btn btn-lg">Connect Microsoft 365</button>
            </>
          )}
          <div className="row mt-8">
            {step > 0 && <button className="link link-muted" onClick={() => setStep(step - 1)}>Back</button>}
            <span className="spacer" />
            {step < KYB_STEPS.length - 1 ? (
              <button className="btn btn-primary btn-lg" onClick={() => setStep(step + 1)}>{step === 2 ? 'Yes, this is us' : 'Continue'}</button>
            ) : (
              <Link to="/b/home" className="btn btn-primary btn-lg">Finish</Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export function GetQuote() {
  const [uploaded, setUploaded] = useState(true);
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <header className="row" style={{ height: 56, padding: '0 32px', borderBottom: '1px solid var(--border)' }}>
        <span className="row"><span className="mark" style={{ width: 22, height: 22, borderRadius: 3, background: 'var(--ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 2h10v2H1zM1 5h7v2H1zM1 8h10v2H1z" fill="#fff" /></svg></span><span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{BRAND.name}</span></span>
        <span className="spacer" />
        <Link to="/login" className="small">Sign in</Link>
      </header>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 32px', display: 'grid', gridTemplateColumns: '1fr 420px', gap: 48 }}>
        <div>
          <h1 style={{ fontSize: 32, lineHeight: 1.15 }}>Get verified quotes for engineered parts made in India</h1>
          <p className="muted mt-12" style={{ fontSize: 15, maxWidth: 560 }}>Castings, forgings, machined parts, valve and pump parts. Upload a drawing; we read it, find verified suppliers and come back with a few sealed quotes, compared on landed cost.</p>
          <div className="panel mt-24" style={{ padding: 24, borderStyle: 'dashed', textAlign: 'center' }}>
            {uploaded ? (
              <div className="row" style={{ justifyContent: 'center' }}>
                <Icon name="doc" /><span className="mono">flange-WN-6in-150.pdf</span><span className="muted small">· 820 KB</span><button className="link small" onClick={() => setUploaded(false)}>Remove</button>
              </div>
            ) : (
              <button className="btn btn-lg" onClick={() => setUploaded(true)}><Icon name="upload" /> Upload drawing, STEP or data sheet</button>
            )}
            <div className="small muted mt-8">PDF, STEP, DXF, XLSX · up to 50 MB · drawings are watermarked and never shared without your consent</div>
          </div>
          {uploaded && (
            <div className="ai mt-16">
              <div className="ai-head"><span className="label">What we read</span><span className="conf hi">0.93</span></div>
              <div className="grid-3 small" style={{ gap: 8 }}>
                <div><div className="muted">Part</div>Weld-neck flange 6" class 150 RF</div>
                <div><div className="muted">Material</div>ASTM A105N</div>
                <div><div className="muted">Standard</div>ASME B16.5</div>
              </div>
              <div className="ai-actions"><button className="btn btn-sm">Looks right</button><button className="link">Edit</button></div>
            </div>
          )}
          <div className="grid-3 mt-24 small">
            <div><div className="label">Verified</div><p className="mt-4 muted">GST, PAN and bank checked; site visits for higher tiers.</p></div>
            <div><div className="label">Sourced numbers</div><p className="mt-4 muted">Every price shows where it came from.</p></div>
            <div><div className="label">Landed cost</div><p className="mt-4 muted">Freight, insurance and duty computed per part.</p></div>
          </div>
        </div>
        <div className="panel" style={{ padding: 20, alignSelf: 'start' }}>
          <h2 style={{ fontSize: 16 }}>Indicative price</h2>
          <p className="small muted mt-4">From similar parts on the network. Real quotes follow from verified suppliers.</p>
          <div className="row mt-12" style={{ alignItems: 'baseline' }}>
            <span className="mono" style={{ fontSize: 24 }}>₹ 1,420 – 1,610</span><span className="muted small">/ pc EXW</span>
          </div>
          <div className="row mt-4"><SourceTag kind="computed" refText="9 similar quotes · A105 index Oct-26" /><span className="small muted">9 similar parts</span></div>
          <hr className="divider" />
          <label className="field mb-12"><span className="label">Quantity per year</span><div className="input-affix"><input className="input mono" defaultValue="2,400" /><span className="affix">pcs</span></div></label>
          <label className="field mb-12"><span className="label">Deliver to</span><select className="select"><option>Houston, TX, United States</option><option>Hamburg, Germany</option><option>Pune, India</option></select></label>
          <label className="field mb-16"><span className="label">Work email</span><input className="input" placeholder="you@company.com" /></label>
          <button className="btn btn-primary btn-lg btn-block">Get verified quotes</button>
          <div className="small muted mt-8">After the first quote we set up your workspace and hand over to Create request.</div>
          <div className="mt-12"><Banner tone="info">No account needed for the first RFQ.</Banner></div>
        </div>
      </div>
    </div>
  );
}
