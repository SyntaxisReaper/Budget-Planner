import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ReceiptText, ShoppingCart,
  CreditCard, Target, Calculator, BarChart3, LogOut, Settings as SettingsIcon, Wallet, Menu
} from 'lucide-react';
import { motion } from 'framer-motion';
import { slideInLeft } from '../lib/motion.js';

const links = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/transactions', icon: ReceiptText,     label: 'Transactions' },
  { to: '/items',        icon: ShoppingCart,    label: 'Items'        },
  { to: '/debts',        icon: CreditCard,      label: 'Debts'        },
  { to: '/goals',        icon: Target,          label: 'Goals'        },
  { to: '/budget',       icon: Calculator,      label: 'Budget'       },
  { to: '/analytics',    icon: BarChart3,       label: 'Analytics'    },
  { to: '/settings',     icon: SettingsIcon,    label: 'Settings'     },
];

export default function Navbar({ user, onSignOut }) {
  const [isOpen, setIsOpen] = useState(false);
  const initials = user?.email?.slice(0, 2).toUpperCase() || 'ME';

  return (
    <>
      {/* Mobile Topbar */}
      <div className="mobile-topbar">
        <div className="sidebar-logo" style={{ padding: 0, margin: 0 }}>
          <div className="sidebar-logo-icon">
            <Wallet size={18} color="#000" />
          </div>
          <div className="sidebar-logo-text">
            Smart<span>Budget</span>
          </div>
        </div>
        <button className="btn btn-icon btn-ghost" onClick={() => setIsOpen(true)}>
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile Overlay */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(false)} 
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo */}
        <motion.div
          className="sidebar-logo"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <motion.div
            className="sidebar-logo-icon"
            whileHover={{ rotate: 8, scale: 1.08 }}
            transition={{ duration: 0.2 }}
          >
            <Wallet size={18} color="#000" />
          </motion.div>
          <div className="sidebar-logo-text">
            Smart<span>Budget</span>
          </div>
        </motion.div>

        {/* Nav links */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Menu</div>
          {links.map(({ to, icon: Icon, label }, i) => (
            <motion.div
              key={to}
              custom={i}
              variants={slideInLeft}
              initial="hidden"
              animate="visible"
            >
              <NavLink
                to={to}
                end={to === '/'}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <Icon size={16} className="nav-icon" />
                {label}
              </NavLink>
            </motion.div>
          ))}
        </nav>

        {/* Footer */}
        <motion.div
          className="sidebar-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <div className="user-pill">
            <motion.div
              className="user-avatar"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.15 }}
            >
              {initials}
            </motion.div>
            <div className="user-email">{user?.email}</div>
            <motion.button
              id="signout-btn"
              className="btn btn-icon btn-ghost"
              onClick={onSignOut}
              title="Sign out"
              style={{ marginLeft: 'auto', padding: '6px' }}
              whileHover={{ scale: 1.15, color: 'var(--color-danger)' }}
              whileTap={{ scale: 0.9 }}
            >
              <LogOut size={14} />
            </motion.button>
          </div>
        </motion.div>
      </aside>
    </>
  );
}
