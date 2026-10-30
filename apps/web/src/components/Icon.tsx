/** Inline stroke icons only (no icon fonts, no decorative icons). 16px grid, 1.5 stroke. */
const PATHS: Record<string, string> = {
  home: 'M3 7.5 8 3l5 4.5V13H3z M6.5 13V9.5h3V13',
  check: 'M3 8.5 6.5 12 13 4.5',
  x: 'M4 4l8 8M12 4l-8 8',
  plus: 'M8 3v10M3 8h10',
  search: 'M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM10.5 10.5 14 14',
  bell: 'M4 11V7a4 4 0 0 1 8 0v4l1 1.5H3zM6.5 14h3',
  chat: 'M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z',
  list: 'M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.5M2.5 8h.5M2.5 12h.5',
  doc: 'M4 2h5.5L12 4.5V14H4zM9.5 2v2.5H12M6 7.5h4M6 10h4',
  upload: 'M8 11V3M5 6l3-3 3 3M3 11v2.5h10V11',
  download: 'M8 3v8M5 8l3 3 3-3M3 11v2.5h10V11',
  truck: 'M1.5 4h8v7h-8zM9.5 6.5h3l2 2.5V11h-5M4 13a1.2 1.2 0 1 0 0-.01M12 13a1.2 1.2 0 1 0 0-.01',
  box: 'M2.5 5 8 2.5 13.5 5v6L8 13.5 2.5 11zM2.5 5 8 7.5 13.5 5M8 7.5v6',
  receipt: 'M3.5 2h9v12l-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1zM6 5.5h4M6 8h4',
  money: 'M1.5 4.5h13v7h-13zM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  users: 'M6 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM1.5 13.5c.5-2.5 2.3-4 4.5-4s4 1.5 4.5 4M11 7.5a2 2 0 1 0 0-4M12 9.5c1.4.4 2.3 1.8 2.5 4',
  factory: 'M1.5 13.5V7l4 2.5V7l4 2.5V4.5h4v9z',
  layers: 'M8 2.5 14 5.5 8 8.5 2 5.5zM2 8.5l6 3 6-3M2 11l6 3 6-3',
  chart: 'M2.5 13.5h11M4 11V8M7 11V5M10 11V7M13 11V3.5',
  report: 'M3 2h10v12H3zM5.5 10.5V9M8 10.5V6.5M10.5 10.5V8',
  shield: 'M8 1.8 13 3.5V8c0 3-2.2 5-5 6.2C5.2 13 3 11 3 8V3.5z',
  settings: 'M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4',
  gavel: 'M9.5 2.5l4 4M8 4l4 4M10 6l-6.5 6.5M2.5 13.5h6',
  award: 'M8 9.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 8.5 4.5 14 8 12.5l3.5 1.5-1-5.5',
  compare: 'M5 2.5v11M11 2.5v11M2.5 5H7.5M8.5 11h5',
  flag: 'M3.5 14V2.5M3.5 3h8l-1.5 3 1.5 3h-8',
  clock: 'M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM8 4.5V8l2.5 1.5',
  phone: 'M4 1.5h8v13H4zM7 12.5h2',
  call: 'M3 2.5h3l1 3-1.5 1a8 8 0 0 0 3.5 3.5l1-1.5 3 1v3c-6 .5-10.5-4-10-10z',
  mic: 'M8 10a2.5 2.5 0 0 0 2.5-2.5v-3a2.5 2.5 0 0 0-5 0v3A2.5 2.5 0 0 0 8 10zM4 7.5a4 4 0 0 0 8 0M8 11.5V14',
  link: 'M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 0 1 4.5 9l1-1',
  lock: 'M4 7h8v6.5H4zM5.5 7V5a2.5 2.5 0 0 1 5 0v2',
  eye: 'M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8zM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  chevronRight: 'M6 3.5 10.5 8 6 12.5',
  chevronLeft: 'M10 3.5 5.5 8l4.5 4.5',
  chevronDown: 'M3.5 6 8 10.5 12.5 6',
  more: 'M3.5 8h.01M8 8h.01M12.5 8h.01',
  filter: 'M2 3h12L9.5 8.5V13l-3-1.5v-3z',
  columns: 'M2.5 2.5h11v11h-11zM6.2 2.5v11M9.8 2.5v11',
  alert: 'M8 2 14.5 13.5h-13zM8 6.5v3.5M8 12h.01',
  info: 'M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM8 7.5V11M8 5h.01',
  pin: 'M8 14.5s4.5-4.2 4.5-8a4.5 4.5 0 0 0-9 0c0 3.8 4.5 8 4.5 8zM8 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  globe: 'M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM2 8h12M8 2c1.8 2 1.8 10 0 12M8 2c-1.8 2-1.8 10 0 12',
  grid: 'M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z',
  kanban: 'M2.5 2.5h3v11h-3zM6.5 2.5h3v7h-3zM10.5 2.5h3v9h-3z',
  camera: 'M2 5h3l1-1.5h4L11 5h3v8H2zM8 11a2.2 2.2 0 1 0 0-4.4A2.2 2.2 0 0 0 8 11z',
  send: 'M2 8l12-5.5L9.5 14l-2-4.5z',
  hash: 'M3 6h10M3 10h10M6.5 2.5l-1 11M10.5 2.5l-1 11',
  key: 'M6 10a3 3 0 1 1 2.6-1.5L14 14M11.5 11.5 13 10',
  ship: 'M2 10.5h12l-1.5 3h-9zM4 10.5V6h8v4.5M7.5 6V3h1v3',
  database: 'M8 5c3 0 5-.9 5-2s-2-2-5-2-5 .9-5 2 2 2 5 2zM3 3v10c0 1.1 2 2 5 2s5-.9 5-2V3M3 8c0 1.1 2 2 5 2s5-.9 5-2',
  inbox: 'M2 9.5 4 3h8l2 6.5V13H2zM2 9.5h3.5l1 1.5h3l1-1.5H14',
  external: 'M9.5 2.5h4v4M13.5 2.5 7.5 8.5M11.5 9.5v4h-9v-9h4',
  refresh: 'M13 3.5v3h-3M3 12.5v-3h3M12.5 6.5A5 5 0 0 0 3.6 5M3.5 9.5a5 5 0 0 0 8.9 1.5',
  logout: 'M6 2.5H2.5v11H6M10 5l3 3-3 3M13 8H6',
  play: 'M5 3l8 5-8 5z',
  pause: 'M5 3v10M11 3v10',
  sliders: 'M3 4h6M12 4h1M3 12h2M8 12h5M10.5 2.5v3M6.5 10.5v3',
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, className, title }: { name: IconName | string; size?: number; className?: string; title?: string }) {
  const d = PATHS[name] ?? PATHS.info!;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      <path d={d} />
    </svg>
  );
}
