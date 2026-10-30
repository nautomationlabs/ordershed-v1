import type { ReactNode } from 'react';

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="state" role="status">
      <h3>{title}</h3>
      {body && <p style={{ maxWidth: 420 }}>{body}</p>}
      {action && <div className="actions">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, requestId, onRetry }: { message: string; requestId?: string; onRetry?: () => void }) {
  return (
    <div className="state crit" role="alert">
      <h3>Could not load this list</h3>
      <p>{message} Nothing was changed.</p>
      {requestId && <code>Request {requestId}</code>}
      <div className="actions">
        {onRetry && (
          <button className="btn btn-sm" onClick={onRetry}>
            Try again
          </button>
        )}
        <a href="mailto:ops@ordershed.example">Tell ops</a>
      </div>
    </div>
  );
}

export function LoadingBlock({ lines = 4 }: { lines?: number }) {
  return (
    <div className="col" style={{ padding: 14 }} aria-busy="true">
      {Array.from({ length: lines }).map((_, i) => (
        <span key={i} className="skel" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}
