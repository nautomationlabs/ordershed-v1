/**
 * Sandbox dataset. All companies, people and numbers are fictional.
 * Nothing here comes from any employer, past or present.
 */
import type {
  Alert, AuditEvent, BuyerOrg, CatalogueRow, Commitment, Dispute, DoaRule, DocRecord, EvalRow, ExtractedField,
  Grn, Invoice, Material, MeterRow, OpenItem, Order, QueryThread, Quote, Rfq, Shipment, StuckItem, TemplateRow,
  VerificationCase, Vendor,
} from '../types';

/** Deterministic 64-hex pseudo hash for sandbox records (real hashes are SHA-256 on the backend). */
export function fakeHash(seed: string): string {
  let out = '';
  let h = 2166136261;
  for (let round = 0; out.length < 64; round++) {
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i) + round;
      h = Math.imul(h, 16777619) >>> 0;
    }
    out += h.toString(16).padStart(8, '0');
  }
  return out.slice(0, 64);
}

export const ORG = {
  name: 'Kestrel Motion GmbH',
  short: 'Kestrel Motion',
  plants: [
    { code: 'PNQ-01', name: 'Chakan, Pune', country: 'IN' },
    { code: 'STR-01', name: 'Stuttgart', country: 'DE' },
  ],
};

export const ME = { name: 'Rohan Deshpande', role: 'Purchase head', plant: 'PNQ-01', email: 'rohan.d@kestrel-motion.example' };

const T = (d: string, t = '10:30') => `${d}T${t}:00+05:30`;

export const vendors: Vendor[] = [
  { id: 'VEN-000041', name: 'Sri Murugan Castings', city: 'Hosur', state: 'Tamil Nadu', gstin: '33ABKFS4821M1Z6', tier: 1, categories: ['Castings', 'Machined parts'], processes: ['SG iron casting', 'CNC machining', 'Shot blasting'], certs: ['ISO 9001:2015'], otdPct: 94.2, ppm: 820, distanceKm: 912, replyHours: 6.5, quotes12m: 18, awards12m: 4, employees: '60–80', similarParts: 7, matchScore: 91, changedBy: 'Verifier · K. Iyer', changedAt: T('2026-10-09', '16:12') },
  { id: 'VEN-000012', name: 'Kaveri Precision Forge', city: 'Coimbatore', state: 'Tamil Nadu', gstin: '33AACCK7719Q1ZB', tier: 3, categories: ['Forgings', 'Machined parts'], processes: ['Closed-die forging', 'Heat treatment', 'CNC turning'], certs: ['IATF 16949', 'ISO 14001'], otdPct: 97.8, ppm: 210, distanceKm: 1180, replyHours: 3.2, quotes12m: 26, awards12m: 9, employees: '150–200', buyerMark: 'Preferred', similarParts: 11, matchScore: 88, changedBy: 'L. Fischer', changedAt: T('2026-09-30', '11:04') },
  { id: 'VEN-000027', name: 'Deccan Machine Works', city: 'Chakan, Pune', state: 'Maharashtra', gstin: '27AAGFD3310K1ZQ', tier: 2, categories: ['Machined parts', 'Fabrication'], processes: ['VMC 5-axis', 'HMC', 'CMM inspection'], certs: ['ISO 9001:2015'], otdPct: 95.1, ppm: 450, distanceKm: 8, replyHours: 4.8, quotes12m: 22, awards12m: 6, employees: '80–100', buyerMark: 'Approved', similarParts: 5, matchScore: 84, changedBy: 'A. Mehta', changedAt: T('2026-10-14', '09:40') },
  { id: 'VEN-000058', name: 'Annapoorna Engineering', city: 'Hosur', state: 'Tamil Nadu', gstin: '33BQWPA9902H1Z1', tier: 0, categories: ['Castings', 'Machined parts'], processes: ['Grey iron casting', 'CNC machining'], certs: [], otdPct: null, ppm: null, distanceKm: 915, replyHours: 11.0, quotes12m: 3, awards12m: 0, employees: '20–40', similarParts: 2, matchScore: 63, changedBy: 'System', changedAt: T('2026-10-17', '18:22') },
  { id: 'VEN-000033', name: 'Shakti Valves & Pumps', city: 'Coimbatore', state: 'Tamil Nadu', gstin: '33AAFCS1288L1ZD', tier: 1, categories: ['Valves', 'Pump parts', 'Castings'], processes: ['Investment casting', 'CNC machining', 'Hydro testing'], certs: ['ISO 9001:2015', 'API 6D'], otdPct: 91.0, ppm: 1200, distanceKm: 1175, replyHours: 8.1, quotes12m: 14, awards12m: 3, employees: '100–150', similarParts: 4, matchScore: 79, changedBy: 'Verifier · K. Iyer', changedAt: T('2026-10-02', '12:10') },
  { id: 'VEN-000019', name: 'Nandi Forgings', city: 'Bengaluru', state: 'Karnataka', gstin: '29AAHCN5521E1ZK', tier: 2, categories: ['Forgings', 'Flanges'], processes: ['Open-die forging', 'Ring rolling', 'UT testing'], certs: ['ISO 9001:2015', 'PED 2014/68/EU'], otdPct: 93.4, ppm: 610, distanceKm: 840, replyHours: 5.6, quotes12m: 17, awards12m: 5, employees: '120–150', similarParts: 6, matchScore: 82, changedBy: 'R. Deshpande', changedAt: T('2026-10-11', '15:45') },
  { id: 'VEN-000007', name: 'Rajhans Auto Components', city: 'Bhosari, Pune', state: 'Maharashtra', gstin: '27AABCR6643F1Z8', tier: 3, categories: ['Castings', 'Machined parts'], processes: ['SG iron casting', 'HMC', 'Painting'], certs: ['IATF 16949', 'ISO 9001:2015'], otdPct: 98.1, ppm: 160, distanceKm: 14, replyHours: 2.9, quotes12m: 31, awards12m: 12, employees: '200+', buyerMark: 'Preferred', similarParts: 9, matchScore: 90, changedBy: 'R. Deshpande', changedAt: T('2026-10-06', '10:20') },
  { id: 'VEN-000063', name: 'Velmurugan Tool Room', city: 'Hosur', state: 'Tamil Nadu', gstin: '33CJKPV4410N1ZT', tier: 0, categories: ['Tooling', 'Injection moulds'], processes: ['EDM', 'Wire cut', 'Mould making'], certs: [], otdPct: null, ppm: null, distanceKm: 910, replyHours: null, quotes12m: 0, awards12m: 0, employees: '10–20', similarParts: 0, matchScore: 41, changedBy: 'System', changedAt: T('2026-10-19', '20:05') },
  { id: 'VEN-000045', name: 'Tiruppur Polymer Moulders', city: 'Coimbatore', state: 'Tamil Nadu', gstin: '33AAKFT2207C1ZM', tier: 1, categories: ['Rubber & polymer'], processes: ['Compression moulding', 'Injection moulding'], certs: ['ISO 9001:2015'], otdPct: 92.6, ppm: 900, distanceKm: 1170, replyHours: 7.4, quotes12m: 9, awards12m: 2, employees: '40–60', similarParts: 3, matchScore: 71, changedBy: 'Verifier · S. Rao', changedAt: T('2026-09-26', '14:30') },
  { id: 'VEN-000022', name: 'Sahyadri Electricals & Hardware', city: 'Nashik', state: 'Maharashtra', gstin: '27AAECS8834P1ZJ', tier: 2, categories: ['T&D hardware'], processes: ['Hot-dip galvanising', 'Forging', 'Press work'], certs: ['ISO 9001:2015', 'CPRI type-tested'], otdPct: 94.8, ppm: 520, distanceKm: 205, replyHours: 6.0, quotes12m: 12, awards12m: 4, employees: '100–150', similarParts: 1, matchScore: 58, changedBy: 'A. Mehta', changedAt: T('2026-10-01', '17:15') },
];

export const vendorById = (id: string) => vendors.find((v) => v.id === id)!;

export const rfqs: Rfq[] = [
  { id: 'RFQ-000123', title: 'Gearbox housing, machined', partNo: 'KM-GH-2210', rev: 'C', category: 'Castings', material: 'EN-GJS-500-7', process: 'SG iron casting + CNC machining', annualQty: 4800, lotQty: 400, plant: 'STR-01', status: 'Quoted', createdAt: T('2026-10-13', '09:12'), quoteDue: T('2026-10-20', '18:00'), invited: 6, quotesIn: 4, openQueries: 1, owner: 'L. Fischer', currency: 'INR', shouldCost: { low: 1780, high: 1980, ref: '7 similar quotes · material index Oct-26 · process model v3' }, lastPrice: 2050, incoterm: 'EXW Hosur', sealed: false, changedBy: 'L. Fischer', changedAt: T('2026-10-20', '18:02') },
  { id: 'RFQ-000124', title: 'Pump impeller, closed, 6 vane', partNo: 'KM-PI-0640', rev: 'A', category: 'Pump parts', material: 'CF8M (ASTM A351)', process: 'Investment casting + balancing', annualQty: 1200, lotQty: 200, plant: 'PNQ-01', status: 'Sent', createdAt: T('2026-10-18', '11:40'), quoteDue: T('2026-10-25', '18:00'), invited: 5, quotesIn: 2, openQueries: 2, owner: 'A. Mehta', currency: 'INR', shouldCost: { low: 3100, high: 3550, ref: '4 similar quotes · CF8M index' }, incoterm: 'FCA Coimbatore', sealed: true, changedBy: 'A. Mehta', changedAt: T('2026-10-21', '08:15') },
  { id: 'RFQ-000122', title: 'Steering knuckle forging', partNo: 'KM-SK-1180', rev: 'B', category: 'Forgings', material: '42CrMo4 +QT', process: 'Closed-die forging + machining', annualQty: 9600, lotQty: 800, plant: 'PNQ-01', status: 'Under review', createdAt: T('2026-10-08', '10:05'), quoteDue: T('2026-10-16', '18:00'), invited: 5, quotesIn: 5, openQueries: 0, owner: 'R. Deshpande', currency: 'INR', shouldCost: { low: 980, high: 1120, ref: '11 similar quotes' }, lastPrice: 1165, incoterm: 'EXW Coimbatore', sealed: false, changedBy: 'R. Deshpande', changedAt: T('2026-10-19', '16:40') },
  { id: 'RFQ-000121', title: 'Weld-neck flange 6" ANSI 150', partNo: 'KM-FL-0615', rev: 'A', category: 'Flanges', material: 'ASTM A105', process: 'Forging + machining', annualQty: 2400, lotQty: 300, plant: 'PNQ-01', status: 'Quoted', createdAt: T('2026-10-10', '14:22'), quoteDue: T('2026-10-17', '18:00'), invited: 4, quotesIn: 3, openQueries: 0, owner: 'A. Mehta', currency: 'INR', shouldCost: { low: 1420, high: 1610, ref: '9 similar quotes' }, lastPrice: 1590, incoterm: 'EXW Bengaluru', sealed: false, changedBy: 'A. Mehta', changedAt: T('2026-10-18', '10:12') },
  { id: 'RFQ-000125', title: 'Valve body 4" class 300', partNo: 'KM-VB-0430', rev: 'A', category: 'Valves', material: 'ASTM A216 WCB', process: 'Sand casting + machining + hydro test', annualQty: 600, lotQty: 100, plant: 'STR-01', status: 'Draft', createdAt: T('2026-10-21', '08:50'), quoteDue: T('2026-10-29', '18:00'), invited: 0, quotesIn: 0, openQueries: 0, owner: 'L. Fischer', currency: 'INR', shouldCost: { low: 6800, high: 7900, ref: '3 similar quotes · low sample' }, incoterm: 'FCA Nhava Sheva', sealed: true, changedBy: 'L. Fischer', changedAt: T('2026-10-21', '08:52') },
  { id: 'RFQ-000118', title: 'Motor shaft, splined', partNo: 'KM-MS-0920', rev: 'D', category: 'Forgings', material: '42CrMo4 +QT', process: 'Forging + turning + hobbing + induction hardening', annualQty: 7200, lotQty: 600, plant: 'PNQ-01', status: 'Awarded', createdAt: T('2026-09-22', '09:30'), quoteDue: T('2026-09-29', '18:00'), invited: 5, quotesIn: 4, openQueries: 0, owner: 'R. Deshpande', currency: 'INR', shouldCost: { low: 1240, high: 1390, ref: '8 similar quotes' }, lastPrice: 1455, incoterm: 'EXW Coimbatore', sealed: false, changedBy: 'R. Deshpande', changedAt: T('2026-10-03', '12:00') },
  { id: 'RFQ-000119', title: 'Suspension clamp, 4-bolt', partNo: 'KM-SC-0410', rev: 'B', category: 'T&D hardware', material: 'Malleable iron, HDG', process: 'Casting + galvanising', annualQty: 15000, lotQty: 3000, plant: 'PNQ-01', status: 'Awarded', createdAt: T('2026-09-15', '15:10'), quoteDue: T('2026-09-22', '18:00'), invited: 4, quotesIn: 3, openQueries: 0, owner: 'A. Mehta', currency: 'INR', shouldCost: { low: 205, high: 240, ref: '5 similar quotes' }, lastPrice: 248, incoterm: 'EXW Nashik', sealed: false, changedBy: 'A. Mehta', changedAt: T('2026-09-26', '11:30') },
  { id: 'RFQ-000126', title: 'Battery tray bracket', partNo: 'KM-BT-0077', rev: 'A', category: 'Fabrication', material: 'S355MC 4 mm', process: 'Laser cut + bend + weld + e-coat', annualQty: 12000, lotQty: 1000, plant: 'PNQ-01', status: 'Sent', createdAt: T('2026-10-19', '10:10'), quoteDue: T('2026-10-26', '18:00'), invited: 6, quotesIn: 1, openQueries: 1, owner: 'A. Mehta', currency: 'INR', shouldCost: { low: 410, high: 470, ref: '6 similar quotes' }, incoterm: 'EXW Chakan', sealed: true, changedBy: 'A. Mehta', changedAt: T('2026-10-19', '10:14') },
  { id: 'RFQ-000127', title: 'Cable grommet, EPDM', partNo: 'KM-CG-0012', rev: 'A', category: 'Rubber & polymer', material: 'EPDM 70 Shore A', process: 'Compression moulding', annualQty: 40000, lotQty: 5000, plant: 'STR-01', status: 'Sent', createdAt: T('2026-10-20', '13:30'), quoteDue: T('2026-10-27', '18:00'), invited: 3, quotesIn: 0, openQueries: 0, owner: 'L. Fischer', currency: 'INR', shouldCost: { low: 6.2, high: 7.4, ref: '2 similar quotes · low sample' }, incoterm: 'FCA Chennai', sealed: true, changedBy: 'L. Fischer', changedAt: T('2026-10-20', '13:31') },
  { id: 'RFQ-000117', title: 'Brake caliper bracket', partNo: 'KM-BC-0330', rev: 'B', category: 'Castings', material: 'EN-GJS-600-3', process: 'SG iron casting + machining', annualQty: 6000, lotQty: 500, plant: 'PNQ-01', status: 'Expired', createdAt: T('2026-09-10', '09:00'), quoteDue: T('2026-09-17', '18:00'), invited: 3, quotesIn: 1, openQueries: 0, owner: 'A. Mehta', currency: 'INR', shouldCost: { low: 640, high: 720, ref: '5 similar quotes' }, incoterm: 'EXW Pune', sealed: false, changedBy: 'System', changedAt: T('2026-09-17', '18:00') },
];

export const rfqById = (id: string) => rfqs.find((r) => r.id === id);

const q = (v: number, ref: string) => ({ value: v, source: 'supplier' as const, ref });

export const quotes: Quote[] = [
  { id: 'Q-000418', rfqId: 'RFQ-000123', vendorId: 'VEN-000041', exwUnit: q(1840, 'Quote Q-000418 · 18-10-2026'), tooling: q(240000, 'Quote Q-000418 · pattern + fixtures'), leadDays: 42, moq: 400, validityDays: 60, submittedAt: T('2026-10-18', '19:42'), channel: 'WhatsApp', hash: fakeHash('Q-000418'), deviations: ['Surface finish Ra 3.2 on bore Ø62 instead of Ra 1.6; offers honing at +₹38'], exclusions: ['Packing for sea freight'], paymentTerms: '30 days from GRN', status: 'Submitted' },
  { id: 'Q-000421', rfqId: 'RFQ-000123', vendorId: 'VEN-000027', exwUnit: q(1915, 'Quote Q-000421 · 19-10-2026'), tooling: q(180000, 'Quote Q-000421 · fixtures only, pattern buyer-owned'), leadDays: 35, moq: 200, validityDays: 45, submittedAt: T('2026-10-19', '11:05'), channel: 'Web', hash: fakeHash('Q-000421'), deviations: [], exclusions: [], paymentTerms: '45 days from GRN', status: 'Submitted' },
  { id: 'Q-000424', rfqId: 'RFQ-000123', vendorId: 'VEN-000058', exwUnit: q(1690, 'Quote Q-000424 · 19-10-2026'), tooling: q(310000, 'Quote Q-000424'), leadDays: 56, moq: 500, validityDays: 30, submittedAt: T('2026-10-19', '22:18'), channel: 'Voice', hash: fakeHash('Q-000424'), deviations: ['No CMM report; offers height gauge inspection'], exclusions: ['MTC per heat', 'Machining of M8 threads'], paymentTerms: '50% advance', status: 'Submitted' },
  { id: 'Q-000427', rfqId: 'RFQ-000123', vendorId: 'VEN-000007', exwUnit: q(1960, 'Quote Q-000427 · 20-10-2026'), tooling: q(150000, 'Quote Q-000427'), leadDays: 30, moq: 400, validityDays: 90, submittedAt: T('2026-10-20', '15:51'), channel: 'Web', hash: fakeHash('Q-000427'), deviations: [], exclusions: [], paymentTerms: '60 days from GRN', status: 'Submitted' },
];

export const extraction: ExtractedField[] = [
  { key: 'partNo', label: 'Part number', tech: 'MARA-MATNR · title block', value: 'KM-GH-2210', confidence: 0.99, span: 'Title block, cell B2', confirmed: true },
  { key: 'rev', label: 'Revision', tech: 'Drawing revision · title block', value: 'C', confidence: 0.97, span: 'Title block, REV', confirmed: true },
  { key: 'material', label: 'Material', tech: 'Material spec · EN 1563', value: 'EN-GJS-500-7', confidence: 0.94, span: 'Note 2', confirmed: true },
  { key: 'process', label: 'Process', tech: 'Inferred from material + notes', value: 'SG iron casting + CNC machining', confidence: 0.86, span: 'Notes 2, 5' },
  { key: 'weight', label: 'Weight', tech: 'Net mass · title block', value: '11.4', unit: 'kg', confidence: 0.91, span: 'Title block, MASS' },
  { key: 'envelope', label: 'Envelope', tech: 'Max bounding box L × W × H', value: '286 × 214 × 162', unit: 'mm', confidence: 0.82, span: 'Views A, B' },
  { key: 'critical', label: 'Critical features', tech: 'GD&T callouts with tolerance ≤ 0.02', value: 'Bore Ø62 H7, position 0.02 to datum A; face flatness 0.03', confidence: 0.71, span: 'View A, callouts 4 and 7' },
  { key: 'ht', label: 'Heat treatment', tech: 'Heat treatment note', value: 'None specified', confidence: 0.64, span: 'No note found' },
  { key: 'finish', label: 'Finish', tech: 'Surface finish / coating', value: 'Ra 1.6 on bores; primer RAL 7035 outside', confidence: 0.88, span: 'Note 6, symbol at bore' },
  { key: 'inspection', label: 'Inspection', tech: 'Inspection / test requirements', value: 'CMM report on first article; MTC 3.1 per heat', confidence: 0.79, span: 'Note 8' },
  { key: 'annualQty', label: 'Annual quantity', tech: 'From requisition, not drawing', value: '4,800', unit: 'pcs', confidence: 0.99, span: 'Requisition PR-77310', confirmed: true },
];

export const orders: Order[] = [
  { id: 'PO-000456', rfqId: 'RFQ-000118', vendorId: 'VEN-000012', title: 'Motor shaft, splined', plant: 'PNQ-01', value: 9446400, currency: 'INR', status: 'In production', issuedAt: T('2026-10-03', '12:10'), ackAt: T('2026-10-03', '16:44'), needBy: T('2026-11-14'), incoterm: 'EXW Coimbatore', paymentTerms: '45 days from GRN', progressPct: 55, lines: [{ line: 10, partNo: 'KM-MS-0920', desc: 'Motor shaft, splined, rev D', qty: 7200, unit: 'pcs', unitPrice: 1312, hsn: '8483.10', taxPct: 18 }], changedBy: 'Kaveri Precision Forge', changedAt: T('2026-10-20', '17:20') },
  { id: 'PO-000452', rfqId: 'RFQ-000119', vendorId: 'VEN-000022', title: 'Suspension clamp, 4-bolt', plant: 'PNQ-01', value: 3285000, currency: 'INR', status: 'Shipped', issuedAt: T('2026-09-26', '11:40'), ackAt: T('2026-09-26', '15:02'), needBy: T('2026-10-24'), incoterm: 'EXW Nashik', paymentTerms: '30 days from GRN', progressPct: 85, lines: [{ line: 10, partNo: 'KM-SC-0410', desc: 'Suspension clamp, 4-bolt, HDG', qty: 15000, unit: 'pcs', unitPrice: 219, hsn: '7325.99', taxPct: 18 }], changedBy: 'Sahyadri Electricals & Hardware', changedAt: T('2026-10-19', '18:05') },
  { id: 'PO-000458', rfqId: 'RFQ-000121', vendorId: 'VEN-000019', title: 'Weld-neck flange 6" ANSI 150', plant: 'PNQ-01', value: 3624000, currency: 'INR', status: 'Awaiting ack', issuedAt: T('2026-10-20', '17:30'), needBy: T('2026-11-28'), incoterm: 'EXW Bengaluru', paymentTerms: '45 days from GRN', progressPct: 5, lines: [{ line: 10, partNo: 'KM-FL-0615', desc: 'Weld-neck flange 6" ANSI 150 RF', qty: 2400, unit: 'pcs', unitPrice: 1510, hsn: '7307.91', taxPct: 18 }], changedBy: 'R. Deshpande', changedAt: T('2026-10-20', '17:30') },
  { id: 'PO-000449', rfqId: 'RFQ-000109', vendorId: 'VEN-000007', title: 'Differential carrier, machined', plant: 'PNQ-01', value: 5880000, currency: 'INR', status: 'Received', issuedAt: T('2026-08-28', '10:00'), ackAt: T('2026-08-28', '13:15'), needBy: T('2026-10-15'), incoterm: 'EXW Pune', paymentTerms: '60 days from GRN', progressPct: 95, lines: [{ line: 10, partNo: 'KM-DC-1500', desc: 'Differential carrier, machined, rev B', qty: 2400, unit: 'pcs', unitPrice: 2450, hsn: '8708.50', taxPct: 28 }], changedBy: 'Stores · PNQ-01', changedAt: T('2026-10-16', '15:30') },
  { id: 'PO-000447', rfqId: 'RFQ-000104', vendorId: 'VEN-000027', title: 'Motor end cover', plant: 'PNQ-01', value: 1416000, currency: 'INR', status: 'Matched', issuedAt: T('2026-08-14', '09:20'), ackAt: T('2026-08-14', '11:00'), needBy: T('2026-09-30'), incoterm: 'EXW Chakan', paymentTerms: '45 days from GRN', progressPct: 100, lines: [{ line: 10, partNo: 'KM-EC-0210', desc: 'Motor end cover, machined', qty: 1200, unit: 'pcs', unitPrice: 1180, hsn: '8503.00', taxPct: 18 }], changedBy: 'P. Nair', changedAt: T('2026-10-12', '12:45') },
  { id: 'PO-000444', rfqId: 'RFQ-000101', vendorId: 'VEN-000033', title: 'Ball valve body 2" CF8M', plant: 'STR-01', value: 2170000, currency: 'INR', status: 'In transit', issuedAt: T('2026-08-05', '14:00'), ackAt: T('2026-08-06', '10:10'), needBy: T('2026-11-05'), incoterm: 'FCA Nhava Sheva', paymentTerms: '30 days from B/L', progressPct: 75, lines: [{ line: 10, partNo: 'KM-BV-0220', desc: 'Ball valve body 2" CF8M', qty: 1000, unit: 'pcs', unitPrice: 2170, hsn: '8481.90', taxPct: 0 }], changedBy: 'Shakti Valves & Pumps', changedAt: T('2026-10-08', '09:00') },
  { id: 'PO-000441', rfqId: 'RFQ-000098', vendorId: 'VEN-000041', title: 'Pump casing, volute', plant: 'PNQ-01', value: 1968000, currency: 'INR', status: 'Held', issuedAt: T('2026-07-30', '10:30'), ackAt: T('2026-07-30', '18:00'), needBy: T('2026-09-20'), incoterm: 'EXW Hosur', paymentTerms: '30 days from GRN', progressPct: 95, lines: [{ line: 10, partNo: 'KM-PC-0880', desc: 'Pump casing, volute, FG260', qty: 800, unit: 'pcs', unitPrice: 2460, hsn: '8413.91', taxPct: 18 }], changedBy: 'P. Nair', changedAt: T('2026-10-15', '11:20') },
];

export const orderById = (id: string) => orders.find((o) => o.id === id);

const cc = (ok: boolean[]): Shipment['crossCheck'] => {
  const rows = [
    { key: 'qty', label: 'Quantity' },
    { key: 'hsn', label: 'HSN' },
    { key: 'gstin', label: 'Consignee GSTIN' },
    { key: 'value', label: 'Invoice value' },
    { key: 'incoterm', label: 'Incoterm' },
    { key: 'consignee', label: 'Consignee address' },
  ];
  return rows.map((r, i) => ({ ...r, po: '', doc: '', ok: ok[i] ?? true }));
};

export const shipments: Shipment[] = [
  { id: 'ASN-000211', poId: 'PO-000452', vendorId: 'VEN-000022', mode: 'Road', carrier: 'VRL Logistics', lrNo: 'NSK4471209', ewayBill: '3410 8821 7765', shippedQty: 7500, dispatchedAt: T('2026-10-19', '17:40'), eta: T('2026-10-22', '12:00'), status: 'In transit', crossCheck: cc([true, true, true, true, true, true]), changedBy: 'Sahyadri Electricals & Hardware', changedAt: T('2026-10-19', '18:05') },
  { id: 'ASN-000208', poId: 'PO-000449', vendorId: 'VEN-000007', mode: 'Road', carrier: 'Own vehicle', lrNo: 'RAC-DC-0915', ewayBill: '2710 4410 2281', shippedQty: 2400, receivedQty: 2400, dispatchedAt: T('2026-10-15', '09:30'), eta: T('2026-10-15', '14:00'), status: 'Received', crossCheck: cc([true, true, true, true, true, true]), changedBy: 'Stores · PNQ-01', changedAt: T('2026-10-16', '15:30') },
  { id: 'ASN-000204', poId: 'PO-000444', vendorId: 'VEN-000033', mode: 'Sea', carrier: 'Maersk · MSKU 7712093', lrNo: 'B/L MAEU 2611 04528', shippedQty: 1000, dispatchedAt: T('2026-10-04', '10:00'), eta: T('2026-11-03', '10:00'), status: 'In transit', crossCheck: cc([true, true, true, true, true, true]), changedBy: 'Shakti Valves & Pumps', changedAt: T('2026-10-08', '09:00') },
  { id: 'ASN-000213', poId: 'PO-000456', vendorId: 'VEN-000012', mode: 'Road', carrier: 'Gati', lrNo: 'pending', shippedQty: 1800, dispatchedAt: T('2026-10-21', '16:00'), eta: T('2026-10-24', '12:00'), status: 'Blocked', crossCheck: cc([true, false, true, true, true, true]), changedBy: 'System · cross-check', changedAt: T('2026-10-21', '08:40') },
  { id: 'ASN-000199', poId: 'PO-000441', vendorId: 'VEN-000041', mode: 'Road', carrier: 'TCI Freight', lrNo: 'HSR8812044', ewayBill: '3310 2209 1184', shippedQty: 800, receivedQty: 776, dispatchedAt: T('2026-09-18', '11:00'), eta: T('2026-09-20', '12:00'), status: 'Received', crossCheck: cc([true, true, true, true, true, true]), changedBy: 'Stores · PNQ-01', changedAt: T('2026-09-21', '10:15') },
];
shipments[3]!.crossCheck[1] = { key: 'hsn', label: 'HSN', po: '8483.10', doc: '8483.40', ok: false };

export const grns: Grn[] = [
  { id: 'GRN-000789', poId: 'PO-000449', asnId: 'ASN-000208', vendorId: 'VEN-000007', plant: 'PNQ-01', receivedAt: T('2026-10-15', '14:20'), qtyReceived: 2400, qtyAccepted: 2400, qtyRejected: 0, status: 'Accepted', inspector: 'M. Kulkarni', changedBy: 'M. Kulkarni', changedAt: T('2026-10-16', '15:30') },
  { id: 'GRN-000781', poId: 'PO-000441', asnId: 'ASN-000199', vendorId: 'VEN-000041', plant: 'PNQ-01', receivedAt: T('2026-09-20', '13:10'), qtyReceived: 776, qtyAccepted: 752, qtyRejected: 24, status: 'Partially accepted', inspector: 'M. Kulkarni', note: '24 short on LR vs ASN; 24 rejected for blow holes on flange face', changedBy: 'M. Kulkarni', changedAt: T('2026-09-21', '10:15') },
  { id: 'GRN-000776', poId: 'PO-000447', asnId: 'ASN-000192', vendorId: 'VEN-000027', plant: 'PNQ-01', receivedAt: T('2026-09-28', '11:00'), qtyReceived: 1200, qtyAccepted: 1200, qtyRejected: 0, status: 'Accepted', inspector: 'S. Pawar', changedBy: 'S. Pawar', changedAt: T('2026-09-28', '16:40') },
];

export const invoices: Invoice[] = [
  { id: 'INV-000302', supplierInvoiceNo: 'RAC/26-27/0881', irn: 'a4f1…9c2e', poId: 'PO-000449', grnId: 'GRN-000789', vendorId: 'VEN-000007', amount: 5880000, tax: 1646400, status: 'Matched', receivedAt: T('2026-10-16', '10:00'), msmeDue: T('2026-11-30'), dueAt: T('2026-12-14'), qty: 2400, unitPrice: 2450, hsn: '8708.50', taxPct: 28, changedBy: 'System · 3-way match', changedAt: T('2026-10-16', '16:02') },
  { id: 'INV-000298', supplierInvoiceNo: 'SMC/0412/26', irn: '7be0…11af', poId: 'PO-000441', grnId: 'GRN-000781', vendorId: 'VEN-000041', amount: 1968000, tax: 354240, status: 'Held', receivedAt: T('2026-09-22', '12:00'), msmeDue: T('2026-11-04'), dueAt: T('2026-10-21'), qty: 800, unitPrice: 2460, hsn: '8413.91', taxPct: 18, note: 'Invoiced 800; accepted 752. Debit note draft DN-000031 for 48 pcs.', changedBy: 'P. Nair', changedAt: T('2026-10-15', '11:20') },
  { id: 'INV-000295', supplierInvoiceNo: 'DMW/2026/1177', irn: '0c9d…e512', poId: 'PO-000447', grnId: 'GRN-000776', vendorId: 'VEN-000027', amount: 1416000, tax: 254880, status: 'Paid', receivedAt: T('2026-09-29', '09:00'), msmeDue: T('2026-11-12'), dueAt: T('2026-11-12'), qty: 1200, unitPrice: 1180, hsn: '8503.00', taxPct: 18, changedBy: 'P. Nair', changedAt: T('2026-10-12', '12:45') },
  { id: 'INV-000305', supplierInvoiceNo: 'SEH/IN/2026/552', irn: '5d22…0b7a', poId: 'PO-000452', vendorId: 'VEN-000022', amount: 1642500, tax: 295650, status: 'Pending', receivedAt: T('2026-10-19', '18:30'), msmeDue: T('2026-12-03'), dueAt: T('2026-11-21'), qty: 7500, unitPrice: 219, hsn: '7325.99', taxPct: 18, note: 'Waiting for GRN against ASN-000211', changedBy: 'System', changedAt: T('2026-10-19', '18:31') },
  { id: 'INV-000306', supplierInvoiceNo: 'KPF/26-27/1420', irn: '9e71…a0c4', poId: 'PO-000456', vendorId: 'VEN-000012', amount: 2361600, tax: 425088, status: 'Held', receivedAt: T('2026-10-21', '08:30'), dueAt: T('2026-12-05'), qty: 1800, unitPrice: 1312, hsn: '8483.40', taxPct: 18, note: 'HSN on invoice 8483.40 vs PO 8483.10', changedBy: 'System · 3-way match', changedAt: T('2026-10-21', '08:41') },
];

export const commitments: Commitment[] = [
  { id: 'CM-0141', item: 'Acknowledge PO-000458', doc: 'PO-000458', owner: 'Nandi Forgings', ownerSide: 'Supplier', party: 'Nandi Forgings', due: T('2026-10-21', '18:00'), lane: 'Waiting on supplier', reminders: 1, action: 'Nudge on WhatsApp' },
  { id: 'CM-0138', item: 'First-article samples, 5 pcs + CMM report', doc: 'PO-000456', owner: 'Kaveri Precision Forge', ownerSide: 'Supplier', party: 'Kaveri Precision Forge', due: T('2026-10-23'), lane: 'Waiting on supplier', reminders: 0, action: 'View' },
  { id: 'CM-0136', item: 'Fix HSN on dispatch docs (8483.10)', doc: 'ASN-000213', owner: 'Kaveri Precision Forge', ownerSide: 'Supplier', party: 'Kaveri Precision Forge', due: T('2026-10-21', '16:00'), lane: 'Waiting on supplier', reminders: 2, action: 'Escalate to ops' },
  { id: 'CM-0142', item: 'Answer query on bore finish Ra 1.6', doc: 'RFQ-000123', owner: 'L. Fischer', ownerSide: 'Buyer', party: 'Supplier B', due: T('2026-10-21', '17:00'), lane: 'Waiting on us', reminders: 0, action: 'Review draft' },
  { id: 'CM-0139', item: 'Approve award decision pack', doc: 'RFQ-000123', owner: 'R. Deshpande', ownerSide: 'Buyer', party: '—', due: T('2026-10-22'), lane: 'Due this week', reminders: 0, action: 'Open pack' },
  { id: 'CM-0135', item: 'Debit note DN-000031 for 48 pcs', doc: 'INV-000298', owner: 'P. Nair', ownerSide: 'Buyer', party: 'Sri Murugan Castings', due: T('2026-10-18'), lane: 'Waiting on us', reminders: 2, action: 'Approve draft' },
  { id: 'CM-0143', item: 'Receive ASN-000211, 7,500 pcs', doc: 'ASN-000211', owner: 'Stores · PNQ-01', ownerSide: 'Buyer', party: 'Sahyadri Electricals', due: T('2026-10-22', '12:00'), lane: 'Due this week', reminders: 0, action: 'Post GRN' },
  { id: 'CM-0144', item: 'Upload MTC 3.1 for heat H-2291', doc: 'PO-000456', owner: 'Kaveri Precision Forge', ownerSide: 'Supplier', party: 'Kaveri Precision Forge', due: T('2026-10-24'), lane: 'Due this week', reminders: 0, action: 'View' },
  { id: 'CM-0130', item: 'Tooling invoice, pattern KM-GH', doc: 'PO-000441', owner: 'Sri Murugan Castings', ownerSide: 'Supplier', party: 'Sri Murugan Castings', due: T('2026-10-12'), lane: 'Done', reminders: 1, action: 'View' },
  { id: 'CM-0129', item: 'PPAP level 3 submission', doc: 'PO-000449', owner: 'Rajhans Auto Components', ownerSide: 'Supplier', party: 'Rajhans Auto Components', due: T('2026-10-10'), lane: 'Done', reminders: 0, action: 'View' },
];

export const queries: QueryThread[] = [
  { id: 'QRY-000088', rfqId: 'RFQ-000123', vendorAlias: 'Supplier B · Hosur', question: 'Bore Ø62 H7 asks Ra 1.6. Can we quote Ra 3.2 and hone only the bearing seat? Honing all bores adds ₹38 per piece.', askedAt: T('2026-10-19', '08:14'), owner: 'L. Fischer', deadline: T('2026-10-21', '17:00'), status: 'Open', channel: 'WhatsApp', draft: { text: 'Ra 1.6 is required on the bearing seat (bore Ø62 H7, 28 mm from datum A). The other bores may be Ra 3.2. Please quote honing on the bearing seat only and show it as a separate line.', confidence: 0.82, sources: ['Drawing KM-GH-2210 rev C, note 6', 'Similar part KM-GH-1980 PO line 10'] } },
  { id: 'QRY-000091', rfqId: 'RFQ-000124', vendorAlias: 'Supplier A · Coimbatore', question: 'Dynamic balancing grade G6.3 or G2.5? The drawing note is not clear.', askedAt: T('2026-10-20', '12:40'), owner: 'A. Mehta', deadline: T('2026-10-22', '17:00'), status: 'Open', channel: 'Web', draft: { text: 'Balance to G6.3 per ISO 21940-11 at 2,900 rpm. Please include the balancing report with each lot.', confidence: 0.68, sources: ['Drawing KM-PI-0640 rev A, note 4 (partly legible)'] } },
  { id: 'QRY-000092', rfqId: 'RFQ-000124', vendorAlias: 'Supplier C · Coimbatore', question: 'Is a radiography report needed on every impeller or per heat?', askedAt: T('2026-10-20', '17:02'), owner: 'A. Mehta', deadline: T('2026-10-22', '17:00'), status: 'Open', channel: 'WhatsApp' },
  { id: 'QRY-000093', rfqId: 'RFQ-000126', vendorAlias: 'Supplier A · Chakan', question: 'Can we use S420MC if S355MC is short? Same thickness.', askedAt: T('2026-10-20', '10:20'), owner: 'A. Mehta', deadline: T('2026-10-23', '17:00'), status: 'Open', channel: 'WhatsApp' },
  { id: 'QRY-000085', rfqId: 'RFQ-000122', vendorAlias: 'Supplier D · Coimbatore', question: 'Flash trim tolerance 0.8 mm acceptable?', askedAt: T('2026-10-12', '09:00'), owner: 'R. Deshpande', deadline: T('2026-10-14', '17:00'), status: 'Answered', channel: 'Web', answer: 'Yes, flash up to 0.8 mm on non-machined surfaces is acceptable.' },
];

const trend = (base: number, steps: number[]) => steps.map((s) => Math.round(base * (1 + s / 100)));

export const materials: Material[] = [
  { id: 'MAT-000120', partCode: 'KM-GH-2210', erpCode: '4100-22100', desc: 'Gearbox housing, machined', material: 'EN-GJS-500-7', process: 'SG casting + CNC', heatTreatment: '—', finish: 'Ra 1.6 bores; RAL 7035', weightKg: 11.4, hsn: '8483.90', rev: 'C', suppliers: 0, lastPrice: 2050, priceTrend: trend(2050, [4, 3, 2, 3, 1, 0]), rfqs: 1, singleSource: false, changedBy: 'L. Fischer', changedAt: T('2026-10-13', '09:12') },
  { id: 'MAT-000098', partCode: 'KM-MS-0920', erpCode: '4100-09200', desc: 'Motor shaft, splined', material: '42CrMo4 +QT', process: 'Forging + turning + hobbing', heatTreatment: 'QT + induction 52–56 HRC', finish: 'Ground Ø35 k6', weightKg: 3.8, hsn: '8483.10', rev: 'D', suppliers: 2, lastPrice: 1312, priceTrend: trend(1312, [11, 10, 8, 9, 6, 0]), rfqs: 3, singleSource: false, changedBy: 'R. Deshpande', changedAt: T('2026-10-03', '12:00') },
  { id: 'MAT-000101', partCode: 'KM-SC-0410', erpCode: '5200-04100', desc: 'Suspension clamp, 4-bolt', material: 'Malleable iron', process: 'Casting + HDG', heatTreatment: '—', finish: 'HDG 86 µm', weightKg: 1.2, hsn: '7325.99', rev: 'B', suppliers: 1, lastPrice: 219, priceTrend: trend(219, [13, 12, 10, 10, 8, 0]), rfqs: 2, singleSource: true, changedBy: 'A. Mehta', changedAt: T('2026-09-26', '11:30') },
  { id: 'MAT-000094', partCode: 'KM-DC-1500', erpCode: '4100-15000', desc: 'Differential carrier, machined', material: 'EN-GJS-600-3', process: 'SG casting + HMC', heatTreatment: '—', finish: 'Painted black', weightKg: 9.6, hsn: '8708.50', rev: 'B', suppliers: 2, lastPrice: 2450, priceTrend: trend(2450, [2, 2, 1, 0, 0, 0]), rfqs: 2, singleSource: false, changedBy: 'R. Deshpande', changedAt: T('2026-08-28', '10:00') },
  { id: 'MAT-000090', partCode: 'KM-EC-0210', erpCode: '4100-02100', desc: 'Motor end cover', material: 'EN AC-46000', process: 'HPDC + machining', heatTreatment: '—', finish: 'As cast', weightKg: 1.9, hsn: '8503.00', rev: 'A', suppliers: 1, lastPrice: 1180, priceTrend: trend(1180, [0, 1, 1, 0, 0, 0]), rfqs: 1, singleSource: true, changedBy: 'A. Mehta', changedAt: T('2026-08-14', '09:20') },
  { id: 'MAT-000087', partCode: 'KM-BV-0220', erpCode: '6300-02200', desc: 'Ball valve body 2" CF8M', material: 'CF8M', process: 'Investment casting', heatTreatment: 'Solution annealed', finish: 'Pickled & passivated', weightKg: 2.7, hsn: '8481.90', rev: 'A', suppliers: 1, lastPrice: 2170, priceTrend: trend(2170, [6, 5, 3, 2, 1, 0]), rfqs: 1, singleSource: true, changedBy: 'L. Fischer', changedAt: T('2026-08-05', '14:00') },
  { id: 'MAT-000084', partCode: 'KM-PC-0880', erpCode: '6300-08800', desc: 'Pump casing, volute', material: 'EN-GJL-260', process: 'Sand casting + machining', heatTreatment: '—', finish: 'Primer', weightKg: 18.2, hsn: '8413.91', rev: 'B', suppliers: 1, lastPrice: 2460, priceTrend: trend(2460, [3, 3, 2, 1, 0, 0]), rfqs: 1, singleSource: true, changedBy: 'R. Deshpande', changedAt: T('2026-07-30', '10:30') },
  { id: 'MAT-000081', partCode: 'KM-FL-0615', erpCode: '6300-06150', desc: 'Weld-neck flange 6" ANSI 150', material: 'ASTM A105', process: 'Forging + machining', heatTreatment: 'Normalised', finish: 'Rust-preventive oil', weightKg: 8.6, hsn: '7307.91', rev: 'A', suppliers: 1, lastPrice: 1510, priceTrend: trend(1510, [5, 6, 4, 3, 5, 0]), rfqs: 1, singleSource: false, changedBy: 'A. Mehta', changedAt: T('2026-10-20', '17:30') },
];

export const docs: DocRecord[] = [
  { id: 'PO-000458', type: 'Purchase order', poId: 'PO-000458', party: 'Nandi Forgings', issuedAt: T('2026-10-20', '17:30'), status: 'Sent', lines: 1, linked: true, source: 'Generated' },
  { id: 'ACK-000456', type: 'PO acknowledgement', poId: 'PO-000456', party: 'Kaveri Precision Forge', issuedAt: T('2026-10-03', '16:44'), status: 'Accepted', lines: 1, linked: true, source: 'Supplier' },
  { id: 'MTC-H2291', type: 'Mill test certificate 3.1', poId: 'PO-000456', party: 'Kaveri Precision Forge', issuedAt: T('2026-10-18', '12:00'), status: 'Pending', lines: 1, linked: true, source: 'Supplier' },
  { id: 'EWB-341088217765', type: 'E-way bill', poId: 'PO-000452', party: 'Sahyadri Electricals & Hardware', issuedAt: T('2026-10-19', '17:30'), status: 'Verified', lines: 1, linked: true, source: 'Supplier' },
  { id: 'TI-SEH-552', type: 'Tax invoice (e-invoice)', poId: 'PO-000452', party: 'Sahyadri Electricals & Hardware', issuedAt: T('2026-10-19', '17:20'), status: 'Verified', lines: 1, linked: true, source: 'Supplier' },
  { id: 'DC-SEH-0193', type: 'Delivery challan', poId: 'PO-000452', party: 'Sahyadri Electricals & Hardware', issuedAt: T('2026-10-19', '17:25'), status: 'Verified', lines: 1, linked: true, source: 'Supplier' },
  { id: 'PL-KPF-0412', type: 'Packing list', poId: 'PO-000456', party: 'Kaveri Precision Forge', issuedAt: T('2026-10-21', '07:50'), status: 'Failed', lines: 1, linked: true, source: 'Supplier' },
  { id: 'GRN-000789', type: 'Goods receipt note', poId: 'PO-000449', party: 'Stores · PNQ-01', issuedAt: T('2026-10-15', '14:20'), status: 'Accepted', lines: 1, linked: true, source: 'Buyer' },
  { id: 'DN-000031', type: 'Debit note (draft)', poId: 'PO-000441', party: 'Sri Murugan Castings', issuedAt: T('2026-10-15', '11:20'), status: 'Draft', lines: 1, linked: true, source: 'Generated' },
  { id: 'SB-4471920', type: 'Shipping bill', poId: 'PO-000444', party: 'Shakti Valves & Pumps', issuedAt: T('2026-10-03', '15:00'), status: 'Verified', lines: 1, linked: true, source: 'Supplier' },
  { id: 'BL-MAEU261104528', type: 'Bill of lading', poId: 'PO-000444', party: 'Shakti Valves & Pumps', issuedAt: T('2026-10-04', '10:00'), status: 'Verified', lines: 1, linked: true, source: 'Supplier' },
  { id: 'COO-0921', type: 'Certificate of origin', poId: 'PO-000444', party: 'Shakti Valves & Pumps', issuedAt: T('2026-10-03', '12:30'), status: 'Verified', lines: 1, linked: true, source: 'Supplier' },
];

const auditRaw: Omit<AuditEvent, 'hash' | 'prev'>[] = [
  { seq: 48213, at: T('2026-10-21', '08:41'), actor: 'System', role: 'Matcher', action: 'Invoice held', doc: 'INV-000306', detail: 'HSN mismatch 8483.40 vs PO 8483.10' },
  { seq: 48212, at: T('2026-10-21', '08:40'), actor: 'System', role: 'Cross-check', action: 'Dispatch blocked', doc: 'ASN-000213', detail: '1 of 6 checks failed: HSN' },
  { seq: 48211, at: T('2026-10-21', '08:15'), actor: 'A. Mehta', role: 'Buyer', action: 'Query published', doc: 'RFQ-000124', detail: 'QRY-000090 answer approved from AI draft (edited)' },
  { seq: 48210, at: T('2026-10-20', '18:02'), actor: 'System', role: 'Scheduler', action: 'Sealed period ended', doc: 'RFQ-000123', detail: '4 quotes unsealed; hashes verified' },
  { seq: 48209, at: T('2026-10-20', '17:30'), actor: 'R. Deshpande', role: 'Purchase head', action: 'PO issued', doc: 'PO-000458', detail: '₹ 36,24,000.00 · DoA L2 approved' },
  { seq: 48208, at: T('2026-10-20', '17:12'), actor: 'R. Deshpande', role: 'Purchase head', action: 'Award approved', doc: 'RFQ-000121', detail: 'Nandi Forgings · L2 approver 2 of 2' },
  { seq: 48207, at: T('2026-10-20', '15:51'), actor: 'Rajhans Auto Components', role: 'Supplier · Owner', action: 'Quote sealed', doc: 'RFQ-000123', detail: 'Q-000427 hash recorded' },
  { seq: 48206, at: T('2026-10-20', '11:02'), actor: 'K. Iyer', role: 'Admin · Verifier', action: 'Tier changed', doc: 'VEN-000041', detail: 'Self-declared → Document-verified (first reviewer)' },
  { seq: 48205, at: T('2026-10-20', '10:47'), actor: 'S. Rao', role: 'Admin · Verifier', action: 'Tier change confirmed', doc: 'VEN-000041', detail: 'Four-eyes second review' },
  { seq: 48204, at: T('2026-10-19', '22:18'), actor: 'Annapoorna Engineering', role: 'Supplier · Owner', action: 'Voice quote confirmed', doc: 'RFQ-000123', detail: 'Q-000424 parsed (Tamil) → confirmation card accepted' },
  { seq: 48203, at: T('2026-10-19', '18:05'), actor: 'Sahyadri Electricals & Hardware', role: 'Supplier · Dispatch', action: 'Dispatch cross-check passed', doc: 'ASN-000211', detail: '6 of 6 checks passed' },
  { seq: 48202, at: T('2026-10-19', '11:05'), actor: 'Deccan Machine Works', role: 'Supplier · Quoting', action: 'Quote sealed', doc: 'RFQ-000123', detail: 'Q-000421 hash recorded' },
];

export const audit: AuditEvent[] = (() => {
  const chron = [...auditRaw].reverse();
  let prev = fakeHash('genesis-48201');
  const withHash = chron.map((e) => {
    const hash = fakeHash(`${prev}|${e.seq}|${e.action}|${e.doc}`);
    const row = { ...e, prev, hash };
    prev = hash;
    return row;
  });
  return withHash.reverse();
})();

export const doaRules: DoaRule[] = [
  { level: 'L1', maxInr: 2_500_000, approvers: ['Buyer'], fourEyes: false, version: 4, changedBy: 'R. Deshpande', changedAt: T('2026-09-01', '10:00') },
  { level: 'L2', maxInr: 20_000_000, approvers: ['Buyer', 'Purchase head'], fourEyes: false, version: 4, changedBy: 'R. Deshpande', changedAt: T('2026-09-01', '10:00') },
  { level: 'L3', maxInr: null, approvers: ['Plant head', 'CFO'], fourEyes: false, version: 4, changedBy: 'R. Deshpande', changedAt: T('2026-09-01', '10:00') },
  { level: 'Vendor approve / block', maxInr: null, approvers: ['Purchase head', 'Plant head'], fourEyes: true, version: 2, changedBy: 'M. Brandt', changedAt: T('2026-08-12', '14:20') },
  { level: 'GCP / SCP deviation', maxInr: null, approvers: ['Purchase head', 'Legal'], fourEyes: true, version: 1, changedBy: 'M. Brandt', changedAt: T('2026-08-12', '14:20') },
];

export const alerts: Alert[] = [
  { id: 'AL-1', text: 'Dispatch blocked: HSN on packing list does not match PO', doc: 'ASN-000213', tone: 'crit', at: T('2026-10-21', '08:40') },
  { id: 'AL-2', text: 'Invoice held: HSN mismatch', doc: 'INV-000306', tone: 'crit', at: T('2026-10-21', '08:41') },
  { id: 'AL-3', text: 'PO not acknowledged after 1 reminder', doc: 'PO-000458', tone: 'warn', at: T('2026-10-21', '09:00') },
  { id: 'AL-4', text: '4 quotes unsealed, ready to compare', doc: 'RFQ-000123', tone: 'accent', at: T('2026-10-20', '18:02') },
];

/* ---------- Supplier side (logged in as Sri Murugan Castings) ---------- */
export const SUPPLIER_ME = { org: 'Sri Murugan Castings', owner: 'S. Senthil Kumar', city: 'Hosur', gstin: '33ABKFS4821M1Z6', tier: 1 as const, mobile: '+91 98430 21877' };

export const openItems: OpenItem[] = [
  { id: 'OI-1', kind: 'RFQ', rfqId: 'RFQ-000128', title: 'Pump casing, volute · FG260', buyerType: 'Pump OEM · Germany', detail: '1,200 pcs/yr · lot 200', due: T('2026-10-24', '18:00'), status: 'Open' },
  { id: 'OI-2', kind: 'Question', rfqId: 'RFQ-000123', title: 'Answer to your question on bore finish', buyerType: 'EV drivetrain OEM · Germany', detail: 'Ra 1.6 on bearing seat only', due: T('2026-10-21', '18:00'), status: 'Answered' },
  { id: 'OI-3', kind: 'Document', title: 'Upload MTC 3.1 for heat H-0912', buyerType: 'PO-000441', detail: 'Required before payment release', due: T('2026-10-22', '18:00'), status: 'Pending' },
  { id: 'OI-4', kind: 'Commitment', title: 'Debit note DN-000031 · 48 pcs', buyerType: 'PO-000441', detail: 'Accept or raise an issue', due: T('2026-10-23', '18:00'), status: 'Open' },
  { id: 'OI-5', kind: 'RFQ', rfqId: 'RFQ-000129', title: 'Bearing cap, SG iron · machined', buyerType: 'Valve maker · USA', detail: '3,000 pcs/yr · lot 500', due: T('2026-10-27', '18:00'), status: 'Open' },
];

export const catalogue: CatalogueRow[] = [
  { id: 'C-1', name: 'Pump casing, volute', hsn: '8413.91', material: 'EN-GJL-260', process: 'Sand casting + machining', sizeRange: '5–40 kg', moq: '100 pcs', state: 'Live' },
  { id: 'C-2', name: 'Gearbox housing', hsn: '8483.90', material: 'EN-GJS-500-7', process: 'SG casting + CNC', sizeRange: '4–25 kg', moq: '200 pcs', state: 'Live' },
  { id: 'C-3', name: 'Bearing housing, plummer block', hsn: '8483.30', material: 'FG260 / SG500', process: 'Sand casting + machining', sizeRange: '2–18 kg', moq: '200 pcs', state: 'Proposed', confidence: 0.88 },
  { id: 'C-4', name: 'Valve bonnet', hsn: '8481.90', material: 'ASTM A216 WCB', process: 'Sand casting', sizeRange: '3–30 kg', moq: '50 pcs', state: 'Proposed', confidence: 0.74 },
  { id: 'C-5', name: 'Counterweight', hsn: '7325.10', material: 'FG200', process: 'Sand casting', sizeRange: '10–80 kg', moq: '100 pcs', state: 'Proposed', confidence: 0.93 },
];

/* ---------- Admin side ---------- */
export const stuck: StuckItem[] = [
  { id: 'S-1', doc: 'ASN-000213', what: 'Dispatch blocked on HSN; 2 reminders sent, no fix', party: 'Kaveri Precision Forge', age: '5 h', owner: 'Ops · D. Menon', severity: 'crit' },
  { id: 'S-2', doc: 'RFQ-000127', what: 'No quotes after 18 h; 3 invited', party: 'Kestrel Motion GmbH', age: '18 h', owner: 'Unassigned', severity: 'warn' },
  { id: 'S-3', doc: 'PO-000458', what: 'Not acknowledged; 1 reminder', party: 'Nandi Forgings', age: '16 h', owner: 'Ops · D. Menon', severity: 'warn' },
  { id: 'S-4', doc: 'VER-000214', what: 'Four-eyes second review waiting 2 d', party: 'Tiruppur Polymer Moulders', age: '2 d', owner: 'Verifier · S. Rao', severity: 'warn' },
  { id: 'S-5', doc: 'WA-TPL-12', what: 'Template "quote_reminder_ta" rejected by Meta', party: 'Messaging', age: '1 d', owner: 'Ops · D. Menon', severity: 'crit' },
  { id: 'S-6', doc: 'RFQ-000124', what: 'Extraction confidence 0.61 on balancing note; buyer not confirmed', party: 'Kestrel Motion GmbH', age: '9 h', owner: 'Ops · A. Khan', severity: 'warn' },
];

export const verification: VerificationCase[] = [
  { id: 'VER-000214', vendorId: 'VEN-000045', vendor: 'Tiruppur Polymer Moulders', city: 'Coimbatore', from: 1, to: 2, evidence: ['Video walk-through 14 min', 'Machine list (22)', 'Photos of QC lab (8)'], submittedAt: T('2026-10-19', '11:00'), firstReviewer: 'K. Iyer', status: 'Pending', changedBy: 'K. Iyer', changedAt: T('2026-10-19', '15:20') },
  { id: 'VER-000216', vendorId: 'VEN-000058', vendor: 'Annapoorna Engineering', city: 'Hosur', from: 0, to: 1, evidence: ['GSTIN active', 'PAN matches', '₹1 deposit pending', 'No certificates'], submittedAt: T('2026-10-20', '09:30'), status: 'Pending', changedBy: 'System', changedAt: T('2026-10-20', '09:30') },
  { id: 'VER-000217', vendorId: 'VEN-000063', vendor: 'Velmurugan Tool Room', city: 'Hosur', from: 0, to: 1, evidence: ['GSTIN active', 'PAN matches', 'Bank verified (₹1)', 'Udyam certificate'], submittedAt: T('2026-10-20', '19:10'), status: 'Pending', changedBy: 'System', changedAt: T('2026-10-20', '19:10') },
  { id: 'VER-000211', vendorId: 'VEN-000041', vendor: 'Sri Murugan Castings', city: 'Hosur', from: 0, to: 1, evidence: ['GSTIN active', 'PAN matches', 'Bank verified (₹1)', 'ISO 9001:2015 (valid to 03-2028)'], submittedAt: T('2026-10-18', '10:00'), firstReviewer: 'K. Iyer', status: 'Approved', changedBy: 'S. Rao', changedAt: T('2026-10-20', '10:47') },
  { id: 'VER-000209', vendorId: 'VEN-000022', vendor: 'Sahyadri Electricals & Hardware', city: 'Nashik', from: 1, to: 2, evidence: ['Site visit 12-10-2026 by founder', 'Galvanising bath photos', 'CPRI type-test report'], submittedAt: T('2026-10-13', '10:00'), firstReviewer: 'K. Iyer', status: 'Approved', changedBy: 'S. Rao', changedAt: T('2026-10-14', '12:00') },
];

export const buyerOrgs: BuyerOrg[] = [
  { id: 'ORG-0007', name: 'Kestrel Motion GmbH', country: 'DE / IN', plan: 'Growth', status: 'Active', users: 9, rfqs: 27, pos: 11, kyb: 'Verified', costPerRfq: 112 },
  { id: 'ORG-0011', name: 'Bayline Flow Controls LLC', country: 'US', plan: 'Trial', status: 'Trial', users: 2, rfqs: 3, pos: 0, kyb: 'Verified', trialEnds: T('2026-12-02'), costPerRfq: 164 },
  { id: 'ORG-0012', name: 'Northmoor Low-Volume Vehicles Ltd', country: 'UK', plan: 'Starter', status: 'Active', users: 3, rfqs: 6, pos: 1, kyb: 'Verified', costPerRfq: 96 },
  { id: 'ORG-0014', name: 'Gulfstar Process Equipment FZE', country: 'AE', plan: 'Trial', status: 'Trial', users: 1, rfqs: 1, pos: 0, kyb: 'Pending', trialEnds: T('2026-12-15'), costPerRfq: 138 },
  { id: 'ORG-0009', name: 'Aravali EPC Projects Pvt Ltd', country: 'IN', plan: 'Starter', status: 'Active', users: 5, rfqs: 14, pos: 6, kyb: 'Verified', costPerRfq: 88 },
];

export const templates: TemplateRow[] = [
  { name: 'new_rfq', category: 'Utility', language: 'en, ta, hi, kn, te', meta: 'Approved', dlt: 'Approved', sent30d: 412, delivered: 98.5, read: 91.2, replied: 64.1 },
  { name: 'quote_form_flow', category: 'Utility · Flow', language: 'en, ta', meta: 'Approved', dlt: 'Approved', sent30d: 266, delivered: 99.1, read: 93.0, replied: 58.6 },
  { name: 'quote_reminder', category: 'Utility', language: 'en, hi', meta: 'Approved', dlt: 'Approved', sent30d: 188, delivered: 98.9, read: 86.4, replied: 41.0 },
  { name: 'quote_reminder_ta', category: 'Utility', language: 'ta', meta: 'Rejected', dlt: 'Approved', sent30d: 0, delivered: 0, read: 0, replied: 0 },
  { name: 'award_po', category: 'Utility', language: 'en, ta, hi', meta: 'Approved', dlt: 'Approved', sent30d: 21, delivered: 100, read: 100, replied: 95.2 },
  { name: 'crosscheck_result', category: 'Utility', language: 'en, ta', meta: 'Approved', dlt: 'Pending', sent30d: 37, delivered: 97.3, read: 94.6, replied: 70.3 },
  { name: 'join_welcome', category: 'Utility', language: 'en, ta, hi, kn, te', meta: 'Approved', dlt: 'Approved', sent30d: 58, delivered: 100, read: 96.6, replied: 81.0 },
  { name: 'certificate_expiry', category: 'Utility', language: 'en', meta: 'Pending', dlt: 'Pending', sent30d: 0, delivered: 0, read: 0, replied: 0 },
];

export const meters: MeterRow[] = [
  { rfqId: 'RFQ-000123', buyer: 'Kestrel Motion GmbH', docs: 3, tokensK: 418, messages: 31, callMin: 0, cost: 96.4, status: 'Active' },
  { rfqId: 'RFQ-000124', buyer: 'Kestrel Motion GmbH', docs: 2, tokensK: 512, messages: 24, callMin: 6, cost: 141.2, status: 'Active' },
  { rfqId: 'RFQ-000131', buyer: 'Bayline Flow Controls LLC', docs: 5, tokensK: 860, messages: 38, callMin: 11, cost: 188.7, status: 'Escalated' },
  { rfqId: 'RFQ-000126', buyer: 'Kestrel Motion GmbH', docs: 1, tokensK: 174, messages: 19, callMin: 0, cost: 42.9, status: 'Active' },
  { rfqId: 'RFQ-000130', buyer: 'Northmoor Low-Volume Vehicles Ltd', docs: 2, tokensK: 301, messages: 22, callMin: 3, cost: 77.5, status: 'Active' },
  { rfqId: 'RFQ-000122', buyer: 'Kestrel Motion GmbH', docs: 2, tokensK: 290, messages: 41, callMin: 0, cost: 84.0, status: 'Closed' },
];

export const evals: EvalRow[] = [
  { suite: 'Drawing extraction · castings', cases: 34, accuracy: 93.8, calibration: 0.041, costPerDoc: 14.2, p50ms: 9400, model: 'Sonnet-class + Opus-class fallback', gate: 'Failed' },
  { suite: 'Drawing extraction · forgings', cases: 16, accuracy: 95.6, calibration: 0.036, costPerDoc: 12.8, p50ms: 8700, model: 'Sonnet-class + Opus-class fallback', gate: 'Passed' },
  { suite: 'WhatsApp quote parsing (en/ta/hi)', cases: 62, accuracy: 97.1, calibration: 0.028, costPerDoc: 0.9, p50ms: 1300, model: 'Haiku-class + Sarvam', gate: 'Passed' },
  { suite: 'Voice quote (ta/kn/te)', cases: 21, accuracy: 90.5, calibration: 0.062, costPerDoc: 3.4, p50ms: 4100, model: 'Sarvam ASR → Haiku-class', gate: 'Failed' },
  { suite: 'MTC extraction', cases: 18, accuracy: 96.2, calibration: 0.031, costPerDoc: 6.1, p50ms: 5200, model: 'Sonnet-class', gate: 'Passed' },
  { suite: 'HSN suggestion', cases: 140, accuracy: 92.9, calibration: 0.044, costPerDoc: 0.3, p50ms: 600, model: 'Haiku-class', gate: 'Passed' },
];

export const disputes: Dispute[] = [
  { id: 'DSP-000014', doc: 'PO-000441', parties: 'Kestrel Motion ↔ Sri Murugan Castings', type: 'Short / rejected quantity', amount: 118080, opened: T('2026-10-15', '11:30'), status: 'Open', owner: 'Ops · D. Menon', changedBy: 'D. Menon', changedAt: T('2026-10-20', '16:00') },
  { id: 'DSP-000013', doc: 'PO-000444', parties: 'Kestrel Motion ↔ Shakti Valves & Pumps', type: 'Late shipment (B/L date)', amount: 0, opened: T('2026-10-06', '09:00'), status: 'Resolved', owner: 'Ops · A. Khan', changedBy: 'A. Khan', changedAt: T('2026-10-09', '12:00') },
  { id: 'DSP-000012', doc: 'RFQ-000131', parties: 'Bayline Flow Controls ↔ Platform', type: 'Contact request before award', amount: 0, opened: T('2026-10-18', '17:40'), status: 'Escalated', owner: 'Super-admin', changedBy: 'System', changedAt: T('2026-10-18', '17:40') },
];

/* KPI series for Home / Intelligence (weekly, last 12 weeks) */
export const kpiSeries = {
  quotesPerRfq: [1.8, 2.1, 2.0, 2.4, 2.6, 2.5, 2.9, 3.1, 3.0, 3.3, 3.4, 3.6],
  replyHours: [31, 28, 26, 24, 22, 23, 19, 17, 16, 15, 14, 13.5],
  costPerRfq: [182, 171, 160, 151, 140, 133, 128, 121, 118, 112, 109, 104],
};
