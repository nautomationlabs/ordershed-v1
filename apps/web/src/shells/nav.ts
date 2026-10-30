export interface NavItem { to: string; label: string; icon: string; code: string; count?: number; countTone?: 'crit'; phase?: string }
export interface NavGroup { label?: string; items: NavItem[] }

export const BUYER_NAV: NavGroup[] = [
  {
    items: [
      { to: '/b/home', label: 'Home', icon: 'home', code: 'HOME' },
      { to: '/b/commitments', label: 'Commitments', icon: 'kanban', code: 'CMT', count: 8, countTone: 'crit' },
      { to: '/b/chat', label: 'Queries & chat', icon: 'chat', code: 'QRY', count: 4 },
    ],
  },
  {
    label: 'Sourcing',
    items: [
      { to: '/b/requests/new', label: 'Create request', icon: 'plus', code: 'NEW RFQ' },
      { to: '/b/rfqs', label: 'RFx', icon: 'list', code: 'RFQ', count: 10 },
      { to: '/b/vendors/find', label: 'Find vendors', icon: 'search', code: 'FIND' },
      { to: '/b/compare/RFQ-000123', label: 'Compare', icon: 'compare', code: 'CMP', count: 2 },
      { to: '/b/auctions', label: 'Auctions', icon: 'gavel', code: 'AUC', phase: 'P2' },
      { to: '/b/award/RFQ-000123', label: 'Award', icon: 'award', code: 'AWD', count: 1 },
    ],
  },
  {
    label: 'Orders',
    items: [
      { to: '/b/orders', label: 'Orders', icon: 'doc', code: 'PO', count: 7 },
      { to: '/b/shipments', label: 'Shipments', icon: 'truck', code: 'ASN', count: 1, countTone: 'crit' },
      { to: '/b/transport', label: 'Transport RFQ', icon: 'ship', code: 'TRQ' },
      { to: '/b/grn', label: 'Goods receipt', icon: 'box', code: 'GRN' },
      { to: '/b/payments', label: 'Payments', icon: 'money', code: 'PAY', count: 2, countTone: 'crit' },
    ],
  },
  {
    label: 'Vendors',
    items: [
      { to: '/b/vendors', label: 'Vendor list', icon: 'factory', code: 'VEN' },
      { to: '/b/onboarding', label: 'Onboarding', icon: 'shield', code: 'ONB', count: 2 },
    ],
  },
  {
    label: 'Masters',
    items: [
      { to: '/b/materials', label: 'Materials', icon: 'layers', code: 'MAT' },
      { to: '/b/docs', label: 'Docs library', icon: 'inbox', code: 'DOC' },
    ],
  },
  {
    label: 'Insight',
    items: [
      { to: '/b/intelligence', label: 'Intelligence', icon: 'chart', code: 'INT' },
      { to: '/b/reports', label: 'Reports', icon: 'report', code: 'RPT' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { to: '/b/audit', label: 'Audit log', icon: 'hash', code: 'AUD' },
      { to: '/b/settings', label: 'Settings & DoA', icon: 'settings', code: 'CFG' },
    ],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { to: '/a/ops', label: 'Ops home', icon: 'home', code: 'OPS', count: 6, countTone: 'crit' },
      { to: '/a/verification', label: 'Verification queue', icon: 'shield', code: 'VER', count: 3 },
      { to: '/a/rfqs', label: 'RFQ operations', icon: 'list', code: 'RFQOPS', count: 12 },
      { to: '/a/disputes', label: 'Disputes & audit', icon: 'flag', code: 'DSP', count: 2 },
    ],
  },
  {
    label: 'Network',
    items: [
      { to: '/a/suppliers', label: 'Supplier directory', icon: 'factory', code: 'SUP' },
      { to: '/a/buyers', label: 'Buyer organisations', icon: 'users', code: 'ORG' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { to: '/a/messaging', label: 'Messaging & templates', icon: 'chat', code: 'MSG', count: 1, countTone: 'crit' },
      { to: '/a/cost', label: 'Cost & models', icon: 'chart', code: 'COST' },
    ],
  },
];
