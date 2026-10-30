// Captures every screen at its design size using the locally installed Chrome.
// Usage: npm run build && npx vite preview --port 4173 & node scripts/screenshots.mjs [baseUrl] [outDir]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4173';
const out = resolve(process.argv[3] ?? '../../docs/screenshots');
mkdirSync(out, { recursive: true });

const DESK = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

/** [file, path, viewport, fullPage?, action?] */
const SHOTS = [
  ['00-screen-index', '/', DESK, true],
  ['01-sign-in', '/login', DESK],
  ['02-buyer-signup-kyb', '/signup?step=2', DESK],
  ['03-get-a-quote', '/get-a-quote', DESK],
  ['10-buyer-home', '/b/home', DESK, true],
  ['11-create-request', '/b/requests/new', DESK, true],
  ['12-find-vendors', '/b/vendors/find', DESK],
  ['13-rfx-list', '/b/rfqs', DESK],
  ['14-rfq-view', '/b/rfqs/RFQ-000123', DESK, true],
  ['15-compare-quotes', '/b/compare/RFQ-000123', DESK, true],
  ['16-compare-landed-cost-drawer', '/b/compare/RFQ-000123', DESK, false, 'landed'],
  ['17-award-decision-pack', '/b/award/RFQ-000123', DESK, true],
  ['18-reverse-auction', '/b/auctions', DESK],
  ['19-commitments', '/b/commitments', DESK],
  ['20-queries-chat', '/b/chat', DESK],
  ['21-masked-call', '/b/call/QRY-000088', DESK],
  ['22-orders', '/b/orders', DESK, true],
  ['23-shipments-crosscheck', '/b/shipments', DESK, true],
  ['24-transport-rfq', '/b/transport', DESK],
  ['25-goods-receipt', '/b/grn', DESK, true],
  ['26-payments-3way-match', '/b/payments', DESK, true],
  ['27-vendor-list', '/b/vendors', DESK],
  ['28-vendor-view', '/b/vendors/VEN-000041', DESK, true],
  ['29-vendor-onboarding', '/b/onboarding', DESK],
  ['30-material-master', '/b/materials', DESK],
  ['31-docs-library', '/b/docs', DESK],
  ['32-intelligence', '/b/intelligence', DESK, true],
  ['33-cpo-report', '/b/reports', DESK, true],
  ['34-audit-log', '/b/audit', DESK],
  ['35-settings-doa', '/b/settings', DESK],
  ['36-command-bar', '/b/home', DESK, false, 'cmd'],
  ['37-state-empty', '/b/orders?demo=empty', DESK],
  ['38-state-loading', '/b/rfqs?demo=loading', DESK],
  ['39-state-error', '/b/payments?demo=error', DESK],
  ['50-supplier-join', '/s/join', PHONE, true],
  ['51-supplier-join-approved', '/s/join?step=3', PHONE],
  ['52-supplier-profile', '/s/profile', PHONE],
  ['53-supplier-setup-export-roadmap', '/s/profile/export', PHONE],
  ['54-supplier-open-items', '/s/open', PHONE],
  ['55-supplier-quote', '/s/quote/RFQ-000128', PHONE, true],
  ['56-supplier-quote-voice', '/s/quote/RFQ-000128?voice=1', PHONE],
  ['57-supplier-quote-decline', '/s/quote/RFQ-000128?sheet=decline', PHONE],
  ['58-supplier-catalogue', '/s/catalogue', PHONE, true],
  ['59-supplier-orders', '/s/orders', PHONE],
  ['60-supplier-order-chat', '/s/orders/PO-000441', PHONE],
  ['61-supplier-dispatch-crosscheck', '/s/dispatch/PO-000437', PHONE, true],
  ['62-supplier-whatsapp-flow', '/s/whatsapp', PHONE, true],
  ['63-supplier-web-job-board', '/s/web/jobs', DESK],
  ['64-supplier-web-job-pack', '/s/web/jobs/RFQ-000128', DESK],
  ['65-supplier-web-my-work', '/s/web/work', DESK],
  ['70-admin-ops-home', '/a/ops', DESK],
  ['71-admin-verification', '/a/verification', DESK],
  ['72-admin-rfq-operations', '/a/rfqs', DESK],
  ['73-admin-supplier-directory', '/a/suppliers', DESK],
  ['74-admin-buyer-orgs', '/a/buyers', DESK],
  ['75-admin-messaging', '/a/messaging', DESK],
  ['76-admin-cost-models', '/a/cost', DESK, true],
  ['77-admin-disputes-audit', '/a/disputes', DESK],
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
let ok = 0;
for (const [name, path, vp, full, action] of SHOTS) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
  try {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // the error demo retries once (1 s backoff) before showing the error state
    await page.waitForTimeout(path.includes('demo=error') ? 2800 : 500);
    // desktop shells scroll inside <main>; grow the viewport so a "full page" shot includes everything
    if (full && vp === DESK) {
      const h = await page.evaluate(() => {
        const m = document.querySelector('.main');
        return m ? m.scrollHeight + 48 + 28 : document.documentElement.scrollHeight;
      });
      if (h > vp.height) {
        await page.setViewportSize({ width: vp.width, height: Math.min(h, 4000) });
        await page.waitForTimeout(150);
      }
    }
    if (action === 'cmd') {
      await page.keyboard.press('/');
      await page.keyboard.type('po 456', { delay: 30 });
      await page.waitForTimeout(200);
    }
    if (action === 'landed') {
      await page.locator('td button.link.mono').first().click();
      await page.waitForTimeout(250);
    }
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: !!full });
    ok++;
    process.stdout.write(`ok  ${name}\n`);
  } catch (e) {
    process.stdout.write(`ERR ${name}: ${e.message}\n`);
  }
  await page.close();
}
await browser.close();
console.log(`${ok}/${SHOTS.length} screenshots in ${out}`);
