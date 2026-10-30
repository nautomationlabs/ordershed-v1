/**
 * API client. One function per backend endpoint. In `mock` mode it serves the sandbox dataset
 * with realistic latency; in `http` mode it calls the backend (API Gateway / ALB → ECS Fargate).
 * Screens only ever call these functions through the hooks below, so swapping modes touches nothing else.
 */
import { useQuery } from '@tanstack/react-query';
import { ENV } from '@/config/brand';
import * as db from './mock/data';

export class ApiError extends Error {
  constructor(message: string, public status: number, public requestId: string) {
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

async function get<T>(path: string, mock: () => T): Promise<T> {
  const demo = demoMode();
  if (demo === 'loading') return new Promise<T>(() => {});
  if (demo === 'error') {
    await sleep(250);
    throw new ApiError('The service did not respond in time.', 504, 'req_7f3a91c2');
  }
  if (ENV.apiMode === 'http') {
    const res = await fetch(`${ENV.apiBase}${path}`, { credentials: 'include', headers: { Accept: 'application/json' } });
    if (!res.ok) throw new ApiError(res.statusText, res.status, res.headers.get('x-request-id') ?? 'unknown');
    return (await res.json()) as T;
  }
  await sleep(180);
  const data = mock();
  if (demo === 'empty' && Array.isArray(data)) return [] as unknown as T;
  return structuredClone(data);
}

export const api = {
  rfqs: () => get('/rfqs', () => db.rfqs),
  rfq: (id: string) => get(`/rfqs/${id}`, () => db.rfqById(id) ?? null),
  quotes: (rfqId: string) => get(`/rfqs/${rfqId}/quotes`, () => db.quotes.filter((q) => q.rfqId === rfqId)),
  extraction: (rfqId: string) => get(`/rfqs/${rfqId}/extraction`, () => db.extraction),
  vendors: () => get('/vendors', () => db.vendors),
  orders: () => get('/orders', () => db.orders),
  shipments: () => get('/shipments', () => db.shipments),
  grns: () => get('/grns', () => db.grns),
  invoices: () => get('/invoices', () => db.invoices),
  commitments: () => get('/commitments', () => db.commitments),
  queries: () => get('/queries', () => db.queries),
  materials: () => get('/materials', () => db.materials),
  docs: () => get('/documents', () => db.docs),
  audit: () => get('/audit-events', () => db.audit),
  doa: () => get('/settings/doa', () => db.doaRules),
  alerts: () => get('/alerts', () => db.alerts),
  openItems: () => get('/supplier/open-items', () => db.openItems),
  catalogue: () => get('/supplier/catalogue', () => db.catalogue),
  stuck: () => get('/admin/stuck', () => db.stuck),
  verification: () => get('/admin/verification', () => db.verification),
  buyerOrgs: () => get('/admin/buyer-orgs', () => db.buyerOrgs),
  templates: () => get('/admin/templates', () => db.templates),
  meters: () => get('/admin/metering', () => db.meters),
  evals: () => get('/admin/evals', () => db.evals),
  disputes: () => get('/admin/disputes', () => db.disputes),
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
