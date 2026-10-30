import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';

/** Supplier phone shell: 390 × 844, four tabs. Profile is set up once, reached from the header. */
export function PhoneShell({ title, children, back, right, tabs = true, cta, flush }: { title: ReactNode; children: ReactNode; back?: string | true; right?: ReactNode; tabs?: boolean; cta?: ReactNode; flush?: boolean }) {
  const nav = useNavigate();
  return (
    <div className="phone-stage">
      <div className="phone">
        <header className="p-top">
          {back && (
            <button className="back" onClick={() => (back === true ? nav(-1) : nav(back))} aria-label="Back">
              <Icon name="chevronLeft" size={20} />
            </button>
          )}
          <h1 className="ellipsis" style={{ flex: 1 }}>{title}</h1>
          {right}
        </header>
        <div className={`p-body${flush ? ' flush' : ''}`}>{children}</div>
        {cta && <div className="p-cta">{cta}</div>}
        {tabs && !cta && (
          <nav className="p-tabs" aria-label="Supplier">
            <NavLink to="/s/open" className={({ isActive }) => `p-tab${isActive ? ' active' : ''}`}>
              <Icon name="inbox" size={20} />
              Open items
              <span className="badge">5</span>
            </NavLink>
            <NavLink to="/s/quote/RFQ-000128" className={({ isActive }) => `p-tab${isActive ? ' active' : ''}`}>
              <Icon name="receipt" size={20} />
              Quote
            </NavLink>
            <NavLink to="/s/catalogue" className={({ isActive }) => `p-tab${isActive ? ' active' : ''}`}>
              <Icon name="grid" size={20} />
              Catalogue
            </NavLink>
            <NavLink to="/s/orders" className={({ isActive }) => `p-tab${isActive ? ' active' : ''}`}>
              <Icon name="box" size={20} />
              Orders
            </NavLink>
          </nav>
        )}
      </div>
    </div>
  );
}
