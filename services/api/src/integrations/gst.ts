/**
 * GSTIN lookup. Cashfree Verification Suite (Secure ID) in sandbox or production, or a stand-in for development.
 * Both return the same normalised record, so the Join flow does not know which one ran.
 */
import { constants, publicEncrypt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import type { Config } from '../config.js';
import { gstinCheckChar, panOf } from '../lib/gstin.js';

export interface GstRecord {
  gstin: string;
  found: boolean;
  legalName: string | null;
  tradeName: string | null;
  status: string | null;          // Active / Cancelled / Suspended / Inactive
  registeredOn: string | null;    // YYYY-MM-DD
  constitution: string | null;
  address: string | null;
  state: string | null;
  provider: string;
}

export interface GstLookup {
  readonly name: string;
  lookup(gstin: string): Promise<GstRecord>;
}

/** Builds a checksum-valid GSTIN from its first 14 characters (used for fictional test data). */
export const fictionalGstin = (first14: string) => first14 + gstinCheckChar(first14);

/** Fictional suppliers for development. Any other valid GSTIN returns a generic active record. */
const FIXTURES: Record<string, Omit<GstRecord, 'gstin' | 'found' | 'provider'>> = {
  [fictionalGstin('33AAMFS4821K1Z')]: {
    legalName: 'SRI MURUGAN CASTINGS', tradeName: 'Sri Murugan Castings', status: 'Active', registeredOn: '2017-06-14',
    constitution: 'Partnership', address: 'Plot 41, SIPCOT Phase II, Hosur, Krishnagiri, Tamil Nadu 635109', state: 'Tamil Nadu',
  },
  [fictionalGstin('33AAKFV2210M1Z')]: {
    legalName: 'VELMURUGAN TOOL ROOM', tradeName: 'Velmurugan Tool Room', status: 'Active', registeredOn: '2018-02-02',
    constitution: 'Proprietorship', address: '12 Bagalur Road, Hosur, Tamil Nadu 635109', state: 'Tamil Nadu',
  },
  [fictionalGstin('29AACCN7713P1Z')]: {
    legalName: 'NANDI FORGINGS PRIVATE LIMITED', tradeName: 'Nandi Forgings', status: 'Cancelled', registeredOn: '2017-07-01',
    constitution: 'Private Limited Company', address: 'KIADB Industrial Area, Doddaballapur, Karnataka 561203', state: 'Karnataka',
  },
};

export class StubGst implements GstLookup {
  readonly name = 'stub';
  async lookup(gstin: string): Promise<GstRecord> {
    const f = FIXTURES[gstin];
    if (f) return { gstin, found: true, provider: this.name, ...f };
    return {
      gstin, found: true, provider: this.name,
      legalName: `TEST SUPPLIER ${panOf(gstin)}`, tradeName: `Test Supplier ${panOf(gstin).slice(0, 5)}`, status: 'Active',
      registeredOn: '2019-04-01', constitution: 'Proprietorship', address: 'Sandbox address, Hosur, Tamil Nadu 635109', state: 'Tamil Nadu',
    };
  }
}

export class CashfreeGst implements GstLookup {
  readonly name = 'cashfree';
  private base: string;
  private publicKey: string | null;
  constructor(private cfg: Pick<Config, 'CASHFREE_ENV' | 'CASHFREE_CLIENT_ID' | 'CASHFREE_CLIENT_SECRET' | 'CASHFREE_PUBLIC_KEY_PATH'>) {
    this.base = cfg.CASHFREE_ENV === 'production' ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com';
    const keyPath = cfg.CASHFREE_PUBLIC_KEY_PATH;
    // Relative paths are from the repo root (where .env lives), e.g. secrets/cashfree_public_key.pem
    this.publicKey = keyPath ? toPem(readFileSync(isAbsolute(keyPath) ? keyPath : resolve(import.meta.dirname, '../../../..', keyPath), 'utf8')) : null;
  }

  /**
   * Cashfree accepts either an allow-listed IP or this signature: "<clientId>.<unix seconds>" encrypted with the
   * account's public key (RSA-OAEP, SHA-1), base64. The signature works from any IP, which suits laptops and Fargate.
   */
  private signature(): string | undefined {
    if (!this.publicKey) return undefined;
    const payload = `${this.cfg.CASHFREE_CLIENT_ID}.${Math.floor(Date.now() / 1000)}`;
    return publicEncrypt({ key: this.publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha1' }, Buffer.from(payload)).toString('base64');
  }

  async lookup(gstin: string): Promise<GstRecord> {
    const sig = this.signature();
    const res = await fetch(`${this.base}/verification/gstin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': this.cfg.CASHFREE_CLIENT_ID!,
        'x-client-secret': this.cfg.CASHFREE_CLIENT_SECRET!,
        ...(sig ? { 'x-cf-signature': sig } : {}),
      },
      body: JSON.stringify({ GSTIN: gstin }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, any>;
    // "GSTIN Doesn't Exist" comes back as 200 without `valid` or a legal name, so require one of them.
    const exists = res.ok && (body.valid === true || typeof body.legal_name_of_business === 'string');
    if (res.status === 400 || res.status === 404 || (res.ok && !exists)) {
      return { gstin, found: false, legalName: null, tradeName: null, status: null, registeredOn: null, constitution: null, address: null, state: null, provider: this.name };
    }
    if (!res.ok) throw new Error(`GST lookup failed (${res.status}): ${body.message ?? 'unknown error'}`);
    return {
      gstin,
      found: true,
      legalName: body.legal_name_of_business ?? null,
      tradeName: body.trade_name_of_business ?? null,
      status: body.gst_in_status ?? null,
      registeredOn: toIsoDate(body.date_of_registration),
      constitution: body.constitution_of_business ?? null,
      address: body.principal_place_address ?? null,
      state: body.principal_place_split_address?.state ?? null,
      provider: `${this.name}:${this.cfg.CASHFREE_ENV}`,
    };
  }
}

/** Cashfree's download is bare base64 (no BEGIN/END lines); wrap it as a PEM public key. */
function toPem(key: string): string {
  if (key.includes('BEGIN')) return key;
  const body = key.replace(/\s+/g, '').match(/.{1,64}/g)!.join('\n');
  return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----\n`;
}

/** Providers send dates as YYYY-MM-DD or DD/MM/YYYY. */
function toIsoDate(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const m = v.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}
