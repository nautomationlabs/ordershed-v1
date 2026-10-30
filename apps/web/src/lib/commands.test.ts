import { describe, expect, it } from 'vitest';
import { filterCommands, parseCommand } from './commands';

describe('parseCommand', () => {
  it('jumps to numbered documents', () => {
    expect(parseCommand('RFQ 123')?.to).toBe('/b/rfqs/RFQ-000123');
    expect(parseCommand('po456')?.code).toBe('PO-000456');
    expect(parseCommand('GRN-000789')?.code).toBe('GRN-000789');
  });
  it('searches vendors', () => {
    expect(parseCommand('vendor hosur')?.to).toBe('/b/vendors?q=hosur');
  });
  it('creates a request', () => {
    expect(parseCommand('new rfq')?.to).toBe('/b/requests/new');
  });
  it('ignores free text', () => {
    expect(parseCommand('hello')).toBeNull();
  });
});

describe('filterCommands', () => {
  const all = [
    { id: 'a', code: 'ORD', label: 'Orders', to: '/b/orders', group: 'Go to' as const },
    { id: 'b', code: 'GRN', label: 'Goods receipt', to: '/b/grn', group: 'Go to' as const },
  ];
  it('puts the parsed command first', () => {
    expect(filterCommands('po 1', all)[0]?.code).toBe('PO-000001');
  });
  it('filters by label', () => {
    expect(filterCommands('goods', all).map((c) => c.id)).toEqual(['b']);
  });
});
