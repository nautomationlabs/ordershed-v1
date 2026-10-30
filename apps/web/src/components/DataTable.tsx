import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { readLocal, writeLocal, toCsv, downloadCsv } from '@/lib/storage';
import { Icon } from './Icon';
import { EmptyState, ErrorState } from './StateViews';

export interface Column<T> {
  key: string;
  header: string;
  unit?: string;
  tech?: string;
  num?: boolean;
  width?: number | string;
  hidden?: boolean;
  render?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  text?: (row: T) => string | number;
}

export interface DataTableProps<T> {
  id: string;
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: { message: string; requestId?: string } | null;
  onRetry?: () => void;
  onOpen?: (row: T) => void;
  activeKey?: string | null;
  bulk?: (selected: T[], clear: () => void) => ReactNode;
  toolbar?: ReactNode;
  empty?: { title: string; body?: string; action?: ReactNode };
  footer?: ReactNode;
  maxHeight?: number | string;
  expand?: (row: T) => ReactNode;
  searchPlaceholder?: string;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  noToolbar?: boolean;
}

interface Layout { hidden: string[]; sort?: { key: string; dir: 'asc' | 'desc' } }

/** Dense SAP-style table: fixed header, sort, filter, column chooser, saved layout, bulk select, export, keyboard. */
export function DataTable<T>(props: DataTableProps<T>) {
  const { id, columns, rows, rowKey, loading, error, onRetry, onOpen, activeKey, bulk, toolbar, empty, footer, maxHeight, expand, searchPlaceholder, noToolbar } = props;
  const layoutKey = `os.table.${id}`;
  const defaults: Layout = { hidden: columns.filter((c) => c.hidden).map((c) => c.key), sort: props.initialSort };
  const [layout, setLayout] = useState<Layout>(() => readLocal(layoutKey, defaults));
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState(-1);
  const [chooser, setChooser] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = columns.filter((c) => !layout.hidden.includes(c.key));
  const textOf = (c: Column<T>, r: T) => (c.text ? c.text(r) : c.sortValue ? c.sortValue(r) : ((r as Record<string, unknown>)[c.key] as string | number | undefined) ?? '');

  const view = useMemo(() => {
    if (!rows) return [];
    const f = filter.trim().toLowerCase();
    let out = f ? rows.filter((r) => columns.some((c) => String(textOf(c, r)).toLowerCase().includes(f))) : rows;
    const s = layout.sort;
    if (s) {
      const col = columns.find((c) => c.key === s.key);
      if (col) {
        const val = (r: T) => (col.sortValue ? col.sortValue(r) : textOf(col, r));
        out = [...out].sort((a, b) => {
          const va = val(a);
          const vb = val(b);
          const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
          return s.dir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, filter, layout.sort, columns]);

  useEffect(() => setCursor(-1), [filter]);

  const persist = (l: Layout) => {
    setLayout(l);
    writeLocal(layoutKey, l);
  };
  const toggleSort = (key: string) => {
    const s = layout.sort;
    const next: Layout['sort'] = !s || s.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : undefined;
    persist({ ...layout, sort: next });
  };
  const toggleCol = (key: string) => {
    const hidden = layout.hidden.includes(key) ? layout.hidden.filter((k) => k !== key) : [...layout.hidden, key];
    persist({ ...layout, hidden });
  };
  const toggleRow = (k: string) => {
    const n = new Set(selected);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    setSelected(n);
  };
  const allOn = view.length > 0 && view.every((r) => selected.has(rowKey(r)));
  const toggleAll = () => setSelected(allOn ? new Set() : new Set(view.map(rowKey)));
  const selectedRows = (rows ?? []).filter((r) => selected.has(rowKey(r)));

  const exportCsv = () => {
    const cols = visible.map((c) => ({ key: c.key, header: c.unit ? `${c.header} (${c.unit})` : c.header }));
    const data = view.map((r) => Object.fromEntries(visible.map((c) => [c.key, textOf(c, r)])));
    downloadCsv(`${id}.csv`, toCsv(data, cols));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      setCursor((c) => Math.min(view.length - 1, c + 1));
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'Enter' && cursor >= 0 && onOpen) {
      onOpen(view[cursor]!);
    } else if (e.key === 'x' && cursor >= 0 && bulk) {
      toggleRow(rowKey(view[cursor]!));
    }
  };

  const colSpan = visible.length + (bulk ? 1 : 0) + (expand ? 1 : 0);

  return (
    <div className="dt-wrap" tabIndex={0} onKeyDown={onKey} aria-label={`${id} table`}>
      {!noToolbar && (
        <div className="dt-toolbar">
          <div className="input-affix" style={{ width: 200, flex: 'none' }}>
            <span className="affix" style={{ padding: '0 8px' }}>
              <Icon name="filter" size={13} />
            </span>
            <input className="input" style={{ height: 28 }} placeholder={searchPlaceholder ?? 'Filter rows'} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter rows" />
          </div>
          {toolbar}
          <span className="spacer" />
          <span className="count">{loading ? '—' : `${view.length} of ${rows?.length ?? 0}`}</span>
          <div className="pop-anchor">
            <button className="link link-muted row gap-4" onClick={() => setChooser((v) => !v)} aria-expanded={chooser}>
              <Icon name="columns" size={13} /> Columns
            </button>
            {chooser && (
              <div className="popover" onMouseLeave={() => setChooser(false)}>
                <div className="pop-head label">Columns · saved layout</div>
                {columns.map((c) => (
                  <label key={c.key} className="pop-item">
                    <input type="checkbox" className="checkbox" checked={!layout.hidden.includes(c.key)} onChange={() => toggleCol(c.key)} />
                    {c.header}
                  </label>
                ))}
                <div className="pop-item" onClick={() => persist(defaults)}>
                  <span className="link">Reset to default</span>
                </div>
              </div>
            )}
          </div>
          <button className="link link-muted row gap-4" onClick={exportCsv}>
            <Icon name="download" size={13} /> Export
          </button>
        </div>
      )}
      {bulk && selected.size > 0 && (
        <div className="dt-bulk">
          <span className="mono strong">{selected.size} selected</span>
          {bulk(selectedRows, () => setSelected(new Set()))}
          <button className="link link-muted" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}
      <div className="dt-scroll" ref={scrollRef} style={{ maxHeight }}>
        {error ? (
          <ErrorState message={error.message} requestId={error.requestId} onRetry={onRetry} />
        ) : (
          <table className="dt">
            <thead>
              <tr>
                {expand && <th style={{ width: 28 }} />}
                {bulk && (
                  <th className="chk">
                    <input type="checkbox" className="checkbox" checked={allOn} onChange={toggleAll} aria-label="Select all" />
                  </th>
                )}
                {visible.map((c) => {
                  const s = layout.sort?.key === c.key ? layout.sort.dir : null;
                  return (
                    <th key={c.key} className={`sortable${c.num ? ' num' : ''}`} style={{ width: c.width }} onClick={() => toggleSort(c.key)} data-tech={c.tech} aria-sort={s === 'asc' ? 'ascending' : s === 'desc' ? 'descending' : 'none'}>
                      {c.header}
                      {c.unit && <span className="unit">{c.unit}</span>}
                      {s && <span className="arrow">{s === 'asc' ? '↑' : '↓'}</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`sk${i}`}>
                    {Array.from({ length: colSpan }).map((__, j) => (
                      <td key={j}>
                        <span className="skel" style={{ width: `${40 + ((i * 7 + j * 13) % 50)}%` }} />
                      </td>
                    ))}
                  </tr>
                ))}
              {!loading &&
                view.map((r, i) => {
                  const k = rowKey(r);
                  const isOpen = expanded.has(k);
                  return (
                    <Fragment key={k}>
                      <tr
                        className={[onOpen ? 'clickable' : '', selected.has(k) ? 'selected' : '', cursor === i || activeKey === k ? 'cursor' : ''].join(' ')}
                        onClick={() => {
                          setCursor(i);
                          onOpen?.(r);
                        }}
                      >
                        {expand && (
                          <td style={{ width: 28, paddingRight: 0 }}>
                            <button
                              className="icon-btn"
                              style={{ width: 20, height: 20 }}
                              aria-label={isOpen ? 'Collapse row' : 'Expand row'}
                              onClick={(e) => {
                                e.stopPropagation();
                                const n = new Set(expanded);
                                if (n.has(k)) n.delete(k);
                                else n.add(k);
                                setExpanded(n);
                              }}
                            >
                              <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={12} />
                            </button>
                          </td>
                        )}
                        {bulk && (
                          <td className="chk" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" className="checkbox" checked={selected.has(k)} onChange={() => toggleRow(k)} aria-label={`Select ${k}`} />
                          </td>
                        )}
                        {visible.map((c) => (
                          <td key={c.key} className={c.num ? 'num' : undefined} style={{ width: c.width, maxWidth: c.width }}>
                            {c.render ? c.render(r) : String(textOf(c, r))}
                          </td>
                        ))}
                      </tr>
                      {expand && isOpen && (
                        <tr className="expand-row">
                          <td colSpan={colSpan}>{expand(r)}</td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
            </tbody>
            {footer && !loading && view.length > 0 && <tfoot>{footer}</tfoot>}
          </table>
        )}
        {!loading && !error && view.length === 0 && (
          <EmptyState
            title={filter ? 'No rows match this filter' : empty?.title ?? 'Nothing here yet'}
            body={filter ? `Nothing contains "${filter}".` : empty?.body}
            action={filter ? <button className="link" onClick={() => setFilter('')}>Clear filter</button> : empty?.action}
          />
        )}
      </div>
      <div className="dt-foot">
        <span>
          <span className="kbd">J</span> <span className="kbd">K</span> move · <span className="kbd">Enter</span> open{bulk ? <> · <span className="kbd">X</span> select</> : null}
        </span>
        <span className="spacer" />
        {layout.sort && (
          <span>
            Sorted by {columns.find((c) => c.key === layout.sort!.key)?.header} {layout.sort.dir === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </div>
  );
}
