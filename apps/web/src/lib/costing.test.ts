import { describe, expect, it } from 'vitest';
import { bandPosition, doaLevelFor, landedUnit, normalisedUnit, savingsPct, threeWayMatch } from './costing';

const s = (value: number, source: 'supplier' | 'computed' | 'freight' | 'hts' = 'supplier') => ({ value, source, ref: 't' });

describe('normalisedUnit', () => {
  it('amortises tooling over annual quantity', () => {
    expect(normalisedUnit({ exwUnit: s(1840), tooling: s(240000), annualQty: 4800 }).value).toBe(1890);
  });
  it('rejects zero quantity', () => {
    expect(() => normalisedUnit({ exwUnit: s(1), tooling: s(1), annualQty: 0 })).toThrow();
  });
});

describe('landedUnit', () => {
  const r = landedUnit({
    exwUnit: s(1840), tooling: s(240000), annualQty: 4800,
    fxRate: s(92), freightUnit: s(1.1, 'freight'), insurancePct: s(0.3), dutyPct: s(4.5, 'hts'),
    brokerageUnit: s(0.35, 'freight'), buyerCurrency: 'EUR',
  });
  it('sums every line and tags every number with a source', () => {
    const sum = r.lines.reduce((a, l) => a + l.value.value, 0);
    expect(Math.abs(sum - r.total.value)).toBeLessThan(0.03);
    expect(r.lines.map((l) => l.value.source)).toEqual(['supplier', 'computed', 'freight', 'computed', 'hts', 'freight']);
    expect(r.total.source).toBe('computed');
  });
  it('converts EXW at the given rate', () => {
    expect(r.lines[0]!.value.value).toBe(20);
  });
});

describe('helpers', () => {
  it('savings', () => expect(savingsPct(90, 100)).toBe(10));
  it('band', () => {
    expect(bandPosition(5, 6, 8)).toBe('below');
    expect(bandPosition(7, 6, 8)).toBe('within');
    expect(bandPosition(9, 6, 8)).toBe('above');
  });
});

describe('threeWayMatch', () => {
  const base = {
    po: { qty: 100, unitPrice: 10, hsn: '8483', taxPct: 18 },
    grn: { qtyAccepted: 100 },
    invoice: { qty: 100, unitPrice: 10, hsn: '8483', taxPct: 18 },
  };
  it('matches when all agree', () => expect(threeWayMatch(base).ok).toBe(true));
  it('holds when invoiced above accepted', () => {
    const r = threeWayMatch({ ...base, grn: { qtyAccepted: 96 } });
    expect(r.ok).toBe(false);
    expect(r.checks.find((c) => c.key === 'qty')!.ok).toBe(false);
  });
  it('holds on HSN mismatch', () => expect(threeWayMatch({ ...base, invoice: { ...base.invoice, hsn: '7325' } }).ok).toBe(false));
});

describe('doaLevelFor', () => {
  const levels = [
    { level: 'L1', maxInr: 2_500_000, approvers: ['Buyer'] },
    { level: 'L2', maxInr: 20_000_000, approvers: ['Buyer', 'Purchase head'] },
    { level: 'L3', maxInr: null, approvers: ['Plant head', 'CFO'] },
  ];
  it('picks the lowest covering level', () => {
    expect(doaLevelFor(2_000_000, levels).level).toBe('L1');
    expect(doaLevelFor(9_070_000, levels).level).toBe('L2');
    expect(doaLevelFor(50_000_000, levels).level).toBe('L3');
  });
});
