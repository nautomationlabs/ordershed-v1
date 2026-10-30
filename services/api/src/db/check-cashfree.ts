/**
 * Checks the Cashfree GSTIN connection with the keys in .env. Prints the normalised record, never the keys.
 * Usage: npm run check:cashfree -w services/api [-- GSTIN]
 */
import { loadConfig } from '../config.js';
import { CashfreeGst } from '../integrations/gst.js';

const cfg = loadConfig({ GST_PROVIDER: 'cashfree' });
const gstin = process.argv[2] ?? '27AAPFU0939F1ZV';
try {
  const record = await new CashfreeGst(cfg).lookup(gstin);
  console.log(`Cashfree ${cfg.CASHFREE_ENV}: OK`);
  console.log(record);
} catch (err) {
  console.error(`Cashfree ${cfg.CASHFREE_ENV}: ${(err as Error).message}`);
  process.exit(1);
}
