/** A sandbox engineering drawing (gearbox housing, two views + title block) used for the extraction review. */
export function DrawingSvg() {
  const ink = '#2b3440';
  const dim = '#5b6470';
  return (
    <svg viewBox="0 0 800 560" role="img" aria-label="Drawing KM-GH-2210 rev C">
      <rect x="8" y="8" width="784" height="544" fill="#fff" stroke={ink} strokeWidth="1.5" />
      <rect x="16" y="16" width="768" height="528" fill="none" stroke={ink} strokeWidth="0.6" />
      {/* grid refs */}
      {[1, 2, 3, 4, 5, 6].map((n, i) => (
        <text key={n} x={16 + 64 + i * 128} y="13" fontSize="7" fill={dim} fontFamily="IBM Plex Mono">{n}</text>
      ))}
      {/* View A — front */}
      <g stroke={ink} fill="none" strokeWidth="1.3">
        <path d="M70 120 h250 a20 20 0 0 1 20 20 v190 a20 20 0 0 1 -20 20 h-250 a20 20 0 0 1 -20 -20 v-190 a20 20 0 0 1 20 -20z" />
        <circle cx="195" cy="235" r="62" />
        <circle cx="195" cy="235" r="44" />
        <circle cx="90" cy="140" r="7" /><circle cx="300" cy="140" r="7" /><circle cx="90" cy="330" r="7" /><circle cx="300" cy="330" r="7" />
        <path d="M110 120 v-14 h170 v14" />
      </g>
      <g stroke={dim} strokeWidth="0.6" strokeDasharray="10 3 2 3">
        <line x1="195" y1="150" x2="195" y2="320" /><line x1="110" y1="235" x2="280" y2="235" />
      </g>
      {/* dims view A */}
      <g stroke={dim} strokeWidth="0.6" fill={dim} fontFamily="IBM Plex Mono" fontSize="9">
        <line x1="50" y1="378" x2="340" y2="378" /><path d="M50 378 l6 -2 v4z M340 378 l-6 -2 v4z" />
        <text x="178" y="374" stroke="none">286</text>
        <line x1="364" y1="120" x2="364" y2="350" /><path d="M364 120 l-2 6 h4z M364 350 l-2 -6 h4z" />
        <text x="368" y="240" stroke="none">214</text>
        <line x1="239" y1="191" x2="290" y2="160" />
        <text x="262" y="156" stroke="none">Ø62 H7</text>
        <rect x="292" y="146" width="62" height="13" fill="none" />
        <text x="295" y="156" stroke="none">⌖ 0.02 A</text>
      </g>
      <text x="160" y="404" fontSize="10" fontFamily="Archivo" fontWeight="600" fill={ink}>VIEW A</text>
      {/* View B — side section */}
      <g stroke={ink} fill="none" strokeWidth="1.3">
        <path d="M470 120 h162 v230 h-162z" />
        <path d="M470 173 h40 v124 h-40" />
        <path d="M632 191 h-30 v88 h30" />
        <line x1="510" y1="173" x2="602" y2="191" /><line x1="510" y1="297" x2="602" y2="279" />
      </g>
      <g stroke={ink} strokeWidth="0.5">
        {Array.from({ length: 14 }).map((_, i) => (
          <line key={i} x1={474 + i * 11} y1="124" x2={474 + i * 11 - 8} y2="132" />
        ))}
      </g>
      <g stroke={dim} strokeWidth="0.6" fill={dim} fontFamily="IBM Plex Mono" fontSize="9">
        <line x1="470" y1="378" x2="632" y2="378" /><path d="M470 378 l6 -2 v4z M632 378 l-6 -2 v4z" />
        <text x="540" y="374" stroke="none">162</text>
        <text x="604" y="168" stroke="none">Ra 1.6</text>
        <path d="M598 172 l4 8 l8 -16" fill="none" />
        <text x="476" y="112" stroke="none">▱ 0.03</text>
      </g>
      <text x="530" y="404" fontSize="10" fontFamily="Archivo" fontWeight="600" fill={ink}>SECTION B–B</text>
      {/* notes */}
      <g fontFamily="IBM Plex Mono" fontSize="8.5" fill={ink}>
        <text x="40" y="440" fontFamily="Archivo" fontWeight="600" fontSize="9.5">NOTES</text>
        <text x="40" y="455">1. ALL DIMENSIONS IN MM. GENERAL TOL. ISO 2768-mK.</text>
        <text x="40" y="468">2. MATERIAL EN-GJS-500-7 TO EN 1563.</text>
        <text x="40" y="481">5. CASTING TOL. ISO 8062-3 DCTG 9. MACHINE ALL MARKED FACES.</text>
        <text x="40" y="494">6. Ra 1.6 ON BORES. OUTSIDE PRIMER RAL 7035.</text>
        <text x="40" y="507">8. CMM REPORT ON FIRST ARTICLE. MTC 3.1 PER HEAT.</text>
      </g>
      {/* title block */}
      <g stroke={ink} strokeWidth="0.8" fill="none">
        <rect x="470" y="430" width="306" height="106" />
        <line x1="470" y1="456" x2="776" y2="456" /><line x1="470" y1="482" x2="776" y2="482" /><line x1="470" y1="508" x2="776" y2="508" />
        <line x1="620" y1="456" x2="620" y2="536" /><line x1="700" y1="482" x2="700" y2="536" />
      </g>
      <g fontFamily="IBM Plex Mono" fontSize="8.5" fill={ink}>
        <text x="478" y="447" fontFamily="Archivo" fontWeight="700" fontSize="11">GEARBOX HOUSING, MACHINED</text>
        <text x="478" y="472">PART NO  KM-GH-2210</text>
        <text x="628" y="472">SCALE 1:2</text>
        <text x="478" y="498">MATERIAL  EN-GJS-500-7</text>
        <text x="628" y="498">REV  C</text>
        <text x="708" y="498">A3</text>
        <text x="478" y="524">MASS  11.4 kg</text>
        <text x="628" y="524">SHEET 1/1</text>
        <text x="708" y="524">KESTREL</text>
      </g>
    </svg>
  );
}

/** Source-span markers, positioned as % of the drawing so they scale with it. */
export const SPANS: { n: number; key: string; left: number; top: number; w: number; h: number; warn?: boolean }[] = [
  { n: 1, key: 'partNo', left: 59, top: 82, w: 19, h: 4.5 },
  { n: 2, key: 'rev', left: 78, top: 87, w: 9, h: 4.5 },
  { n: 3, key: 'material', left: 4.5, top: 82.5, w: 33, h: 3.2 },
  { n: 4, key: 'weight', left: 59, top: 91.5, w: 18, h: 4.5 },
  { n: 5, key: 'envelope', left: 6, top: 64.5, w: 37, h: 4 },
  { n: 6, key: 'critical', left: 29, top: 25.5, w: 16, h: 4.5, warn: true },
  { n: 7, key: 'finish', left: 74.5, top: 28, w: 9, h: 4.5 },
  { n: 8, key: 'inspection', left: 4.5, top: 89.5, w: 41, h: 3.2 },
];
