import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApiArg, api, isLive } from '@/api/client';
import type { ExtractedField } from '@/api/types';
import { Icon } from '@/components/Icon';
import { Banner, Conf, PageHeader, Panel, SourceTag, TechLabel } from '@/components/primitives';
import { LoadingBlock, ErrorState } from '@/components/StateViews';
import { BRAND } from '@/config/brand';
import { CreateRequestLive } from './CreateRequestLive';
import { DrawingSvg, SPANS } from './DrawingSvg';

const STEPS = ['Upload', 'Review fields', 'Quantity & terms', 'Find vendors'];

export function CreateRequest() {
  return isLive('extraction') ? <CreateRequestLive /> : <CreateRequestSandbox />;
}

function CreateRequestSandbox() {
  const nav = useNavigate();
  const { data, isLoading, error, refetch } = useApiArg('extraction', 'RFQ-000132', api.extraction);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [hover, setHover] = useState<string | null>(null);

  const fields = data ?? [];
  const isConfirmed = (f: ExtractedField) => f.confirmed || confirmed[f.key] || f.confidence >= 0.85;
  const needs = fields.filter((f) => f.confidence < 0.75 && !confirmed[f.key]);

  return (
    <div className="page">
      <PageHeader
        crumbs={[{ label: 'Sourcing' }, { label: 'Create request' }]}
        title="Gearbox housing, machined"
        docNo="RFQ-000132 · draft · second source for PNQ-01"
        status="Draft"
        question="Did we read the drawing right? Confirm what the model is unsure of before suppliers see it."
        meta={<>Uploaded <span className="mono">KM-GH-2210_revC.pdf</span>, <span className="mono">KM-GH-2210.step</span> · requisition PR-77310 · or forward drawings to <span className="mono">{BRAND.rfqInbox}</span></>}
        primary={
          <button className="btn btn-primary" disabled={needs.length > 0} onClick={() => nav('/b/vendors/find')} title={needs.length ? 'Confirm low-confidence fields first' : undefined}>
            Confirm and find vendors
          </button>
        }
        secondary={<button className="link">Save draft</button>}
      />

      <div className="row gap-16 mb-16" aria-label="Progress">
        {STEPS.map((s, i) => (
          <div key={s} className="row gap-4">
            <span className="mono small" style={{ width: 18, height: 18, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: i < 1 ? 'var(--good)' : i === 1 ? 'var(--accent)' : 'var(--neutral-tint)', color: i <= 1 ? '#fff' : 'var(--muted)' }}>
              {i < 1 ? <Icon name="check" size={11} /> : i + 1}
            </span>
            <span className={i === 1 ? 'strong' : 'muted'}>{s}</span>
            {i < STEPS.length - 1 && <span className="faint" style={{ margin: '0 4px' }}>—</span>}
          </div>
        ))}
      </div>

      {needs.length > 0 && (
        <div className="mb-12">
          <Banner tone="warn" icon="alert">
            <strong>{needs.length} fields below 0.75 confidence.</strong> A fallback model already re-read them; they still need you. Suppliers will not see this request until you confirm.
          </Banner>
        </div>
      )}

      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.05fr)', alignItems: 'start' }}>
        <Panel
          title="Drawing · KM-GH-2210 rev C"
          actions={
            <>
              <span className="small muted">Watermarked · buyer name masked</span>
              <button className="link small">STEP viewer</button>
            </>
          }
          tight
        >
          <div className="drawing" style={{ border: 0 }}>
            <DrawingSvg />
            {SPANS.map((s) => (
              <span
                key={s.key}
                className={`span-mark${s.warn ? ' warn' : ''}`}
                style={{ left: `${s.left}%`, top: `${s.top}%`, width: `${s.w}%`, height: `${s.h}%`, outline: hover === s.key ? '2px solid var(--ink)' : undefined }}
                onMouseEnter={() => setHover(s.key)}
                onMouseLeave={() => setHover(null)}
              >
                <span className="tagno">{s.n}</span>
              </span>
            ))}
          </div>
        </Panel>

        <Panel
          title="Extracted fields"
          actions={<span className="small muted">Sonnet-class · Opus-class fallback on 3 fields · ₹ 14.20 · 9.4 s</span>}
          tight
        >
          {error ? (
            <ErrorState message={error.message} requestId={error.requestId} onRetry={() => refetch()} />
          ) : isLoading ? (
            <LoadingBlock lines={8} />
          ) : (
            <table className="dt">
              <thead>
                <tr>
                  <th style={{ width: 24 }}>#</th>
                  <th>Field</th>
                  <th>Value</th>
                  <th className="num">Conf.</th>
                  <th>Source</th>
                  <th style={{ width: 92 }} />
                </tr>
              </thead>
              <tbody>
                {fields.map((f) => {
                  const span = SPANS.find((s) => s.key === f.key);
                  const ok = isConfirmed(f);
                  const low = f.confidence < 0.75 && !confirmed[f.key];
                  return (
                    <tr key={f.key} onMouseEnter={() => setHover(f.key)} onMouseLeave={() => setHover(null)} className={hover === f.key ? 'cursor' : ''} style={low ? { background: '#fffaf3' } : undefined}>
                      <td className="mono muted">{span?.n ?? '—'}</td>
                      <td><TechLabel tech={f.tech}>{f.label}</TechLabel></td>
                      <td style={{ whiteSpace: 'normal', maxWidth: 260, padding: '6px 10px' }}>
                        <span className={f.key === 'partNo' || f.key === 'material' ? 'mono' : ''}>{f.value}</span>
                        {f.unit && <span className="muted mono"> {f.unit}</span>}
                      </td>
                      <td className="num"><Conf value={f.confidence} /></td>
                      <td className="small muted" style={{ whiteSpace: 'normal', maxWidth: 140 }}>{f.span}</td>
                      <td>
                        {ok ? (
                          <span className="small good strong row gap-4"><Icon name="check" size={12} /> {f.confirmed || confirmed[f.key] ? 'Confirmed' : 'Accepted'}</span>
                        ) : (
                          <div className="row gap-12">
                            <button className="link small" onClick={() => setConfirmed({ ...confirmed, [f.key]: true })}>Confirm</button>
                            <button className="link small link-muted">Edit</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <div className="grid-3 mt-16">
        <Panel title="Should-cost band">
          <div className="row" style={{ alignItems: 'baseline' }}>
            <span className="mono" style={{ fontSize: 18 }}>₹ 1,780 – 1,980</span>
            <span className="muted small">per pc, normalised</span>
            <span className="spacer" />
            <SourceTag kind="computed" refText="7 similar quotes · SG iron index Oct-26 · process model v3" />
          </div>
          <div className="small muted mt-8">From 7 similar parts and last price ₹ 2,050. Outliers outside the band are flagged on Compare, not hidden.</div>
        </Panel>
        <Panel title="Quantity & terms">
          <div className="grid-2" style={{ gap: 10 }}>
            <label className="field"><TechLabel tech="annual_qty · from requisition">Annual qty</TechLabel><div className="input-affix"><input className="input mono" defaultValue="4,800" /><span className="affix">pcs</span></div></label>
            <label className="field"><TechLabel tech="lot_qty">Lot size</TechLabel><div className="input-affix"><input className="input mono" defaultValue="400" /><span className="affix">pcs</span></div></label>
            <label className="field"><span className="label">Incoterm</span><select className="select"><option>EXW supplier works</option><option>FCA Nhava Sheva</option><option>FOB</option></select></label>
            <label className="field"><span className="label">Quote due</span><input className="input mono" defaultValue="28-10-2026 18:00" /></label>
          </div>
        </Panel>
        <Panel title="Similar parts found">
          <ul className="list-plain">
            <li><span className="mono small">KM-GH-2210</span><span className="spacer" /><span className="small muted">same part · RFQ-000123 · 4 quotes</span></li>
            <li><span className="mono small">KM-GH-1980</span><span className="spacer" /><span className="small muted">rev B housing · 2025 · PO line 10</span></li>
            <li><span className="mono small">KM-DC-1500</span><span className="spacer" /><span className="small muted">SG iron · HMC · 2026</span></li>
          </ul>
          <Link to="/b/materials" className="small">Open in Material master</Link>
        </Panel>
      </div>
    </div>
  );
}
