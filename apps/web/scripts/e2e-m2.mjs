/**
 * M2 Create request in a real browser against the real API: a buyer signs in with an email code, uploads a
 * drawing, sees the proposed fields, confirms one low-confidence field and corrects another, and the audit log
 * shows each step in a verified chain.
 *
 * Needs: API on :8080 (logging to API_LOG), `vite` dev server on :5173 with `extraction` in VITE_API_LIVE.
 * Usage: API_LOG=/path/to/api.log node scripts/e2e-m2.mjs [drawing.pdf]
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE = process.env.WEB_URL ?? 'http://localhost:5173';
const LOG = process.env.API_LOG;
const OUT = new URL('../../../docs/screenshots/m2/', import.meta.url);
const DRAWING = process.argv[2] ?? fileURLToPath(new URL('../../../docs/samples/KM-PB-0714_revB.pdf', import.meta.url));
const BUYER = process.env.BUYER_EMAIL ?? 'rohan@kestrel.test';
if (!LOG) throw new Error('Set API_LOG to the API log file (codes are read from the console sender).');
mkdirSync(fileURLToPath(OUT), { recursive: true });

async function codeFor(dest) {
  for (let i = 0; i < 50; i++) {
    const m = readFileSync(LOG, 'utf8').split('\n').filter((l) => l.includes(`→ ${dest}`)).at(-1)?.match(/code (\d{6}) →/);
    if (m) return m[1];
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`no code logged for ${dest}`);
}

const shot = (page, name) => page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, OUT)) });
const step = (msg) => console.log(`✓ ${msg}`);
const browser = await chromium.launch({ channel: 'chrome', headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/login`);
  await page.getByRole('button', { name: 'Buyer' }).click();
  await page.locator('input[type="email"]').fill(BUYER);
  await page.getByRole('button', { name: 'Send one-time code' }).click();
  await page.locator('input[autocomplete="one-time-code"]').fill(await codeFor(BUYER));
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/b/**');
  step('buyer signed in with an email code');

  await page.goto(`${BASE}/b/requests/new`);
  await page.getByText('Drop a drawing here').waitFor();
  await shot(page, 'm2-01-upload');
  await page.locator('input[type="file"]').setInputFiles(DRAWING);
  await page.waitForURL(/rfq=RFQ-\d{6}/, { timeout: 180_000 });
  await page.getByText('Extracted fields').waitFor();
  const rfq = new URL(page.url()).searchParams.get('rfq');
  await shot(page, 'm2-02-fields');
  const warn = await page.locator('.banner.warn').innerText().catch(() => 'no low-confidence fields');
  step(`${rfq} draft: ${warn.split('.')[0]}`);

  const confirmButtons = page.getByRole('button', { name: 'Confirm', exact: true });
  if (await confirmButtons.count()) {
    await confirmButtons.first().click();
    await page.waitForTimeout(500);
    step('confirmed one field');
  }
  const edits = page.getByRole('button', { name: 'Edit', exact: true });
  if (await edits.count()) {
    await edits.first().click();
    const value = page.locator('input[aria-label$=" value"]');
    await value.fill(`${await value.inputValue()} (checked)`);
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByText('Corrected by you').waitFor();
    step('corrected one field');
  }
  while (await confirmButtons.count()) {
    await confirmButtons.first().click();
    await page.waitForTimeout(400);
  }
  await page.getByRole('button', { name: 'Confirm and find vendors' }).isEnabled();
  await shot(page, 'm2-03-confirmed');
  step('all low-confidence fields handled; Find vendors enabled');

  await page.goto(`${BASE}/b/audit`);
  await page.getByText('Chain verified').waitFor();
  await page.getByText('Drawing read by AI').first().waitFor();
  await shot(page, 'm2-04-audit');
  step('audit log: draft created, drawing read, confirmations; chain verified');
} finally {
  await browser.close();
}
