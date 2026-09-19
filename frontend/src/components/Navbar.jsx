import { useState } from 'react';
import { impactLight } from '../lib/haptics.js';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ReceiptText, ShoppingCart,
  CreditCard, Target, Calculator, BarChart3, LogOut, Settings as SettingsIcon, Wallet, Landmark, Repeat, User, Bell, Plane, Calendar, CheckSquare, FileText, Users, Grid, X, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { slideInLeft, tapFeedback, backdropVariants, modalVariants } from '../lib/motion.js';

const navGroups = [
  {
    title: 'Finance',
    links: [
      { to: '/',             icon: LayoutDashboard, label: 'Dashboard'    },
      { to: '/accounts',     icon: Landmark,        label: 'Accounts'     },
      { to: '/transactions', icon: ReceiptText,     label: 'Transactions' },
      { to: '/budget',       icon: Calculator,      label: 'Budget Planner' },
      { to: '/subscriptions',icon: Repeat,          label: 'Subscriptions'},
      { to: '/people-ledger',icon: Users,           label: 'IOUs'         },
      { to: '/analytics',    icon: BarChart3,       label: 'Analytics'    },
    ]
  },
  {
    title: 'Life',
    links: [
      { to: '/trips',        icon: Plane,           label: 'Trips'        },
      { to: '/debts',        icon: CreditCard,      label: 'Debts'        },
      { to: '/goals',        icon: Target,          label: 'Goals'        },
      { to: '/items',        icon: ShoppingCart,    label: 'Items'        },
    ]
  },
  {
    title: 'Assistant',
    links: [
      { to: '/assistant',    icon: MessageSquare,   label: 'Chat'         },
      { to: '/calendar',     icon: Calendar,        label: 'Calendar'     },
      { to: '/tasks',        icon: CheckSquare,     label: 'Tasks'        },
      { to: '/notes',        icon: FileText,        label: 'Notes'        },
      { to: '/contacts',     icon: Users,           label: 'Contacts'     },
    ]
  },
  {
    title: 'System',
    links: [
      { to: '/settings',     icon: SettingsIcon,    label: 'Settings'     },
    ]
  }
];

const bottomTabs = [
  { to: '/',             icon: LayoutDashboard, label: 'Home'    },
  { to: '/calendar',     icon: Calendar,        label: 'Calendar'},
  { to: '/tasks',        icon: CheckSquare,     label: 'Tasks'   },
  { to: '/debts',        icon: CreditCard,      label: 'Debts'   },
];

export default function Navbar({ user, onSignOut }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const initials = user?.email?.slice(0, 2).toUpperCase() || 'ME';

  return (
    <>
      <aside className="sidebar">
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
        <nav className="sidebar-nav" style={{ overflowY: 'auto', paddingBottom: '20px' }}>
          {navGroups.map((group, gIdx) => (
            <div key={group.title} style={{ marginBottom: '16px' }}>
              <div className="sidebar-section-label">{group.title}</div>
              {group.links.map(({ to, icon: Icon, label }, i) => (
                <motion.div
                  key={to}
                  custom={gIdx * 4 + i}
                  variants={slideInLeft}
                  initial="hidden"
                  animate="visible"
                >
                  <NavLink
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  >
                    <Icon size={16} className="nav-icon" />
                    {label}
                  </NavLink>
                </motion.div>
              ))}
            </div>
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
              whileTap={tapFeedback} onTapStart={impactLight}
            >
              <LogOut size={14} />
            </motion.button>
          </div>
        </motion.div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="bottom-tab-bar">
        {bottomTabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `bottom-tab-link${isActive && !mobileMenuOpen ? ' active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button 
          className={`bottom-tab-link ${mobileMenuOpen ? 'active' : ''}`}
          onClick={() => {
            impactLight();
            setMobileMenuOpen(true);
          }}
        >
          <Grid size={22} />
          <span>Menu</span>
        </button>
      </nav>

      {/* Mobile Fullscreen Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="mobile-full-menu"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: '64px',
              backgroundColor: 'var(--color-surface)',
              zIndex: 90,
              overflowY: 'auto',
              padding: '24px 16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Menu</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="btn btn-icon btn-ghost"><X size={20}/></button>
            </div>

            {navGroups.map((group) => (
              <div key={group.title} style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{group.title}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {group.links.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/'}
                      className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                      style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'var(--color-surface-2)' }}
                    >
                      <Icon size={18} className="nav-icon" />
                      {label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
