import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BRAND, ENV } from '@/config/brand';
import { CommandBar } from '@/components/CommandBar';
import { Icon } from '@/components/Icon';
import { Avatar, DocLink } from '@/components/primitives';
import type { Command } from '@/lib/commands';
import { alerts, ME } from '@/api/mock/data';
import { dateTime } from '@/lib/format';
import type { NavGroup } from './nav';

const SCOPES = ['Orders', 'Vendors', 'Materials', 'Invoices', 'RFQs'] as const;
const SCOPE_TO: Record<(typeof SCOPES)[number], string> = {
  Orders: '/b/orders', Vendors: '/b/vendors', Materials: '/b/materials', Invoices: '/b/payments', RFQs: '/b/rfqs',
};

export function DesktopShell({ nav, context, user }: { nav: NavGroup[]; context: 'Buyer' | 'Admin'; user: { name: string; role: string; plant?: string } }) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [scope, setScope] = useState<(typeof SCOPES)[number]>('Orders');
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const commands: Command[] = useMemo(
    () => nav.flatMap((g) => g.items.map((it) => ({ id: it.to, code: it.code, label: it.label, to: it.to, group: 'Go to' as const }))),
    [nav],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName);
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="mark">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <path d="M1 2h10v2H1zM1 5h7v2H1zM1 8h10v2H1z" fill="#fff" />
            </svg>
          </span>
          <span className="word">{BRAND.name}</span>
          <span className="ctx">{context}</span>
        </div>
        {context === 'Buyer' ? (
          <form
            className="search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`${SCOPE_TO[scope]}?q=${encodeURIComponent(q)}`);
            }}
          >
            <select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} aria-label="Search scope">
              {SCOPES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${scope.toLowerCase()} by number, part, vendor, GSTIN`} aria-label="Search" />
            <span className="kbd" title="Command bar">/</span>
          </form>
        ) : (
          <button className="search" style={{ alignItems: 'center', cursor: 'text', color: 'var(--faint)', paddingLeft: 10 }} onClick={() => setCmdOpen(true)}>
            <span style={{ flex: 1, textAlign: 'left' }}>Find RFQ, supplier, buyer org, template, event</span>
            <span className="kbd">/</span>
          </button>
        )}
        <span className="spacer" />
        {context === 'Buyer' && (
          <NavLink to="/b/chat" className="tool" title="Query tracker">
            <Icon name="chat" size={15} /> Queries <span className="n">4</span> open · <span className="n crit">1</span> due today
          </NavLink>
        )}
        <div className="pop-anchor">
          <button className="tool" onClick={() => setAlertsOpen((v) => !v)} aria-expanded={alertsOpen} title="Alerts">
            <Icon name="bell" size={15} /> <span className="n crit">{alerts.length}</span>
          </button>
          {alertsOpen && (
            <div className="popover" style={{ width: 380 }} onMouseLeave={() => setAlertsOpen(false)}>
              <div className="pop-head label">Alerts</div>
              {alerts.map((a) => (
                <div key={a.id} className="pop-item" style={{ whiteSpace: 'normal', alignItems: 'flex-start' }}>
                  <span className={`chip plain tone-${a.tone}`} style={{ marginTop: 1 }}>{a.tone === 'crit' ? 'Blocked' : a.tone === 'warn' ? 'Waiting' : 'Ready'}</span>
                  <div>
                    <div>{a.text}</div>
                    <div className="small muted">
                      <DocLink id={a.doc} /> · <span className="mono">{dateTime(a.at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="userchip">
          <Avatar name={user.name} />
          <div>
            <div className="nm">{user.name}</div>
            <div className="rl">
              {user.role}
              {user.plant ? ` · ${user.plant}` : ''}
            </div>
          </div>
        </div>
      </header>

      <nav className="sidebar" aria-label="Main">
        {nav.map((g, gi) => (
          <div className="nav-group" key={gi}>
            {g.label && <span className="label">{g.label}</span>}
            {g.items.map((it) => (
              <NavLink key={it.to} to={it.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} end={it.to.endsWith('/vendors')}>
                <Icon name={it.icon} size={15} />
                <span>{it.label}</span>
                {it.phase ? <span className="phase">{it.phase}</span> : it.count !== undefined && <span className={`cnt${it.countTone ? ` ${it.countTone}` : ''}`}>{it.count}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <main className="main" id="main">
        <Outlet />
      </main>

      <footer className="footer">
        <span><span className="k">/</span> Command</span>
        <span><span className="k">Ctrl K</span> Jump</span>
        <span><span className="k">J K</span> Move</span>
        <span><span className="k">Enter</span> Open</span>
        <span><span className="k">Esc</span> Close</span>
        <span><span className="k">F1</span> Help</span>
        <span className="env">
          <span className="sandbox">{ENV.label}</span>
          {context === 'Buyer' ? <span>Plant {ME.plant} · Chakan</span> : <span>Role {user.role}</span>}
          <span>ap-south-1</span>
          <span>v{ENV.version}</span>
        </span>
      </footer>

      <CommandBar commands={commands} open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
