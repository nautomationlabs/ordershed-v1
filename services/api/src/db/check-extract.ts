/** Reads one drawing with the configured extractor and prints the fields and cost: npm run check:extract -w services/api -- <file> */
import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { extractRates, loadConfig } from '../config.js';
import { BedrockExtractor, StubExtractor } from '../integrations/extractor.js';

const file = process.argv[2];
if (!file) throw new Error('Usage: check:extract <drawing.pdf|png|jpg>');
const cfg = loadConfig();
const ex = cfg.EXTRACTOR === 'bedrock'
  ? new BedrockExtractor({ region: cfg.AWS_REGION, model: cfg.EXTRACT_MODEL, fallbackModel: cfg.EXTRACT_FALLBACK_MODEL || undefined, ...extractRates(cfg) })
  : new StubExtractor();
const types: Record<string, string> = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const path = resolve(process.env.INIT_CWD ?? process.cwd(), file);
const started = Date.now();
const r = await ex.extract({ bytes: readFileSync(path), mediaType: types[extname(path).toLowerCase()] ?? 'application/pdf', fileName: path });
console.log(`${r.title}  ·  ${r.model}${r.fallbackModel ? ` + ${r.fallbackModel}` : ''}  ·  ₹${r.costInr.toFixed(2)}  ·  ${((Date.now() - started) / 1000).toFixed(1)} s`);
for (const f of r.fields) console.log(`${f.confidence < 0.75 ? '!' : ' '} ${f.key.padEnd(10)} ${f.confidence.toFixed(2)}  ${f.value}${f.unit ? ` ${f.unit}` : ''}  [${f.span}]${f.source === 'fallback' ? ' (fallback)' : ''}`);
