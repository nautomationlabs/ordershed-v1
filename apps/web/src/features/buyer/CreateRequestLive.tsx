/**
 * Create request on the real API: upload a drawing → the model proposes fields → the buyer confirms every field
 * below 0.75 (or corrects it) before the request can move on. Each confirmation is recorded in the audit chain.
 */
import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { actions, drawingUrl, type ApiError, type Draft, type DraftField } from '@/api/client';
import { Icon } from '@/components/Icon';
import { Banner, Conf, PageHeader, Panel, SourceTag, TechLabel } from '@/components/primitives';
import { ErrorState, LoadingBlock } from '@/components/StateViews';
import { money } from '@/lib/format';

const CONFIRM_BELOW = 0.75;
const ACCEPT_FROM = 0.85;
const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp';

export function CreateRequestLive() {
  const [params] = useSearchParams();
  const rfq = params.get('rfq');
  return rfq ? <Review rfq={rfq} /> : <Upload />;
}

function Upload() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  const [over, setOver] = useState(false);

  async function send(file: File | undefined) {
    if (!file) return;
    setErr(null);
    setBusy(file.name);
    try {
      const draft = await actions.uploadDrawing(file);
      qc.setQueryData(['draft', draft.rfq.number], draft);
      nav(`/b/requests/new?rfq=${draft.rfq.number}`);
    } catch (e) {
      setErr(e as ApiError);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page">
      <PageHeader
        crumbs={[{ label: 'Sourcing' }, { label: 'Create request' }]}
        title="Create request"
        question="Upload a drawing. The model reads it; you confirm anything it is unsure of before suppliers see it."
        primary={<button className="btn btn-primary" disabled={!!busy} onClick={() => input.current?.click()}>Upload drawing</button>}
      />
      <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => void send(e.target.files?.[0])} />
      {err && (
        <div className="mb-12">
          <Banner tone="crit" icon="alert"><strong>Upload failed.</strong> {err.message} <span className="mono small muted">{err.requestId}</span></Banner>
        </div>
      )}
      <Panel title="Drawing or data sheet">
        <div
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); void send(e.dataTransfer.files[0]); }}
          style={{ border: `1px ${over ? 'solid var(--accent)' : 'dashed var(--rule)'}`, borderRadius: 4, padding: '48px 16px', textAlign: 'center' }}
        >
          {busy ? (
            <>
              <div className="strong">Reading <span className="mono">{busy}</span></div>
              <div className="small muted mt-4">Usually 10 to 30 seconds. Fields the model is unsure of are re-read before you see them.</div>
            </>
          ) : (
            <>
              <div className="strong">Drop a drawing here</div>
              <div className="small muted mt-4">PDF, PNG, JPEG or WebP, up to 20 MB. The file stays with your organisation; suppliers see it only after you send the request.</div>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}

function Review({ rfq }: { rfq: string }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery<Draft, ApiError>({ queryKey: ['draft', rfq], queryFn: () => actions.draft(rfq) });
  const [editing, setEditing] = useState<{ key: string; value: string; unit: string } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<ApiError | null>(null);

  async function confirm(f: DraftField, edit?: { value: string; unit: string }) {
    setSaving(f.key);
    setActionErr(null);
    try {
      const next = await actions.confirmField(rfq, f.key, edit && { value: edit.value, unit: edit.unit || null });
      qc.setQueryData(['draft', rfq], next);
      setEditing(null);
    } catch (e) {
      setActionErr(e as ApiError);
    } finally {
      setSaving(null);
    }
  }

  if (error) return <div className="page"><ErrorState message={error.message} requestId={error.requestId} onRetry={() => refetch()} /></div>;
  if (isLoading || !data) return <div className="page"><LoadingBlock lines={10} /></div>;

  const ex = data.extraction;
  const needs = ex.fields.filter((f) => f.confidence < CONFIRM_BELOW && !f.confirmed);
  const reread = ex.fields.filter((f) => f.source === 'fallback').length;
  const isPdf = data.document.mediaType === 'application/pdf';

  return (
    <div className="page">
      <PageHeader
        crumbs={[{ label: 'Sourcing' }, { label: 'Create request', to: '/b/requests/new' }, { label: rfq }]}
        title={data.rfq.title}
        docNo={`${rfq} · draft · ${data.document.number}`}
        status="Draft"
        question="Did we read the drawing right? Confirm what the model is unsure of before suppliers see it."
        meta={<>Uploaded <span className="mono">{data.document.fileName}</span></>}
        primary={
          <button className="btn btn-primary" disabled={ex.status !== 'ready' || needs.length > 0} onClick={() => nav('/b/vendors/find')} title={needs.length ? 'Confirm low-confidence fields first' : undefined}>
            Confirm and find vendors
          </button>
        }
      />

      {ex.status === 'failed' && (
        <div className="mb-12">
          <Banner tone="crit" icon="alert"><strong>The drawing could not be read.</strong> {ex.error} Upload it again, or a clearer scan.</Banner>
        </div>
      )}
      {actionErr && (
        <div className="mb-12">
          <Banner tone="crit" icon="alert">{actionErr.message} <span className="mono small muted">{actionErr.requestId}</span></Banner>
        </div>
      )}
      {needs.length > 0 && (
        <div className="mb-12">
          <Banner tone="warn" icon="alert">
            <strong>{needs.length} {needs.length === 1 ? 'field' : 'fields'} below 0.75 confidence.</strong>{' '}
            {ex.fallbackModel ? 'A fallback model already re-read them; they still need you.' : 'They need you.'} Suppliers will not see this request until you confirm.
          </Banner>
        </div>
      )}

      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.05fr)', alignItems: 'start' }}>
        <Panel title={`Drawing · ${data.document.fileName}`} actions={<a className="link small" href={drawingUrl(rfq)} target="_blank" rel="noreferrer">Open full size</a>} tight>
          {isPdf ? (
            <object data={drawingUrl(rfq)} type="application/pdf" style={{ width: '100%', height: 640, display: 'block' }}>
              <div className="small muted" style={{ padding: 16 }}>This browser cannot show PDFs inline. <a href={drawingUrl(rfq)} target="_blank" rel="noreferrer">Open the drawing</a>.</div>
            </object>
          ) : (
            <img src={drawingUrl(rfq)} alt={`Drawing ${data.document.fileName}`} style={{ width: '100%', display: 'block' }} />
          )}
        </Panel>

        <Panel
          title="Extracted fields"
          actions={
            <span className="small muted row gap-4">
              <span className="mono">{ex.model}</span>
              {reread > 0 && <span>· fallback on {reread} {reread === 1 ? 'field' : 'fields'}</span>}
              <span>· <span className="mono">{money(Number(ex.costInr))}</span></span>
              <SourceTag kind="computed" refText="model tokens × Bedrock rate, computed in code" />
              {ex.durationMs !== null && <span>· <span className="mono">{(ex.durationMs / 1000).toFixed(1)} s</span></span>}
            </span>
          }
          tight
        >
          <table className="dt">
            <thead>
              <tr>
                <th>Field</th>
                <th>Value</th>
                <th className="num">Conf.</th>
                <th>Source</th>
                <th style={{ width: 110 }} />
              </tr>
            </thead>
            <tbody>
              {ex.fields.map((f) => {
                const low = f.confidence < CONFIRM_BELOW && !f.confirmed;
                const accepted = !f.confirmed && f.confidence >= ACCEPT_FROM;
                const isEditing = editing?.key === f.key;
                return (
                  <tr key={f.key} style={low ? { background: '#fffaf3' } : undefined}>
                    <td><TechLabel tech={f.tech}>{f.label}</TechLabel></td>
                    <td style={{ whiteSpace: 'normal', maxWidth: 260, padding: '6px 10px' }}>
                      {isEditing ? (
                        <div className="row gap-4">
                          <input className="input" style={{ minWidth: 0, flex: 1 }} value={editing.value} autoFocus onChange={(e) => setEditing({ ...editing, value: e.target.value })} aria-label={`${f.label} value`} />
                          <input className="input mono" style={{ width: 56 }} value={editing.unit} placeholder="unit" onChange={(e) => setEditing({ ...editing, unit: e.target.value })} aria-label={`${f.label} unit`} />
                        </div>
                      ) : (
                        <>
                          <span className={f.key === 'partNo' || f.key === 'material' ? 'mono' : ''}>{f.value}</span>
                          {f.unit && <span className="muted mono"> {f.unit}</span>}
                        </>
                      )}
                    </td>
                    <td className="num"><Conf value={f.confidence} /></td>
                    <td className="small muted" style={{ whiteSpace: 'normal', maxWidth: 150 }}>
                      {f.span}
                      {f.source === 'fallback' && <div>Re-read by fallback model</div>}
                      {f.source === 'buyer' && <div>Corrected by you</div>}
                    </td>
                    <td>
                      {isEditing ? (
                        <div className="row gap-12">
                          <button className="link small" disabled={saving === f.key || !editing.value.trim()} onClick={() => void confirm(f, editing)}>Save</button>
                          <button className="link small link-muted" onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                      ) : f.confirmed || accepted ? (
                        <span className="small good strong row gap-4"><Icon name="check" size={12} /> {f.confirmed ? 'Confirmed' : 'Accepted'}</span>
                      ) : (
                        <div className="row gap-12">
                          <button className="link small" disabled={saving === f.key || data.rfq.status !== 'draft'} onClick={() => void confirm(f)}>Confirm</button>
                          <button className="link small link-muted" disabled={data.rfq.status !== 'draft'} onClick={() => setEditing({ key: f.key, value: f.value, unit: f.unit ?? '' })}>Edit</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}
