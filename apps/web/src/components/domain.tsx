import { useState, type ReactNode } from 'react';
import type { Commitment } from '@/api/types';
import { due, shortHash } from '@/lib/format';
import { Icon } from './Icon';
import { Conf, DocLink } from './primitives';

/* ---------- "Proposed by AI" box: agents propose, people approve ---------- */
export function AiProposal({
  title = 'Proposed by AI', confidence, children, sources, onApprove, onEdit, approveLabel = 'Approve', approved,
}: {
  title?: string;
  confidence: number;
  children: ReactNode;
  sources?: string[];
  onApprove?: () => void;
  onEdit?: () => void;
  approveLabel?: string;
  approved?: boolean;
}) {
  const [done, setDone] = useState(!!approved);
  return (
    <div className="ai">
      <div className="ai-head">
        <span className="label">{title}</span>
        <Conf value={confidence} />
        {confidence < 0.75 && <span className="small warn">Below 0.75, needs a person to confirm</span>}
        <span className="spacer" />
        {done && <span className="chip tone-good">Approved by you</span>}
      </div>
      <div>{children}</div>
      {sources && sources.length > 0 && (
        <div className="small muted mt-8">
          Sources: {sources.join(' · ')}
        </div>
      )}
      {!done && (
        <div className="ai-actions">
          <button
            className="btn btn-sm"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            onClick={() => {
              setDone(true);
              onApprove?.();
            }}
          >
            <Icon name="check" size={13} /> {approveLabel}
          </button>
          <button className="link" onClick={onEdit}>
            Edit
          </button>
          <span className="small faint">Nothing is sent or saved until you approve.</span>
        </div>
      )}
    </div>
  );
}

/* ---------- Check-list row (icon, label, state) ---------- */
export type CheckState = 'pass' | 'fail' | 'pending' | 'warn';
export function CheckRow({ state, label, detail, right }: { state: CheckState; label: ReactNode; detail?: ReactNode; right?: ReactNode }) {
  const icon = state === 'pass' ? 'check' : state === 'fail' ? 'x' : state === 'warn' ? 'alert' : 'clock';
  const cls = state === 'pass' ? 'good' : state === 'fail' ? 'crit' : state === 'warn' ? 'warn' : 'muted';
  const word = state === 'pass' ? 'Passed' : state === 'fail' ? 'Failed' : state === 'warn' ? 'Check' : 'Pending';
  return (
    <div className="check">
      <span className={`ic ${cls}`}>
        <Icon name={icon} size={14} />
      </span>
      <div className="lbl">
        <div>{label}</div>
        {detail && <div className="small muted">{detail}</div>}
      </div>
      {right}
      <span className={`st ${cls}`} style={{ fontWeight: 600, minWidth: 52, textAlign: 'right' }}>
        {word}
      </span>
    </div>
  );
}

/* ---------- Commitment card (owner, item, due, one button) ---------- */
export function CommitmentCard({ c, onAction }: { c: Commitment; onAction?: (c: Commitment) => void }) {
  const d = due(c.due);
  const cls = c.lane === 'Done' ? '' : d.tone === 'crit' ? ' overdue' : d.tone === 'warn' ? ' due-soon' : '';
  return (
    <div className={`ccard${cls}`}>
      <div className="row">
        <DocLink id={c.doc} />
        <span className="spacer" />
        <span className={`small ${c.lane === 'Done' ? 'good' : d.tone}`} style={{ fontWeight: 600 }}>
          {c.lane === 'Done' ? 'Done' : d.text}
        </span>
      </div>
      <div className="item">{c.item}</div>
      <div className="meta">
        <span>{c.owner}</span>
        <span className="faint">·</span>
        <span>{c.ownerSide}</span>
        {c.reminders > 0 && (
          <>
            <span className="faint">·</span>
            <span className={c.reminders >= 2 ? 'crit' : ''}>{c.reminders} reminder{c.reminders > 1 ? 's' : ''}</span>
          </>
        )}
      </div>
      {c.lane !== 'Done' && (
        <div>
          <button className="btn btn-sm" onClick={() => onAction?.(c)}>
            {c.action}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Document flow panel ---------- */
export interface FlowNode { id: string; label: string; sub?: string; state: 'done' | 'current' | 'next' }
export function DocFlow({ nodes, horizontal }: { nodes: FlowNode[]; horizontal?: boolean }) {
  return (
    <div className={`docflow${horizontal ? ' horizontal' : ''}`}>
      {nodes.map((n) => (
        <div key={n.id + n.label} className={`df-node ${n.state}`}>
          <span className="df-dot" />
          <div>
            <div className="small muted">{n.label}</div>
            <div className="df-id">{n.state === 'next' ? <span className="faint">{n.id}</span> : <DocLink id={n.id} />}</div>
            {n.sub && <div className="df-sub">{n.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- DoA approver strip ---------- */
export interface DoaStep { role: string; who: string; state: 'done' | 'active' | 'waiting'; at?: string }
export function DoaStrip({ level, steps }: { level: string; steps: DoaStep[] }) {
  return (
    <div>
      <div className="row mb-8">
        <span className="label">Delegation of authority</span>
        <span className="chip tone-ink plain">{level}</span>
      </div>
      <div className="doa">
        {steps.map((s) => (
          <div key={s.role} className={`doa-step ${s.state}`}>
            <span className="label">{s.role}</span>
            <span className="who">{s.who}</span>
            <span className={`small ${s.state === 'done' ? 'good' : s.state === 'active' ? '' : 'muted'}`} style={{ color: s.state === 'active' ? 'var(--accent)' : undefined }}>
              {s.state === 'done' ? `Approved ${s.at ?? ''}` : s.state === 'active' ? 'Your approval' : 'Waiting'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Sealed-bid hash line ---------- */
export function HashLine({ hash, label = 'Sealed', at }: { hash: string; label?: string; at?: string }) {
  return (
    <div className="hashline" title={`SHA-256 ${hash}`}>
      <Icon name="lock" size={12} />
      <span>{label}</span>
      <span className="h">sha256:{shortHash(hash, 16)}</span>
      {at && <span className="spacer" />}
      {at && <span>{at}</span>}
    </div>
  );
}
