/**
 * Configuration from environment variables (repo-root .env in development, Secrets Manager / task env in AWS).
 * Development defaults exist only for local Docker; production refuses to start without real values.
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

loadEnv({ path: resolve(import.meta.dirname, '../../../.env'), quiet: true });

const DEV_DB = 'postgres://ordershed_app:app_dev_only@localhost:5433/ordershed';
const DEV_OWNER_DB = 'postgres://ordershed_owner:owner_dev_only@localhost:5433/ordershed';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().default(DEV_DB),
  DATABASE_OWNER_URL: z.string().default(DEV_OWNER_DB),
  APP_DB_PASSWORD: z.string().default('app_dev_only'),
  OTP_PEPPER: z.string().min(16).default('dev-only-otp-pepper-change-me'),
  WEB_ORIGINS: z.string().default('http://localhost:5173,http://localhost:4173'),
  PUBLIC_WEB_URL: z.string().default('http://localhost:5173'),
  SESSION_TTL_HOURS: z.coerce.number().default(12),
  /** Per-IP limit on sign-in and Join endpoints (requests per minute). */
  AUTH_RATE_LIMIT_PER_MIN: z.coerce.number().default(10),

  WHATSAPP_MODE: z.enum(['console', 'cloud']).default('console'),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_WABA_ID: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_OTP_TEMPLATE: z.string().default('ordershed_code'),
  WHATSAPP_GRAPH_VERSION: z.string().default('v25.0'),
  /** Cost of one authentication-template message, from Meta's India rate card. The test number is free. */
  WHATSAPP_CODE_COST_INR: z.coerce.number().default(0),

  GST_PROVIDER: z.enum(['stub', 'cashfree']).default('stub'),
  CASHFREE_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  CASHFREE_CLIENT_ID: z.string().optional(),
  CASHFREE_CLIENT_SECRET: z.string().optional(),
  /** Public key from Cashfree (Developers → Two-factor authentication → Public key); avoids IP allow-listing. */
  CASHFREE_PUBLIC_KEY_PATH: z.string().optional(),
  /** Cost of one GSTIN check, from the provider's rate card. Sandbox calls are free. */
  GST_LOOKUP_COST_INR: z.coerce.number().default(0),

  /** Drawing extraction: stand-in for development and tests, or Claude on Amazon Bedrock. */
  EXTRACTOR: z.enum(['stub', 'bedrock']).default('stub'),
  AWS_REGION: z.string().default('ap-southeast-2'),
  EXTRACT_MODEL: z.string().default('anthropic.claude-sonnet-4-6'),
  /** Re-reads fields still below 0.75 confidence; empty = no fallback. */
  EXTRACT_FALLBACK_MODEL: z.string().optional(),
  /** Bedrock on-demand rates (USD per million tokens) and the conversion rate, from the AWS price list. */
  EXTRACT_INPUT_USD_PER_MTOK: z.coerce.number().default(3),
  EXTRACT_OUTPUT_USD_PER_MTOK: z.coerce.number().default(15),
  FALLBACK_INPUT_USD_PER_MTOK: z.coerce.number().default(5),
  FALLBACK_OUTPUT_USD_PER_MTOK: z.coerce.number().default(25),
  USD_INR: z.coerce.number().default(88),
  /** Where uploaded files go in development (S3 with the AWS deploy). */
  UPLOAD_DIR: z.string().default('var/uploads'),
  UPLOAD_MAX_MB: z.coerce.number().default(20),

  /** Alert when the metered cost of one RFQ passes this (PROJECT CONTEXT: ₹150). */
  RFQ_COST_ALERT_INR: z.coerce.number().default(150),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(overrides: Partial<Record<keyof Config, unknown>> = {}): Config {
  const cfg = schema.parse({ ...process.env, ...overrides });
  if (cfg.NODE_ENV === 'production') {
    const devValues = [
      cfg.DATABASE_URL === DEV_DB && 'DATABASE_URL',
      cfg.OTP_PEPPER.startsWith('dev-only') && 'OTP_PEPPER',
      cfg.APP_DB_PASSWORD === 'app_dev_only' && 'APP_DB_PASSWORD',
    ].filter(Boolean);
    if (devValues.length) throw new Error(`Refusing to start in production with development values: ${devValues.join(', ')}`);
  }
  if (cfg.WHATSAPP_MODE === 'cloud' && (!cfg.WHATSAPP_TOKEN || !cfg.WHATSAPP_PHONE_NUMBER_ID)) {
    throw new Error('WHATSAPP_MODE=cloud needs WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID');
  }
  if (cfg.GST_PROVIDER === 'cashfree' && (!cfg.CASHFREE_CLIENT_ID || !cfg.CASHFREE_CLIENT_SECRET)) {
    throw new Error('GST_PROVIDER=cashfree needs CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET');
  }
  return cfg;
}

export const extractRates = (cfg: Config) => ({
  rates: { inputUsdPerMTok: cfg.EXTRACT_INPUT_USD_PER_MTOK, outputUsdPerMTok: cfg.EXTRACT_OUTPUT_USD_PER_MTOK, usdInr: cfg.USD_INR },
  fallbackRates: { inputUsdPerMTok: cfg.FALLBACK_INPUT_USD_PER_MTOK, outputUsdPerMTok: cfg.FALLBACK_OUTPUT_USD_PER_MTOK, usdInr: cfg.USD_INR },
});
