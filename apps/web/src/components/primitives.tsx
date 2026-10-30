import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Status, Tier } from '@/api/types';
import { TIER_LABEL } from '@/api/types';
import type { Sourced, SourceKind } from '@/lib/costing';
import { dateTime, initials, money, type Currency } from '@/lib/format';
import { Icon } from './Icon';

/* ---------- Status chip: a word plus a colour, never colour alone ---------- */
const TONE: Partial<Record<Status, string>> = {
  Draft: '', Expired: '', Declined: '', Closed: '', Ended: '',
  Sent: 'accent', Quoted: 'accent', 'Under review': 'accent', 'In production': 'accent', Shipped: 'accent',
  'In transit': 'accent', Open: 'accent', Submitted: 'accent', Scheduled: 'accent', Trial: 'accent', Live: 'accent',
  Awarded: 'good', Acknowledged: 'good', Received: 'good', Matched: 'good', Approved: 'good', Paid: 'good',
  Passed: 'good', Done: 'good', Verified: 'good', Accepted: 'good', Answered: 'good', Resolved: 'good', Active: 'good',
  'Awaiting ack': 'warn', Held: 'warn', Pending: 'warn', 'Partially accepted': 'warn', Paused: 'warn',
  Blocked: 'crit', Failed: 'crit', Overdue: 'crit', Rejected: 'crit', Escalated: 'crit',
};

export function StatusChip({ status }: { status: Status }) {
  const tone = TONE[status];
  return <span className={`chip${tone ? ` tone-${tone}` : ''}`}>{status}</span>;
}

/* ---------- Source tag on a number ---------- */
const SRC_LABEL: Record<SourceKind, string> = {
  supplier: 'Supplier',
  hts: 'HTS',
  freight: 'Freight quote',
  computed: 'Computed',
  history: 'History',
};

export function SourceTag({ kind, refText }: { kind: SourceKind; refText?: string }) {
  return (
    <span className={`src src-${kind}`} title={refText ? `${SRC_LABEL[kind]} · ${refText}` : SRC_LABEL[kind]}>
      {SRC_LABEL[kind]}
    </span>
  );
}

/** A number with its source. A number with no source does not ship, so `value.source` is required by type. */
export function Num({ value, currency, digits = 2, hideTag, strong }: { value: Sourced; currency?: Currency; digits?: number; hideTag?: boolean; strong?: boolean }) {
  const text = currency ? money(value.value, currency, digits) : value.value.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return (
    <span className="sourced">
      <span className={`mono${strong ? ' strong' : ''}`}>{text}</span>
      {!hideTag && <SourceTag kind={value.source} refText={value.ref} />}
    </span>
  );
}

/* ---------- Verification tier (separate from rank) ---------- */
export function TierBadge({ tier, compact }: { tier: Tier; compact?: boolean }) {
  return (
    <span className="tier" title={`Verification tier: ${TIER_LABEL[tier]}`}>
      <span className="pips">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`pip${tier >= i ? ' on' : ''}`} />
        ))}
      </span>
      {!compact && TIER_LABEL[tier]}
    </span>
  );
}

export function Conf({ value }: { value: number }) {
  const cls = value >= 0.85 ? 'hi' : value >= 0.75 ? 'mid' : 'lo';
  return (
    <span className={`conf ${cls}`} title="Model confidence. Below 0.75 asks a person to confirm.">
      {value.toFixed(2)}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <span className="kbd">{children}</span>;
}

/** Field label with its technical name on hover, SAP style. */
export function TechLabel({ children, tech }: { children: ReactNode; tech: string }) {
  return (
    <span className="label" data-tech={tech}>
      {children}
    </span>
  );
}

export function RecordMeta({ by, at }: { by: string; at: string }) {
  return (
    <span className="small muted">
      Last changed by {by} · <span className="mono">{dateTime(at)}</span> IST
    </span>
  );
}

/* ---------- Page header: one primary action, top-right ---------- */
export function PageHeader({
  crumbs, title, docNo, status, meta, question, primary, secondary,
}: {
  crumbs?: { label: string; to?: string }[];
  title: ReactNode;
  docNo?: string;
  status?: Status;
  meta?: ReactNode;
  question?: string;
  primary?: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div style={{ minWidth: 0 }}>
        {crumbs && (
          <div className="crumbs">
            {crumbs.map((c, i) => (
              <span key={i} className="row gap-4">
                {i > 0 && <Icon name="chevronRight" size={12} />}
                {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
              </span>
            ))}
          </div>
        )}
        <div className="title-row">
          <h1>{title}</h1>
          {docNo && <span className="docno">{docNo}</span>}
          {status && <StatusChip status={status} />}
        </div>
        {question && <div className="question mt-4">{question}</div>}
        {meta && <div className="meta">{meta}</div>}
      </div>
      {(primary || secondary) && (
        <div className="actions">
          {secondary}
          {primary}
        </div>
      )}
    </div>
  );
}

export function Panel({ title, actions, children, tight, foot, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; tight?: boolean; foot?: ReactNode; className?: string }) {
  return (
    <section className={`panel${className ? ` ${className}` : ''}`}>
      {title && (
        <div className="panel-head">
          {typeof title === 'string' ? <span className="label">{title}</span> : title}
          {actions && <div className="row gap-12" style={{ marginLeft: 'auto' }}>{actions}</div>}
        </div>
      )}
      <div className={`panel-body${tight ? ' tight' : ''}`}>{children}</div>
      {foot && <div className="panel-foot">{foot}</div>}
    </section>
  );
}

export function KV({ items, narrow }: { items: [ReactNode, ReactNode][]; narrow?: boolean }) {
  return (
    <dl className={`kv${narrow ? ' narrow' : ''}`} style={{ margin: 0 }}>
      {items.map(([k, v], i) => (
        <div key={i} style={{ display: 'contents' }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={`tab${value === t.id ? ' active' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}
          {t.count !== undefined && <span className="count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Seg<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Banner({ tone = 'info', children, icon = 'info' }: { tone?: 'info' | 'warn' | 'crit' | 'good'; children: ReactNode; icon?: string }) {
  return (
    <div className={`banner ${tone}`}>
      <Icon name={icon} size={14} />
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

export interface KpiItem { label: string; value: ReactNode; unit?: string; delta?: ReactNode; target?: string; tech?: string }
export function Kpis({ items }: { items: KpiItem[] }) {
  return (
    <div className="kpis" style={{ ['--kpi-cols' as string]: items.length }}>
      {items.map((k) => (
        <div className="kpi" key={k.label}>
          {k.tech ? <TechLabel tech={k.tech}>{k.label}</TechLabel> : <span className="label">{k.label}</span>}
          <div className="value">
            {k.value}
            {k.unit && <span className="unit">{k.unit}</span>}
          </div>
          {k.delta && <div className="delta">{k.delta}</div>}
          {k.target && <div className="target">{k.target}</div>}
        </div>
      ))}
    </div>
  );
}

export function Sparkline({ data, width = 120, height = 28, color = 'var(--ink)', target }: { data: number[]; width?: number; height?: number; color?: string; target?: number }) {
  const min = Math.min(...data, target ?? Infinity);
  const max = Math.max(...data, target ?? -Infinity);
  const span = max - min || 1;
  const x = (i: number) => (i / (data.length - 1)) * (width - 4) + 2;
  const y = (v: number) => height - 3 - ((v - min) / span) * (height - 6);
  const d = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      {target !== undefined && <line x1={0} x2={width} y1={y(target)} y2={y(target)} stroke="var(--border-strong)" strokeDasharray="2 3" />}
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1]!)} r={2.2} fill={color} />
    </svg>
  );
}

export function Avatar({ name, size, light }: { name: string; size?: 'sm'; light?: boolean }) {
  return <span className={`avatar${size ? ` ${size}` : ''}${light ? ' light' : ''}`}>{initials(name)}</span>;
}

export function DocLink({ id }: { id: string }) {
  const to = id.startsWith('RFQ')
    ? `/b/rfqs/${id}`
    : id.startsWith('PO')
      ? `/b/orders?doc=${id}`
      : id.startsWith('ASN')
        ? `/b/shipments?doc=${id}`
        : id.startsWith('GRN')
          ? `/b/grn?doc=${id}`
          : id.startsWith('INV')
            ? `/b/payments?doc=${id}`
            : id.startsWith('VEN')
              ? `/b/vendors/${id}`
              : id.startsWith('MAT')
                ? `/b/materials?doc=${id}`
                : '#';
  return (
    <Link to={to} className="mono" onClick={(e) => e.stopPropagation()}>
      {id}
    </Link>
  );
}
