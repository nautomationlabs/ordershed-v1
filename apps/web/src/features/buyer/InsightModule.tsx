import { kpiSeries } from '@/api/mock/data';
import { Banner, Kpis, PageHeader, Panel, SourceTag, Sparkline } from '@/components/primitives';

/** Simple line chart (inline SVG) for weekly series with a target line. */
function LineChart({ series, target, unit, height = 160 }: { series: { name: string; data: number[]; color: string }[]; target?: number; unit: string; height?: number }) {
  const w = 560;
  const all = series.flatMap((s) => s.data).concat(target ?? []);
  const min = Math.min(...all) * 0.9;
  const max = Math.max(...all) * 1.05;
  const n = series[0]!.data.length;
  const x = (i: number) => 36 + (i / (n - 1)) * (w - 50);
  const y = (v: number) => height - 22 - ((v - min) / (max - min)) * (height - 36);
  const ticks = [min, (min + max) / 2, max];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" role="img" aria-label="Chart">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={36} x2={w - 10} y1={y(t)} y2={y(t)} stroke="var(--border)" />
          <text x={30} y={y(t) + 3} fontSize="9.5" textAnchor="end" fill="var(--muted)" fontFamily="IBM Plex Mono">{t.toFixed(t < 10 ? 1 : 0)}</text>
        </g>
      ))}
      {target !== undefined && (
        <g>
          <line x1={36} x2={w - 10} y1={y(target)} y2={y(target)} stroke="var(--warning)" strokeDasharray="3 3" />
          <text x={w - 12} y={y(target) - 4} fontSize="9.5" textAnchor="end" fill="var(--warning)" fontFamily="IBM Plex Mono">target {target}{unit}</text>
        </g>
      )}
      {series.map((s) => (
        <path key={s.name} d={s.data.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={1.75} />
      ))}
      {Array.from({ length: n }).map((_, i) => i % 2 === 0 && (
        <text key={i} x={x(i)} y={height - 6} fontSize="9.5" textAnchor="middle" fill="var(--muted)" fontFamily="IBM Plex Mono">W{31 + i}</text>
      ))}
    </svg>
  );
}

export function Intelligence() {
  const families = [
    { fam: 'SG iron castings, machined', idx: 103.8, chg: -2.1, wpi: 101.2, n: 14 },
    { fam: 'Closed-die forgings, alloy steel', idx: 108.4, chg: 1.4, wpi: 104.9, n: 22 },
    { fam: 'Flanges, carbon steel', idx: 99.1, chg: -0.6, wpi: 100.3, n: 9 },
    { fam: 'Investment castings, CF8M', idx: 112.6, chg: 3.2, wpi: 107.0, n: 6 },
    { fam: 'T&D hardware, HDG', idx: 96.7, chg: -1.8, wpi: 98.1, n: 5 },
  ];
  return (
    <div className="page">
      <PageHeader
        title="Intelligence"
        question="Where are prices moving, and where could we save or second-source?"
        meta="Price index by part family from our own order data, with WPI overlay. Phase 3 adds cost models and a public price index."
        primary={<button className="btn btn-primary">Run import-substitution scan</button>}
      />
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <Panel title="Normalised price index · Jan-26 = 100" actions={<SourceTag kind="computed" refText="Award-weighted, own data" />}>
          <LineChart unit="" series={[{ name: 'SG iron', data: [100, 101.5, 102.8, 104.1, 105.2, 104.6, 104.9, 104.0, 103.8, 103.9, 103.6, 103.8], color: 'var(--ink)' }, { name: 'Forgings', data: [100, 100.8, 102.0, 103.4, 104.4, 105.0, 106.2, 106.8, 107.1, 107.9, 108.0, 108.4], color: 'var(--accent)' }, { name: 'WPI basic metals', data: [100, 100.4, 100.9, 101.8, 102.6, 103.0, 103.1, 103.6, 103.9, 104.4, 104.7, 104.9], color: 'var(--faint)' }]} />
          <div className="legend mt-8"><span><i style={{ background: 'var(--ink)' }} />SG iron castings</span><span><i style={{ background: 'var(--accent)' }} />Forgings</span><span><i style={{ background: 'var(--faint)' }} />WPI basic metals (overlay)</span></div>
        </Panel>
        <Panel title="Part families" tight>
          <table className="dt">
            <thead><tr><th>Family</th><th className="num">Index</th><th className="num">90 d</th><th className="num">WPI</th><th className="num">Data pts</th></tr></thead>
            <tbody>{families.map((f) => (
              <tr key={f.fam}><td>{f.fam}</td><td className="num">{f.idx.toFixed(1)}</td><td className={`num ${f.chg < 0 ? 'good' : 'crit'}`}>{f.chg > 0 ? '+' : ''}{f.chg.toFixed(1)}%</td><td className="num muted">{f.wpi.toFixed(1)}</td><td className="num">{f.n}</td></tr>
            ))}</tbody>
          </table>
        </Panel>
      </div>
      <div className="grid-3 mt-16">
        <Panel title="Import-substitution candidates">
          <ul className="list-plain">
            <li>Ball valve body 2" CF8M<span className="spacer" /><span className="mono small good">−11% landed</span></li>
            <li>Hub flange, forged<span className="spacer" /><span className="mono small good">−8% landed</span></li>
            <li>Wiring harness clips<span className="spacer" /><span className="mono small muted">China cheaper</span></li>
          </ul>
        </Panel>
        <Panel title="Single-source parts">
          <div className="mono" style={{ fontSize: 22 }}>5</div>
          <div className="small muted">of 8 active parts · ₹ 1.08 Cr annual spend exposed</div>
        </Panel>
        <Panel title="Cost modeller">
          <div className="small muted">Material + process + overhead model per part family. Phase 3.</div>
          <Banner tone="info">Uses only our own and public data. Outreach and trade data never feed buyer-facing prices.</Banner>
        </Panel>
      </div>
    </div>
  );
}

export function Reports() {
  return (
    <div className="page">
      <PageHeader
        title="CPO report"
        docNo="Q3 FY26-27 · PNQ-01 + STR-01"
        question="What did sourcing save, how fast did suppliers respond, and where are we exposed?"
        primary={<button className="btn btn-primary">Download PDF</button>}
        secondary={<><button className="link">Schedule monthly</button><button className="link">Export CSV</button></>}
      />
      <Kpis items={[
        { label: 'Savings vs last price', value: '7.8', unit: '%', delta: <span className="row gap-4">₹ 41.2 L <SourceTag kind="computed" refText="Σ (last − awarded) × qty" /></span> },
        { label: 'Savings vs should-cost', value: '2.4', unit: '%', delta: <SourceTag kind="computed" /> },
        { label: 'Median first quote', value: '19', unit: 'h', delta: 'from RFQ sent' },
        { label: 'RFQ → award', value: '31', unit: '%', delta: 'target 30%' },
        { label: 'Single-source parts', value: '5', delta: <span className="warn">−2 this quarter</span> },
      ]} />
      <div className="grid-2 mt-16" style={{ alignItems: 'start' }}>
        <Panel title="Quotes per RFQ and supplier reply time · weekly">
          <LineChart unit="" target={3} series={[{ name: 'Quotes per RFQ', data: kpiSeries.quotesPerRfq, color: 'var(--accent)' }]} height={140} />
          <div className="row mt-8 gap-16 small muted"><span>Reply time (h)</span><Sparkline data={kpiSeries.replyHours} width={220} height={28} target={48} /></div>
        </Panel>
        <Panel title="Savings by category" tight>
          <table className="dt">
            <thead><tr><th>Category</th><th className="num">Spend ₹ L</th><th className="num">vs last</th><th className="num">vs should-cost</th><th className="num">Awards</th></tr></thead>
            <tbody>
              {[['Forgings', 186.4, 9.8, 3.1, 4], ['Castings', 142.0, 6.2, 1.9, 3], ['Flanges', 36.2, 5.0, 0.8, 1], ['T&D hardware', 32.9, 11.7, 4.4, 1], ['Valves & pump parts', 21.7, 4.1, 1.2, 1]].map(([c, s, a, b, n]) => (
                <tr key={c as string}><td>{c}</td><td className="num">{(s as number).toFixed(1)}</td><td className="num good">{(a as number).toFixed(1)}%</td><td className="num">{(b as number).toFixed(1)}%</td><td className="num">{n}</td></tr>
              ))}
            </tbody>
            <tfoot><tr><td>Total</td><td className="num">419.2</td><td className="num">7.8%</td><td className="num">2.4%</td><td className="num">10</td></tr></tfoot>
          </table>
        </Panel>
      </div>
    </div>
  );
}
