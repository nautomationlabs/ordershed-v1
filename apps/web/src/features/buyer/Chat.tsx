import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '@/api/client';
import type { QueryThread } from '@/api/types';
import { DataTable } from '@/components/DataTable';
import { AiProposal } from '@/components/domain';
import { Icon } from '@/components/Icon';
import { DocLink, KV, PageHeader, Panel, StatusChip } from '@/components/primitives';
import { dateTime, due } from '@/lib/format';

export function Chat() {
  const { data, isLoading, error, refetch } = useApi('queries');
  const [active, setActive] = useState<string | null>('QRY-000088');
  const sel = data?.find((q) => q.id === active) ?? null;

  return (
    <div className="page">
      <PageHeader
        title="Queries & chat"
        question="Which supplier questions are open, who owns them, and when are they due?"
        meta="Supplier identities stay masked until award. AI drafts answers; you publish."
        primary={<button className="btn btn-primary">New message</button>}
        secondary={<Link to="/b/call/QRY-000088">Masked call</Link>}
      />
      <div className="md md-wide">
        <DataTable<QueryThread>
          id="queries"
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={() => refetch()}
          rowKey={(q) => q.id}
          activeKey={active}
          onOpen={(q) => setActive(q.id)}
          empty={{ title: 'No open queries', body: 'When a supplier asks a question on WhatsApp or the web, it lands here with an owner and a deadline.' }}
          columns={[
            { key: 'id', header: 'Query', render: (q) => <span className="mono">{q.id}</span> },
            { key: 'rfqId', header: 'RFQ', render: (q) => <DocLink id={q.rfqId} /> },
            { key: 'vendorAlias', header: 'From' },
            { key: 'channel', header: 'Channel', hidden: true },
            { key: 'deadline', header: 'Due', render: (q) => { const d = due(q.deadline); return q.status === 'Answered' ? <span className="muted small">—</span> : <span className={`small strong ${d.tone}`}>{d.text}</span>; }, sortValue: (q) => q.deadline },
            { key: 'status', header: 'Status', render: (q) => <StatusChip status={q.status} />, text: (q) => q.status },
          ]}
        />
        <div className="detail">
          {sel ? (
            <Panel title={<div className="row"><span className="mono strong">{sel.id}</span><StatusChip status={sel.status} /></div>} actions={<span className="small muted">{sel.channel}</span>}>
              <KV
                narrow
                items={[
                  ['RFQ', <DocLink key="r" id={sel.rfqId} />],
                  ['From', sel.vendorAlias],
                  ['Owner', sel.owner],
                  ['Deadline', <span key="d" className="mono">{dateTime(sel.deadline)}</span>],
                ]}
              />
              <hr className="divider" />
              <div className="chat">
                <div className="bubble">
                  <div className="who">{sel.vendorAlias} · via {sel.channel}</div>
                  {sel.question}
                  <div className="time">{dateTime(sel.askedAt)}</div>
                </div>
                {sel.answer && (
                  <div className="bubble me">
                    <div className="who">{sel.owner} · published to all invited suppliers</div>
                    {sel.answer}
                  </div>
                )}
                <div className="bubble sys">Answers are published to every invited supplier so the sealed comparison stays fair.</div>
              </div>
              {sel.draft && (
                <div className="mt-12">
                  <AiProposal title="Proposed answer" confidence={sel.draft.confidence} sources={sel.draft.sources} approveLabel="Approve and publish">
                    {sel.draft.text}
                  </AiProposal>
                </div>
              )}
              {!sel.draft && !sel.answer && (
                <div className="mt-12 col">
                  <textarea className="textarea" placeholder="Write an answer. It is published to all invited suppliers." />
                  <div className="row">
                    <button className="btn btn-sm"><Icon name="send" size={13} /> Publish answer</button>
                    <button className="link">Ask AI to draft</button>
                  </div>
                </div>
              )}
            </Panel>
          ) : (
            <Panel><div className="state">Select a query to read and answer it.</div></Panel>
          )}
        </div>
      </div>
    </div>
  );
}
