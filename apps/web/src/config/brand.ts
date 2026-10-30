// The brand is under review. Change it here once; nothing else hard-codes the name.
export const BRAND = {
  name: 'Ordershed',
  legalEntity: 'Ordershed Technologies Pvt Ltd',
  whatsappNumber: '+91 80 4718 2290',
  rfqInbox: 'rfq@in.ordershed.example',
} as const;

export const ENV = {
  label: import.meta.env.VITE_ENV_LABEL ?? 'SANDBOX',
  version: import.meta.env.VITE_APP_VERSION ?? '0.1.0',
  apiMode: (import.meta.env.VITE_API_MODE ?? 'mock') as 'mock' | 'http' | 'hybrid',
  apiBase: import.meta.env.VITE_API_BASE_URL ?? '/v1',
  /** hybrid mode: features served by the backend, e.g. "join,verification,audit,auth". */
  live: ((import.meta.env.VITE_API_LIVE as string | undefined) ?? '').split(',').map((s) => s.trim()).filter(Boolean),
} as const;
