import { buildApp } from './app.js';
import { extractRates, loadConfig } from './config.js';
import { createPool } from './db/pool.js';
import { ConsoleEmail } from './integrations/email.js';
import { BedrockExtractor, StubExtractor } from './integrations/extractor.js';
import { CashfreeGst, StubGst } from './integrations/gst.js';
import { LocalStorage } from './integrations/storage.js';
import { CloudWhatsApp, ConsoleWhatsApp } from './integrations/whatsapp.js';

const config = loadConfig();
const log = (m: string) => console.log(m);

const app = await buildApp(
  {
    config,
    db: createPool(config.DATABASE_URL),
    gst: config.GST_PROVIDER === 'cashfree' ? new CashfreeGst(config) : new StubGst(),
    whatsapp: config.WHATSAPP_MODE === 'cloud' ? new CloudWhatsApp(config) : new ConsoleWhatsApp(log),
    email: new ConsoleEmail(log),
    storage: new LocalStorage(config.UPLOAD_DIR),
    extractor:
      config.EXTRACTOR === 'bedrock'
        ? new BedrockExtractor({ region: config.AWS_REGION, model: config.EXTRACT_MODEL, fallbackModel: config.EXTRACT_FALLBACK_MODEL || undefined, ...extractRates(config) })
        : new StubExtractor(),
  },
  { logger: { level: config.NODE_ENV === 'production' ? 'info' : 'debug', redact: ['req.headers.cookie', 'req.headers.authorization'] } },
);

await app.listen({ port: config.PORT, host: '0.0.0.0' });
app.log.info(`API ready (whatsapp: ${config.WHATSAPP_MODE}, gst: ${config.GST_PROVIDER}, extractor: ${config.EXTRACTOR})`);

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => void app.close().then(() => process.exit(0)));
}
