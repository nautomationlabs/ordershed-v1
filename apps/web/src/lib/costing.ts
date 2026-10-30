/**
 * Cost maths. Prices, totals, duty and landed cost are computed here in code, never by a model.
 * The backend is the system of record; this module mirrors its rules so the UI can preview them,
 * and the shared tests keep both in step.
 */
import type { Currency } from './format';

export type SourceKind = 'supplier' | 'hts' | 'freight' | 'computed' | 'history';

export interface Sourced {
  value: number;
  source: SourceKind;
  /** provenance, e.g. "Quote Q-000418 · 18-10-2026" or "HS 8483.40 · TARIC 2026-10" */
  ref: string;
}

export interface QuoteInputs {
  exwUnit: Sourced;
  tooling: Sourced;
  annualQty: number;
}

/** Normalised price = EXW + tooling amortised over annual quantity. */
export function normalisedUnit(q: QuoteInputs): Sourced {
  if (q.annualQty <= 0) throw new Error('annualQty must be positive');
  const value = round2(q.exwUnit.value + q.tooling.value / q.annualQty);
  return { value, source: 'computed', ref: `EXW ${q.exwUnit.value} + tooling ${q.tooling.value} / ${q.annualQty}` };
}

export interface LandedInputs extends QuoteInputs {
  fxRate: Sourced; // supplier currency per 1 unit of buyer currency, e.g. INR per EUR
  freightUnit: Sourced; // buyer currency per unit
  insurancePct: Sourced; // % of EXW + freight
  dutyPct: Sourced; // % of customs value (CIF)
  brokerageUnit: Sourced; // buyer currency per unit
  buyerCurrency: Currency;
}

export interface LandedLine {
  key: 'exw' | 'tooling' | 'freight' | 'insurance' | 'duty' | 'brokerage';
  label: string;
  value: Sourced;
}

export interface LandedResult {
  lines: LandedLine[];
  total: Sourced;
  currency: Currency;
}

/** Landed cost per unit in buyer currency = EXW + tooling allocation + freight + insurance + duty (on CIF) + brokerage. */
export function landedUnit(i: LandedInputs): LandedResult {
  if (i.fxRate.value <= 0) throw new Error('fxRate must be positive');
  const exw = round4(i.exwUnit.value / i.fxRate.value);
  const tooling = round4(i.tooling.value / i.annualQty / i.fxRate.value);
  const freight = i.freightUnit.value;
  const insurance = round4(((exw + freight) * i.insurancePct.value) / 100);
  const cif = exw + tooling + freight + insurance;
  const duty = round4((cif * i.dutyPct.value) / 100);
  const brokerage = i.brokerageUnit.value;
  const total = round2(exw + tooling + freight + insurance + duty + brokerage);

  const fx = `÷ ${i.fxRate.value} (${i.fxRate.ref})`;
  return {
    currency: i.buyerCurrency,
    lines: [
      { key: 'exw', label: 'EXW unit price', value: { value: round2(exw), source: 'supplier', ref: `${i.exwUnit.ref} ${fx}` } },
      { key: 'tooling', label: 'Tooling allocation', value: { value: round2(tooling), source: 'computed', ref: `${i.tooling.value} / ${i.annualQty} pcs ${fx}` } },
      { key: 'freight', label: 'Freight', value: { value: round2(freight), source: 'freight', ref: i.freightUnit.ref } },
      { key: 'insurance', label: 'Insurance', value: { value: round2(insurance), source: 'computed', ref: `${i.insurancePct.value}% of EXW + freight (${i.insurancePct.ref})` } },
      { key: 'duty', label: 'Duty', value: { value: round2(duty), source: 'hts', ref: `${i.dutyPct.value}% of CIF · ${i.dutyPct.ref}` } },
      { key: 'brokerage', label: 'Brokerage & clearance', value: { value: round2(brokerage), source: 'freight', ref: i.brokerageUnit.ref } },
    ],
    total: { value: total, source: 'computed', ref: 'Sum of lines, computed in code' },
  };
}

/** Savings vs a reference price as a percentage (positive = cheaper). */
export function savingsPct(price: number, reference: number): number {
  if (reference === 0) return 0;
  return round2(((reference - price) / reference) * 100);
}

/** Should-cost band check. */
export function bandPosition(price: number, low: number, high: number): 'below' | 'within' | 'above' {
  if (price < low) return 'below';
  if (price > high) return 'above';
  return 'within';
}

/** Three-way match of PO, GRN and invoice. Price tolerance is a setting (default 0%). */
export interface MatchInput {
  po: { qty: number; unitPrice: number; hsn: string; taxPct: number };
  grn: { qtyAccepted: number };
  invoice: { qty: number; unitPrice: number; hsn: string; taxPct: number };
  priceTolerancePct?: number;
}
export interface MatchCheck { key: 'qty' | 'price' | 'hsn' | 'tax'; ok: boolean; detail: string }

export function threeWayMatch(m: MatchInput): { ok: boolean; checks: MatchCheck[] } {
  const tol = m.priceTolerancePct ?? 0;
  const priceDiffPct = ((m.invoice.unitPrice - m.po.unitPrice) / m.po.unitPrice) * 100;
  const checks: MatchCheck[] = [
    { key: 'qty', ok: m.invoice.qty <= m.grn.qtyAccepted, detail: `Invoiced ${m.invoice.qty} · accepted ${m.grn.qtyAccepted}` },
    { key: 'price', ok: priceDiffPct <= tol + 1e-9, detail: `Invoice ${m.invoice.unitPrice} · PO ${m.po.unitPrice}` },
    { key: 'hsn', ok: m.invoice.hsn === m.po.hsn, detail: `Invoice ${m.invoice.hsn} · PO ${m.po.hsn}` },
    { key: 'tax', ok: m.invoice.taxPct === m.po.taxPct, detail: `Invoice ${m.invoice.taxPct}% · PO ${m.po.taxPct}%` },
  ];
  return { ok: checks.every((c) => c.ok), checks };
}

/** Delegation of Authority: which level approves an award of this value (INR). Thresholds are settings. */
export interface DoaLevel { level: string; maxInr: number | null; approvers: string[] }
export function doaLevelFor(valueInr: number, levels: DoaLevel[]): DoaLevel {
  const sorted = [...levels].sort((a, b) => (a.maxInr ?? Infinity) - (b.maxInr ?? Infinity));
  const hit = sorted.find((l) => l.maxInr === null || valueInr <= l.maxInr);
  if (!hit) throw new Error('No DoA level configured for this value');
  return hit;
}

export function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }
