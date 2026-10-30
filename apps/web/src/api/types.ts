/**
 * Order ontology (frontend view). Every document is numbered and every document line links to a PO line.
 * These types are the contract with the backend API; the mock adapter returns the same shapes.
 */
import type { Currency } from '@/lib/format';
import type { Sourced } from '@/lib/costing';

export type Status =
  | 'Draft' | 'Sent' | 'Quoted' | 'Under review' | 'Awarded' | 'Acknowledged' | 'Awaiting ack'
  | 'In production' | 'Shipped' | 'In transit' | 'Received' | 'Matched' | 'Held' | 'Blocked'
  | 'Open' | 'Answered' | 'Closed' | 'Declined' | 'Expired' | 'Pending' | 'Approved' | 'Rejected'
  | 'Paid' | 'Scheduled' | 'Passed' | 'Failed' | 'Done' | 'Overdue' | 'Live' | 'Paused' | 'Ended'
  | 'Verified' | 'Submitted' | 'Accepted' | 'Partially accepted' | 'Escalated' | 'Resolved' | 'Active' | 'Trial';

export type Tier = 0 | 1 | 2 | 3; // Self-declared → Document-verified → Site-visited → Performance-verified
export const TIER_LABEL: Record<Tier, string> = {
  0: 'Self-declared',
  1: 'Document-verified',
  2: 'Site-visited',
  3: 'Performance-verified',
};

export interface Audited {
  changedBy: string;
  changedAt: string;
}

export interface Vendor extends Audited {
  id: string; // VEN-000041
  name: string;
  city: string;
  state: string;
  gstin: string;
  tier: Tier;
  categories: string[];
  processes: string[];
  certs: string[];
  otdPct: number | null;
  ppm: number | null;
  distanceKm: number;
  replyHours: number | null;
  quotes12m: number;
  awards12m: number;
  employees: string;
  buyerMark?: 'Approved' | 'Preferred' | 'Blocked';
  similarParts: number;
  matchScore: number; // 0..100, matching only — never sold
}

export interface ExtractedField {
  key: string;
  label: string;
  tech: string;
  value: string;
  unit?: string;
  confidence: number;
  span: string; // where on the drawing
  confirmed?: boolean;
}

export interface Rfq extends Audited {
  id: string; // RFQ-000123
  title: string;
  partNo: string;
  rev: string;
  category: string;
  material: string;
  process: string;
  annualQty: number;
  lotQty: number;
  plant: string;
  status: Status;
  createdAt: string;
  quoteDue: string;
  invited: number;
  quotesIn: number;
  openQueries: number;
  owner: string;
  currency: Currency;
  shouldCost: { low: number; high: number; ref: string };
  lastPrice?: number;
  incoterm: string;
  sealed: boolean;
}

export interface Quote {
  id: string; // Q-000418
  rfqId: string;
  vendorId: string;
  exwUnit: Sourced;
  tooling: Sourced;
  leadDays: number;
  moq: number;
  validityDays: number;
  submittedAt: string;
  channel: 'Web' | 'WhatsApp' | 'Voice';
  hash: string;
  deviations: string[];
  exclusions: string[];
  paymentTerms: string;
  status: Status;
}

export interface PoLine { line: number; partNo: string; desc: string; qty: number; unit: string; unitPrice: number; hsn: string; taxPct: number }

export interface Order extends Audited {
  id: string; // PO-000456
  rfqId: string;
  vendorId: string;
  title: string;
  plant: string;
  value: number;
  currency: Currency;
  status: Status;
  issuedAt: string;
  ackAt?: string;
  needBy: string;
  incoterm: string;
  paymentTerms: string;
  lines: PoLine[];
  progressPct: number;
}

export interface CrossCheck { key: string; label: string; po: string; doc: string; ok: boolean }

export interface Shipment extends Audited {
  id: string; // ASN-000211
  poId: string;
  vendorId: string;
  mode: 'Road' | 'Sea' | 'Air';
  carrier: string;
  lrNo: string;
  ewayBill?: string;
  shippedQty: number;
  receivedQty?: number;
  dispatchedAt: string;
  eta: string;
  status: Status;
  crossCheck: CrossCheck[];
}

export interface Grn extends Audited {
  id: string; // GRN-000789
  poId: string;
  asnId: string;
  vendorId: string;
  plant: string;
  receivedAt: string;
  qtyReceived: number;
  qtyAccepted: number;
  qtyRejected: number;
  status: Status;
  inspector: string;
  note?: string;
}

export interface Invoice extends Audited {
  id: string; // INV-000302 (our record of the supplier's tax invoice)
  supplierInvoiceNo: string;
  irn?: string;
  poId: string;
  grnId?: string;
  vendorId: string;
  amount: number;
  tax: number;
  status: Status;
  receivedAt: string;
  msmeDue?: string;
  dueAt: string;
  qty: number;
  unitPrice: number;
  hsn: string;
  taxPct: number;
  note?: string;
}

export interface Commitment {
  id: string;
  item: string;
  doc: string;
  owner: string;
  ownerSide: 'Buyer' | 'Supplier' | 'Ops';
  party: string;
  due: string;
  lane: 'Due this week' | 'Waiting on supplier' | 'Waiting on us' | 'Done';
  reminders: number;
  action: string;
}

export interface QueryThread {
  id: string; // QRY-000088
  rfqId: string;
  vendorAlias: string;
  question: string;
  askedAt: string;
  owner: string;
  deadline: string;
  status: Status;
  channel: 'WhatsApp' | 'Web' | 'Email';
  draft?: { text: string; confidence: number; sources: string[] };
  answer?: string;
}

export interface Material extends Audited {
  id: string; // MAT-000120
  partCode: string;
  erpCode: string;
  desc: string;
  material: string;
  process: string;
  heatTreatment: string;
  finish: string;
  weightKg: number;
  hsn: string;
  rev: string;
  suppliers: number;
  lastPrice: number;
  priceTrend: number[];
  rfqs: number;
  singleSource: boolean;
}

export interface DocRecord {
  id: string;
  type: string;
  poId: string;
  party: string;
  issuedAt: string;
  status: Status;
  lines: number;
  linked: boolean;
  source: 'Supplier' | 'Generated' | 'Buyer';
}

export interface AuditEvent {
  seq: number;
  at: string;
  actor: string;
  role: string;
  action: string;
  doc: string;
  detail: string;
  hash: string;
  prev: string;
}

export interface DoaRule extends Audited {
  level: string;
  maxInr: number | null;
  approvers: string[];
  fourEyes: boolean;
  version: number;
}

export interface Alert { id: string; text: string; doc: string; tone: 'crit' | 'warn' | 'accent'; at: string }

/* Supplier side */
export interface OpenItem {
  id: string;
  kind: 'RFQ' | 'Question' | 'PO' | 'Document' | 'Commitment';
  rfqId?: string;
  title: string;
  buyerType: string;
  detail: string;
  due: string;
  status: Status;
}

export interface CatalogueRow { id: string; name: string; hsn: string; material: string; process: string; sizeRange: string; moq: string; state: 'Proposed' | 'Live'; confidence?: number }

/* Admin side */
export interface StuckItem { id: string; doc: string; what: string; party: string; age: string; owner: string; severity: 'crit' | 'warn' }
export interface VerificationCase extends Audited { id: string; vendorId: string; vendor: string; city: string; from: Tier; to: Tier; evidence: string[]; submittedAt: string; firstReviewer?: string; status: Status }
export interface BuyerOrg { id: string; name: string; country: string; plan: string; status: Status; users: number; rfqs: number; pos: number; kyb: Status; trialEnds?: string; costPerRfq: number }
export interface TemplateRow { name: string; category: string; language: string; meta: Status; dlt: Status; sent30d: number; delivered: number; read: number; replied: number }
export interface MeterRow { rfqId: string; buyer: string; docs: number; tokensK: number; messages: number; callMin: number; cost: number; status: Status }
export interface EvalRow { suite: string; cases: number; accuracy: number; calibration: number; costPerDoc: number; p50ms: number; model: string; gate: Status }
export interface Dispute extends Audited { id: string; doc: string; parties: string; type: string; amount: number; opened: string; status: Status; owner: string }
