import { useState } from 'react';
import { useApi } from '@/api/client';
import type { Commitment } from '@/api/types';
import { DataTable } from '@/components/DataTable';
import { CommitmentCard } from '@/components/domain';
import { DocLink, PageHeader, Seg } from '@/components/primitives';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/StateViews';
import { dateTime, due } from '@/lib/format';

const LANES: Commitment['lane'][] = ['Due this week', 'Waiting on supplier', 'Waiting on us', 'Done'];

export function Commitments() {
  const { data, isLoading, error, refetch } = useApi('commitments');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [side, setSide] = useState<'all' | 'Supplier' | 'Buyer'>('all');
  const rows = (data ?? []).filter((c) => side === 'all' || c.ownerSide === side);
  const overdue = rows.filter((c) => c.lane !== 'Done' && due(c.due).tone === 'crit').length;

  return (
    <div className="page">
      <PageHeader
        title="Commitments"
        question="Who promised what, by when, and is it late?"
        meta={<>Two reminders, then an ops task. <span className="crit strong">{overdue} overdue</span> · {rows.filter((c) => c.lane !== 'Done').length} open</>}
        primary={<button className="btn btn-primary">Add commitment</button>}
        secondary={
          <div className="row gap-12">
            <Seg options={[{ id: 'all', label: 'All' }, { id: 'Supplier', label: 'Suppliers' }, { id: 'Buyer', label: 'Us' }]} value={side} onChange={setSide} />
            <Seg options={[{ id: 'board', label: 'Board' }, { id: 'list', label: 'List' }]} value={view} onChange={setView} />
          </div>
        }
      />
      {error ? (
        <div className="panel"><ErrorState message={error.message} requestId={error.requestId} onRetry={() => refetch()} /></div>
      ) : isLoading ? (
        <div className="panel"><LoadingBlock lines={6} /></div>
      ) : rows.length === 0 ? (
        <div className="panel"><EmptyState title="No commitments yet" body="Every promise in an award, PO or query becomes a card here with an owner and a due date." /></div>
      ) : view === 'board' ? (
        <div className="board">
          {LANES.map((lane) => {
            const items = rows.filter((c) => c.lane === lane);
            return (
              <div className="lane" key={lane}>
                <div className="lane-head">
                  <span className="label" style={{ color: 'var(--ink)' }}>{lane}</span>
                  <span className="mono small muted">{items.length}</span>
                </div>
                {items.map((c) => <CommitmentCard key={c.id} c={c} />)}
                {items.length === 0 && <div className="small muted" style={{ padding: 8 }}>Nothing here.</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <DataTable<Commitment>
          id="commitments"
          rows={rows}
          rowKey={(c) => c.id}
          bulk={(sel, clear) => <button className="link" onClick={clear}>Send reminder to {sel.length}</button>}
          columns={[
            { key: 'id', header: 'ID', render: (c) => <span className="mono">{c.id}</span> },
            { key: 'doc', header: 'Document', render: (c) => <DocLink id={c.doc} />, text: (c) => c.doc },
            { key: 'item', header: 'Commitment' },
            { key: 'owner', header: 'Owner' },
            { key: 'ownerSide', header: 'Side' },
            { key: 'due', header: 'Due', render: (c) => <span className="mono">{dateTime(c.due)}</span>, sortValue: (c) => c.due },
            { key: 'state', header: 'State', render: (c) => { const d = due(c.due); return c.lane === 'Done' ? <span className="good strong small">Done</span> : <span className={`${d.tone} strong small`}>{d.text}</span>; }, text: (c) => due(c.due).text },
            { key: 'reminders', header: 'Reminders', num: true },
          ]}
        />
      )}
    </div>
  );
}
