/**
 * API client. One function per backend endpoint.
 *   VITE_API_MODE=mock    sandbox dataset in the browser (default; used for screenshots and reviews)
 *   VITE_API_MODE=http    every endpoint calls the backend at VITE_API_BASE_URL (/v1 behind CloudFront)
 *   VITE_API_MODE=hybrid  endpoints listed in VITE_API_LIVE call the backend, the rest stay on the sandbox
 * Screens only ever call these functions through the hooks below, so swapping modes touches nothing else.
 */
import { useQuery } from '@tanstack/react-query';
import { ENV } from '@/config/brand';
import * as db from './mock/data';
import type { ExtractedField } from './types';

export class ApiError extends Error {
  constructor(message: string, public status: number, public requestId: string, public code = 'error') {
    super(message);
  }
}

/** Demo switch for reviewing list states: append ?demo=empty | loading | error to any URL. */
function demoMode(): 'empty' | 'loading' | 'error' | null {
  if (typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('demo');
  return v === 'empty' || v === 'loading' || v === 'error' ? v : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** True when this endpoint (or feature) talks to the real backend. */
export function isLive(key: string): boolean {
  return ENV.apiMode === 'http' || (ENV.apiMode === 'hybrid' && ENV.live.includes(key));
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${ENV.apiBase}${path}`, {
      method,
      credentials: 'include',
      headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0, 'network');
  }
  const json = (await res.json().catch(() => null)) as { error?: { code: string; message: string }; requestId?: string } | null;
  if (!res.ok) {
    throw new ApiError(json?.error?.message ?? res.statusText, res.status, json?.requestId ?? res.headers.get('x-request-id') ?? 'unknown', json?.error?.code);
  }
  return json as T;
}

async function get<T>(key: string, path: string, mock: () => T): Promise<T> {
  const demo = demoMode();
  if (demo === 'loading') return new Promise<T>(() => {});
  if (demo === 'error') {
    await sleep(250);
    throw new ApiError('The service did not respond in time.', 504, 'req_7f3a91c2');
  }
  if (isLive(key)) return request<T>('GET', path);
  await sleep(180);
  const data = mock();
  if (demo === 'empty' && Array.isArray(data)) return [] as unknown as T;
  return structuredClone(data);
}

export const post = <T>(path: string, body: unknown = {}) => request<T>('POST', path, body);

/** Uploads a file as the raw request body (drawings: PDF, PNG, JPEG, WebP). */
async function upload<T>(path: string, file: File): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${ENV.apiBase}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) },
      body: file,
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0, 'network');
  }
  const json = (await res.json().catch(() => null)) as { error?: { code: string; message: string }; requestId?: string } | null;
  if (!res.ok) throw new ApiError(json?.error?.message ?? res.statusText, res.status, json?.requestId ?? 'unknown', json?.error?.code);
  return json as T;
}

export const api = {
  rfqs: () => get('rfqs', '/rfqs', () => db.rfqs),
  rfq: (id: string) => get('rfqs', `/rfqs/${id}`, () => db.rfqById(id) ?? null),
  quotes: (rfqId: string) => get('quotes', `/rfqs/${rfqId}/quotes`, () => db.quotes.filter((q) => q.rfqId === rfqId)),
  extraction: (rfqId: string) => get('extraction', `/rfqs/${rfqId}/extraction`, () => db.extraction),
  vendors: () => get('vendors', '/vendors', () => db.vendors),
  orders: () => get('orders', '/orders', () => db.orders),
  shipments: () => get('shipments', '/shipments', () => db.shipments),
  grns: () => get('grns', '/grns', () => db.grns),
  invoices: () => get('invoices', '/invoices', () => db.invoices),
  commitments: () => get('commitments', '/commitments', () => db.commitments),
  queries: () => get('queries', '/queries', () => db.queries),
  materials: () => get('materials', '/materials', () => db.materials),
  docs: () => get('docs', '/documents', () => db.docs),
  audit: () => get('audit', '/audit-events', () => db.audit),
  auditVerify: () => get('audit', '/audit-events/verify', () => ({ ok: true, checked: db.audit.length, firstBadSeq: null as number | null, head: db.audit[0]?.hash ?? null })),
  doa: () => get('doa', '/settings/doa', () => db.doaRules),
  alerts: () => get('alerts', '/alerts', () => db.alerts),
  openItems: () => get('openItems', '/supplier/open-items', () => db.openItems),
  catalogue: () => get('catalogue', '/supplier/catalogue', () => db.catalogue),
  stuck: () => get('stuck', '/admin/stuck', () => db.stuck),
  verification: () => get('verification', '/admin/verification?status=all', () => db.verification),
  buyerOrgs: () => get('buyerOrgs', '/admin/buyer-orgs', () => db.buyerOrgs),
  templates: () => get('templates', '/admin/templates', () => db.templates),
  meters: () => get('meters', '/admin/metering', () => db.meters),
  evals: () => get('evals', '/admin/evals', () => db.evals),
  disputes: () => get('disputes', '/admin/disputes', () => db.disputes),
};

/* Writes. Screens check isLive(feature) and keep their sandbox behaviour otherwise. */

export interface GstRecord {
  gstin: string; legalName: string | null; tradeName: string | null; status: string | null; registeredOn: string | null;
  constitution: string | null; address: string | null; state: string | null; provider: string; alreadyRegistered: boolean;
}
export interface DraftField extends ExtractedField { confirmed: boolean; source: 'model' | 'fallback' | 'buyer' }
export interface Draft {
  rfq: { number: string; title: string; status: string };
  document: { number: string; fileName: string; mediaType: string; byteSize: number };
  extraction: { status: 'ready' | 'failed'; model: string; fallbackModel: string | null; costInr: string; durationMs: number | null; error: string | null; fields: DraftField[] };
}
export const drawingUrl = (rfq: string) => `${ENV.apiBase}/rfqs/${rfq}/drawing`;

export interface Me { user: { name: string }; org: { number: string; name: string; kind: 'buyer' | 'supplier' | 'platform' }; role: string }

export const actions = {
  joinLookup: (gstin: string) => post<GstRecord>('/join/lookup', { gstin }),
  joinStart: (gstin: string, phone: string) => post<{ applicationId: string; sentTo: string; expiresInSec: number }>('/join/start', { gstin, phone }),
  joinVerify: (b: { applicationId: string; code: string; businessTypes?: string[]; language?: string }) =>
    post<{ org: { number: string; name: string; tier: number }; verification: { number: string; status: string } }>('/join/verify', b),
  signInCode: (portal: 'buyer' | 'supplier' | 'admin', destination: string) =>
    post<{ challengeId: string; sentTo: string; expiresInSec: number }>('/auth/code', { portal, destination }),
  signInVerify: (challengeId: string, code: string) => post<Me>('/auth/verify', { challengeId, code }),
  signOut: () => post<{ ok: true }>('/auth/logout'),
  me: () => request<Me>('GET', '/auth/me'),
  uploadDrawing: (file: File) => upload<Draft>('/rfqs/drafts', file),
  draft: (rfq: string) => request<Draft>('GET', `/rfqs/${rfq}/extraction`),
  confirmField: (rfq: string, key: string, edit?: { value: string; unit?: string | null }) =>
    post<Draft>(`/rfqs/${rfq}/extraction/fields/${key}/confirm`, edit ?? {}),
  reviewVerification: (number: string, decision: 'approve' | 'reject', note?: string) =>
    post<{ status: string; needsSecondReviewer?: boolean }>(`/admin/verification/${number}/review`, { decision, note }),
};

type Api = typeof api;
type NoArgKeys = { [K in keyof Api]: Parameters<Api[K]>['length'] extends 0 ? K : never }[keyof Api];

/** Typed hook: const { data, isLoading, error, refetch } = useApi('rfqs') */
export function useApi<K extends NoArgKeys>(key: K) {
  type Data = Awaited<ReturnType<Api[K]>>;
  const fn = api[key] as unknown as () => Promise<Data>;
  return useQuery<Data, ApiError>({ queryKey: [key, typeof window !== 'undefined' ? window.location.search : ''], queryFn: fn });
}

export function useApiArg<T>(key: string, arg: string, fn: (a: string) => Promise<T>) {
  return useQuery<T, ApiError>({ queryKey: [key, arg, typeof window !== 'undefined' ? window.location.search : ''], queryFn: () => fn(arg) });
}
