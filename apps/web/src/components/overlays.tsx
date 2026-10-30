import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';

function useEsc(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
}

/** Side panel for record detail. Esc closes. */
export function Drawer({ open, onClose, title, sub, children, foot, wide }: { open: boolean; onClose: () => void; title: ReactNode; sub?: ReactNode; children: ReactNode; foot?: ReactNode; wide?: boolean }) {
  useEsc(onClose);
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className={`drawer${wide ? ' wide' : ''}`} role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div style={{ minWidth: 0 }}>
            <h2 className="ellipsis">{title}</h2>
            {sub && <div className="small muted">{sub}</div>}
          </div>
          <span className="spacer" />
          <span className="kbd">Esc</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {foot && <div className="drawer-foot">{foot}</div>}
      </aside>
    </>
  );
}

/** Bottom sheet for phone screens. */
export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEsc(onClose);
  if (!open) return null;
  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="grip" />
        <h2 style={{ fontSize: 17, marginBottom: 12 }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
