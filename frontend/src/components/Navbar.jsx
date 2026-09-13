import { NavLink, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, ReceiptText, ShoppingCart, 
  CreditCard, Target, Calculator, BarChart3, LogOut, Settings as SettingsIcon, Wallet 
} from 'lucide-react';

const links = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions',icon: ReceiptText,     label: 'Transactions' },
  { to: '/items',       icon: ShoppingCart,    label: 'Items' },
  { to: '/debts',       icon: CreditCard,      label: 'Debts' },
  { to: '/goals',       icon: Target,          label: 'Goals' },
  { to: '/budget',      icon: Calculator,      label: 'Budget' },
  { to: '/analytics',   icon: BarChart3,       label: 'Analytics' },
  { to: '/settings',    icon: SettingsIcon,    label: 'Settings' },
];

export default function Navbar({ user, onSignOut }) {
  const initials = user?.email?.slice(0, 2).toUpperCase() || 'ME';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Wallet size={18} color="#fff" />
        </div>
        <div className="sidebar-logo-text">
          Smart<span>Budget</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Menu</div>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Icon size={16} className="nav-icon" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-pill">
          <div className="user-avatar">{initials}</div>
          <div className="user-email">{user?.email}</div>
          <button
            id="signout-btn"
            className="btn btn-icon btn-ghost"
            onClick={onSignOut}
            title="Sign out"
            style={{ marginLeft: 'auto', padding: '6px' }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
