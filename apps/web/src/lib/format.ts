export type Currency = 'INR' | 'USD' | 'EUR';

const SYMBOL: Record<Currency, string> = { INR: '₹', USD: '$', EUR: '€' };
const LOCALE: Record<Currency, string> = { INR: 'en-IN', USD: 'en-US', EUR: 'en-IE' };

/** Money for display. Amounts are always computed upstream in code (never by a model). */
export function money(amount: number, currency: Currency = 'INR', digits = 2): string {
  const n = new Intl.NumberFormat(LOCALE[currency], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
  return `${SYMBOL[currency]} ${n}`;
}

/** Indian lakh / crore short form for dashboards: ₹ 24.6 L, ₹ 1.42 Cr. */
export function inrShort(amount: number): string {
  if (Math.abs(amount) >= 1e7) return `₹ ${(amount / 1e7).toFixed(2)} Cr`;
  if (Math.abs(amount) >= 1e5) return `₹ ${(amount / 1e5).toFixed(1)} L`;
  return money(amount, 'INR', 0);
}

export function int(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

export function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

/** Dates are stored ISO (UTC) and shown DD-MM-YYYY in IST. */
export function date(iso: string): string {
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${get('day')}-${get('month')}-${get('year')}`;
}

export function dateTime(iso: string): string {
  const d = new Date(iso);
  const t = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return `${date(iso)} ${t}`;
}

export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' }).format(new Date(iso));
}

/** The sandbox clock, so screenshots and tests are stable. */
export const NOW = new Date('2026-10-21T09:00:00Z');

/** Relative wording used on commitment cards: "in 2 d", "3 d overdue", "due today". */
export function due(iso: string, now = NOW): { text: string; tone: 'crit' | 'warn' | 'muted' } {
  const days = Math.round((new Date(iso).getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return { text: `${-days} d overdue`, tone: 'crit' };
  if (days === 0) return { text: 'due today', tone: 'warn' };
  if (days <= 2) return { text: `in ${days} d`, tone: 'warn' };
  return { text: `in ${days} d`, tone: 'muted' };
}

export function hours(h: number): string {
  return h < 1 ? `${Math.round(h * 60)} min` : `${h.toFixed(1)} h`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

export function shortHash(h: string, n = 10): string {
  return `${h.slice(0, n)}…${h.slice(-6)}`;
}
