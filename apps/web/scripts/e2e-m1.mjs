/**
 * M1 end-to-end in a real browser against the real API (console WhatsApp/email, GST stand-in):
 * supplier joins with a GSTIN and a WhatsApp code → admin signs in with an email code → approves the
 * verification case → the audit log shows both Join events and a verified chain.
 *
 * Needs: API on :8080 (logging to API_LOG), `vite` dev server on :5173 in hybrid mode (apps/web/.env.development.local).
 * Usage: API_LOG=/path/to/api.log node scripts/e2e-m1.mjs [GSTIN] [mobile]
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE = process.env.WEB_URL ?? 'http://localhost:5173';
const LOG = process.env.API_LOG;
const OUT = new URL('../../../docs/screenshots/m1/', import.meta.url);
const GSTIN = process.argv[2] ?? '33AAKFV2210M1Z7';
const MOBILE = process.argv[3] ?? '98430 55501';
const ADMIN = process.env.ADMIN_EMAIL ?? 'ops@ordershed.test';
if (!LOG) throw new Error('Set API_LOG to the API log file (codes are read from the console sender).');
mkdirSync(fileURLToPath(OUT), { recursive: true });

/** Latest code the console sender logged for this destination, waiting until it appears. */
async function codeFor(dest) {
  for (let i = 0; i < 50; i++) {
    const lines = readFileSync(LOG, 'utf8').split('\n').filter((l) => l.includes(`→ ${dest}`));
    const m = lines.at(-1)?.match(/code (\d{6}) →/);
    if (m) return m[1];
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`no code logged for ${dest}`);
}

const shot = (page, name) => page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, OUT)), fullPage: false });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const step = (msg) => console.log(`✓ ${msg}`);

try {
  // Supplier joins on the phone layout.
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await phone.goto(`${BASE}/s/join`);
  await phone.getByPlaceholder('15 characters from your GST certificate').fill(GSTIN);
  await phone.getByRole('button', { name: 'Fetch from GST' }).click();
  await phone.getByText('Fetched from GST').waitFor();
  await shot(phone, 'm1-01-join-gst');
  step('GST record fetched');

  await phone.getByRole('button', { name: 'This is my business' }).click();
  await phone.getByPlaceholder('98430 21877').fill(MOBILE);
  await phone.getByRole('button', { name: 'Send code on WhatsApp' }).click();
  await phone.getByText('Code sent on WhatsApp').waitFor();
  const supplierCode = await codeFor(`+91${MOBILE.replace(/\D/g, '')}`);
  await phone.locator('input[autocomplete="one-time-code"]').fill(supplierCode);
  await shot(phone, 'm1-02-join-code');
  step(`WhatsApp code received (${supplierCode.slice(0, 2)}••••)`);

  await phone.getByRole('button', { name: 'Continue' }).click();
  await phone.getByRole('button', { name: 'Machining' }).click();
  await phone.getByRole('button', { name: 'Tool room' }).click();
  await phone.getByRole('button', { name: 'Join', exact: true }).click();
  await phone.getByText('You are in').waitFor();
  await shot(phone, 'm1-03-join-done');
  const joinedText = await phone.locator('.p-card').first().innerText();
  step(`joined: ${joinedText.split('\n').pop()}`);

  // Admin signs in and approves.
  const desk = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await desk.goto(`${BASE}/login`);
  await desk.getByRole('button', { name: 'Admin' }).click();
  await desk.locator('input[type="email"]').fill(ADMIN);
  await desk.getByRole('button', { name: 'Send one-time code' }).click();
  await desk.locator('input[autocomplete="one-time-code"]').waitFor();
  await desk.locator('input[autocomplete="one-time-code"]').fill(await codeFor(ADMIN));
  await desk.getByRole('button', { name: 'Sign in' }).click();
  await desk.waitForURL('**/a/ops');
  step('admin signed in with an email code');

  await desk.goto(`${BASE}/a/verification`);
  const row = desk.locator('tr', { hasText: 'Velmurugan Tool Room' }).last();
  await row.waitFor();
  await row.click();
  await shot(desk, 'm1-04-verification-queue');
  await desk.getByRole('button', { name: 'Approve', exact: true }).click();
  await desk.getByText('approved. Logged in the audit chain.').waitFor();
  await shot(desk, 'm1-05-verification-approved');
  step('verification approved');

  await desk.goto(`${BASE}/b/audit`);
  await desk.getByText('Chain verified').waitFor();
  await desk.getByText('Supplier joined').first().waitFor();
  await desk.getByText('Join started').first().waitFor();
  await shot(desk, 'm1-06-audit-chain-verified');
  step('audit log: Join started + Supplier joined + approval, chain verified');
} finally {
  await browser.close();
}
