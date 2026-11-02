/**
 * Renders a fictional engineering drawing to docs/samples/KM-PB-0714_revB.pdf for testing extraction end to end.
 * Everything on it is made up. Usage: node scripts/make-sample-drawing.mjs
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const OUT = new URL('../../../docs/samples/', import.meta.url);
mkdirSync(fileURLToPath(OUT), { recursive: true });

const html = `<!doctype html><html><head><style>
  @page { size: A4 landscape; margin: 0 }
  body { margin: 0; font: 11px Arial, sans-serif }
  .sheet { position: relative; width: 297mm; height: 210mm; box-sizing: border-box; border: 2px solid #000; }
  .tb { position: absolute; right: 8mm; bottom: 8mm; width: 120mm; border: 1.5px solid #000; border-collapse: collapse }
  .tb td { border: 1px solid #000; padding: 3px 5px; vertical-align: top }
  .tb .k { font-size: 8px; color: #333; display: block }
  .notes { position: absolute; left: 10mm; bottom: 10mm; width: 140mm; line-height: 1.5 }
  svg { position: absolute; left: 10mm; top: 10mm }
</style></head><body><div class="sheet">
<svg width="250mm" height="110mm" viewBox="0 0 250 110" font-size="4">
  <g stroke="#000" fill="none" stroke-width="0.6">
    <rect x="10" y="20" width="120" height="70"/>
    <circle cx="70" cy="55" r="16"/>
    <circle cx="25" cy="32" r="4"/><circle cx="115" cy="32" r="4"/><circle cx="25" cy="78" r="4"/><circle cx="115" cy="78" r="4"/>
    <rect x="160" y="20" width="70" height="70"/><rect x="160" y="20" width="12" height="70"/>
  </g>
  <g stroke="#000" stroke-width="0.3"><line x1="10" y1="12" x2="130" y2="12"/><line x1="138" y1="20" x2="138" y2="90"/><line x1="160" y1="98" x2="230" y2="98"/></g>
  <text x="62" y="10">180</text><text x="140" y="57">110</text><text x="190" y="104">95</text>
  <text x="74" y="40">Ø52 H7</text><text x="72" y="45">⌖ Ø0.03 A B</text>
  <text x="14" y="26">4× Ø11 THRU</text>
  <text x="58" y="18">VIEW A</text><text x="185" y="18">VIEW B</text>
  <text x="163" y="60">⏥ 0.05</text>
</svg>
<div class="notes"><b>NOTES</b><br>
1. ALL DIMENSIONS IN MM. GENERAL TOLERANCES ISO 2768-mK.<br>
2. MATERIAL: EN-GJL-250 GREY CAST IRON (EN 1561).<br>
3. REMOVE ALL BURRS AND SHARP EDGES 0.5 × 45°.<br>
4. BORE Ø52 H7 Ra 1.6; MOUNTING FACE Ra 3.2.<br>
5. PAINT: ONE COAT RED OXIDE PRIMER, NON-MACHINED SURFACES ONLY.<br>
6. FIRST ARTICLE: FULL DIMENSIONAL REPORT. MATERIAL TEST CERTIFICATE EN 10204 3.1 PER BATCH.
</div>
<table class="tb">
  <tr><td colspan="2"><span class="k">TITLE</span><b>PUMP MOUNTING BRACKET, MACHINED</b></td></tr>
  <tr><td><span class="k">PART NO.</span><b>KM-PB-0714</b></td><td><span class="k">REV</span><b>B</b></td></tr>
  <tr><td><span class="k">MASS</span>6.8 kg</td><td><span class="k">SCALE</span>1:2</td></tr>
  <tr><td><span class="k">DRAWN</span>FICTIONAL SAMPLE</td><td><span class="k">SHEET</span>1 OF 1</td></tr>
</table>
</div></body></html>`;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.setContent(html);
await page.pdf({ path: fileURLToPath(new URL('KM-PB-0714_revB.pdf', OUT)), width: '297mm', height: '210mm', printBackground: true });
await browser.close();
console.log('wrote docs/samples/KM-PB-0714_revB.pdf');
