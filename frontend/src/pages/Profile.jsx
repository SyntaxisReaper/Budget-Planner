import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
  Landmark, ReceiptText, ShoppingCart, Target, 
  Calculator, BarChart3, Repeat, LogOut, ChevronRight, Plus, ArrowRightLeft, Sparkles, Users
} from 'lucide-react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth.js';
import { useAccounts, useDebts } from '../hooks/useBudget.js';
import { pageVariants, staggerContainer, fadeUp } from '../lib/motion.js';
import toast from '../lib/haptics.js';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

const menuItems = [
  { to: '/accounts',      icon: Landmark,        label: 'Accounts',      desc: 'Manage bank accounts' },
  { to: '/transactions',  icon: ReceiptText,     label: 'Transactions',  desc: 'View all history' },
  { to: '/subscriptions', icon: Repeat,          label: 'Subscriptions', desc: 'Manage recurring' },
  { to: '/items',         icon: ShoppingCart,    label: 'Items',         desc: 'Wishlist & stuff' },
  { to: '/goals',         icon: Target,          label: 'Goals',         desc: 'Saving targets' },
  { to: '/budget',        icon: Calculator,      label: 'Budget',        desc: 'Plan your budget' },
  { to: '/people',        icon: Users,           label: 'People',        desc: 'Informal IOUs' },
  { to: '/analytics',     icon: BarChart3,       label: 'Analytics',     desc: 'Charts & reports' },
];

export default function Profile() {
  const { user, signOut } = useSupabaseAuth();
  const { query: accQuery } = useAccounts();
  const { query: debtQuery } = useDebts();
  
  const initials = user?.email?.slice(0, 2).toUpperCase() || 'ME';

  const accounts = accQuery.data || [];
  const debts = debtQuery.data || [];
  
  const netWorth = accounts.reduce((s, a) => s + (Number(a.current_balance) || 0), 0);
  const totalDebt = debts.reduce((s, d) => s + (Number(d.remaining_balance) || 0), 0);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out');
    } catch (e) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <header className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <h1 className="page-title">Profile</h1>
      </header>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Premium User Card */}
        <motion.div variants={fadeUp} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px' }}>
          <div className="user-avatar" style={{ width: 64, height: 64, fontSize: 24, background: 'var(--grad-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', boxShadow: 'var(--shadow-sm)' }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email?.split('@')[0]}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--color-primary)', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, background: 'var(--color-surface-2)', padding: '2px 8px', borderRadius: '12px' }}>
                <Sparkles size={12} /> PRO
              </span>
              <p style={{ color: 'var(--color-text-3)', fontSize: 'var(--text-sm)', margin: 0 }}>
                {user?.email}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Financial Overview */}
        <motion.div variants={fadeUp} className="grid-2">
          <div className="card stat-card">
            <span className="stat-label">Net Worth</span>
            <span className="stat-value primary" style={{ fontSize: 'var(--text-xl)' }}>{fmt.format(netWorth)}</span>
          </div>
          <div className="card stat-card">
            <span className="stat-label">Total Debt</span>
            <span className="stat-value negative" style={{ fontSize: 'var(--text-xl)' }}>{fmt.format(totalDebt)}</span>
          </div>
        </motion.div>
        
        {/* Quick Actions */}
        <motion.div variants={fadeUp} style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, margin: '0 -16px', padding: '0 16px' }}>
          <Link to="/transactions" className="btn btn-primary" style={{ flexShrink: 0 }}>
            <Plus size={16} /> Log Expense
          </Link>
          <Link to="/transactions" className="btn" style={{ flexShrink: 0 }}>
            <ArrowRightLeft size={16} /> Transfer
          </Link>
          <Link to="/accounts" className="btn" style={{ flexShrink: 0 }}>
            <Landmark size={16} /> Add Account
          </Link>
        </motion.div>

        {/* Native-feeling Vertical Menu */}
        <motion.div variants={fadeUp} className="card" style={{ padding: 0 }}>
          {menuItems.map(({ to, icon: Icon, label, desc }, i) => (
            <Link key={to} to={to} style={{ 
              display: 'flex', alignItems: 'center', padding: '16px', textDecoration: 'none', 
              borderBottom: i < menuItems.length - 1 ? '1px solid var(--color-border)' : 'none',
              transition: 'background 0.2s', color: 'inherit'
            }}>
              <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 16, color: 'var(--color-primary)' }}>
                <Icon size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, margin: 0 }}>{label}</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', margin: 0 }}>{desc}</p>
              </div>
              <ChevronRight size={20} color="var(--color-text-3)" />
            </Link>
          ))}
        </motion.div>

        <motion.div variants={fadeUp}>
          <button onClick={handleSignOut} className="btn" style={{ width: '100%', color: 'var(--color-danger)', borderColor: 'var(--color-danger)', background: 'transparent' }}>
            <LogOut size={18} /> Sign Out
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
