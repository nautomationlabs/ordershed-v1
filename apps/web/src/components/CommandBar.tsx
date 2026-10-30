import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { filterCommands, type Command } from '@/lib/commands';
import { Icon } from './Icon';

/** Transaction-code style command bar. Opens on "/" or Ctrl+K. */
export function CommandBar({ commands, open, onClose }: { commands: Command[]; open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const list = useMemo(() => filterCommands(q, commands).slice(0, 12), [q, commands]);

  useEffect(() => {
    if (open) {
      setQ('');
      setI(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);
  useEffect(() => setI(0), [q]);

  if (!open) return null;
  const go = (c?: Command) => {
    if (!c) return;
    onClose();
    nav(c.to);
  };

  let lastGroup = '';
  return (
    <div className="cmd-scrim" onMouseDown={onClose}>
      <div className="cmd" role="dialog" aria-label="Command bar" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cmd-input">
          <Icon name="search" />
          <input
            ref={inputRef}
            value={q}
            placeholder="RFQ 123 · PO 456 · vendor hosur · new rfq"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setI((x) => Math.min(list.length - 1, x + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setI((x) => Math.max(0, x - 1));
              } else if (e.key === 'Enter') go(list[i]);
            }}
            aria-label="Command"
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="cmd-list" role="listbox">
          {list.length === 0 && <div className="state">No command matches "{q}". Try RFQ 123 or vendor pune.</div>}
          {list.map((c, idx) => {
            const head = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            return (
              <div key={c.id}>
                {head && <div className="cmd-group label">{head}</div>}
                <div className={`cmd-item${idx === i ? ' on' : ''}`} role="option" aria-selected={idx === i} onMouseEnter={() => setI(idx)} onClick={() => go(c)}>
                  <span className="code">{c.code}</span>
                  <span>{c.label}</span>
                  <span className="spacer" />
                  {idx === i && <span className="kbd">Enter</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="cmd-foot">
          <span><span className="kbd">↑</span> <span className="kbd">↓</span> move</span>
          <span><span className="kbd">Enter</span> open</span>
          <span>Document numbers: RFQ · PO · ASN · GRN · INV · MAT</span>
        </div>
      </div>
    </div>
  );
}
