/**
 * Command bar grammar, SAP transaction-code style:
 *   "RFQ 123" → RFQ-000123     "PO 456" → PO-000456     "GRN 789"
 *   "vendor hosur" → vendor search      "new rfq" → create request
 */
export interface Command {
  id: string;
  code: string;
  label: string;
  to: string;
  group: 'Jump' | 'Create' | 'Go to' | 'Search';
}

const DOC_PREFIX: Record<string, { prefix: string; to: (id: string) => string; label: string }> = {
  rfq: { prefix: 'RFQ', to: (id) => `/b/rfqs/${id}`, label: 'Open RFQ' },
  po: { prefix: 'PO', to: (id) => `/b/orders?doc=${id}`, label: 'Open purchase order' },
  grn: { prefix: 'GRN', to: (id) => `/b/grn?doc=${id}`, label: 'Open goods receipt' },
  inv: { prefix: 'INV', to: (id) => `/b/payments?doc=${id}`, label: 'Open invoice' },
  asn: { prefix: 'ASN', to: (id) => `/b/shipments?doc=${id}`, label: 'Open shipment' },
  mat: { prefix: 'MAT', to: (id) => `/b/materials?doc=${id}`, label: 'Open material' },
};

export function docId(prefix: string, n: string | number): string {
  return `${prefix}-${String(n).padStart(6, '0')}`;
}

export function parseCommand(input: string): Command | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;
  const doc = q.match(/^(rfq|po|grn|inv|asn|mat)[\s-]*0*(\d{1,6})$/);
  if (doc) {
    const def = DOC_PREFIX[doc[1]!]!;
    const id = docId(def.prefix, doc[2]!);
    return { id: `jump-${id}`, code: id, label: def.label, to: def.to(id), group: 'Jump' };
  }
  const vendor = q.match(/^(vendor|supplier|v)\s+(.+)$/);
  if (vendor) {
    return {
      id: 'search-vendor',
      code: 'VENDOR',
      label: `Vendors matching "${vendor[2]}"`,
      to: `/b/vendors?q=${encodeURIComponent(vendor[2]!)}`,
      group: 'Search',
    };
  }
  if (/^(new|create)\s+(rfq|request)$/.test(q)) {
    return { id: 'new-rfq', code: 'NEW RFQ', label: 'Create request', to: '/b/requests/new', group: 'Create' };
  }
  return null;
}

export function filterCommands(input: string, all: Command[]): Command[] {
  const q = input.trim().toLowerCase();
  const parsed = parseCommand(input);
  const matches = q ? all.filter((c) => c.label.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) : all;
  return parsed ? [parsed, ...matches.filter((m) => m.id !== parsed.id)] : matches;
}
