import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Landmark, ReceiptText, ShoppingCart, Target, 
  Calculator, BarChart3, Repeat, LogOut, ChevronRight
} from 'lucide-react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth.js';
import { pageVariants, staggerContainer, fadeUp } from '../lib/motion.js';
import toast from '../lib/haptics.js';

const menuItems = [
  { to: '/accounts',      icon: Landmark,        label: 'Accounts',      desc: 'Manage bank accounts' },
  { to: '/transactions',  icon: ReceiptText,     label: 'Transactions',  desc: 'View all history' },
  { to: '/subscriptions', icon: Repeat,          label: 'Subscriptions', desc: 'Manage recurring' },
  { to: '/items',         icon: ShoppingCart,    label: 'Items',         desc: 'Wishlist & stuff' },
  { to: '/goals',         icon: Target,          label: 'Goals',         desc: 'Saving targets' },
  { to: '/budget',        icon: Calculator,      label: 'Budget',        desc: 'Plan your budget' },
  { to: '/analytics',     icon: BarChart3,       label: 'Analytics',     desc: 'Charts & reports' },
];

export default function Profile() {
  const { user, signOut } = useSupabaseAuth();
  const initials = user?.email?.slice(0, 2).toUpperCase() || 'ME';

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out');
    } catch (e) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      <header className="page-header">
        <h1 className="page-title">Profile</h1>
      </header>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* User Card */}
        <motion.div variants={fadeUp} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="user-avatar" style={{ width: 64, height: 64, fontSize: 24 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email}
            </h2>
            <p style={{ color: 'var(--color-text-3)', fontSize: 'var(--text-sm)', margin: 0 }}>
              Logged in
            </p>
          </div>
        </motion.div>

        {/* Menu Grid */}
        <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {menuItems.map(({ to, icon: Icon, label, desc }) => (
            <Link key={to} to={to} style={{ textDecoration: 'none' }}>
              <div className="card card-sm" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid var(--color-border-2)', background: 'var(--color-surface-2)' }}>
                <Icon size={24} color="var(--color-primary)" />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </motion.div>

        {/* Actions */}
        <motion.div variants={fadeUp} style={{ marginTop: 16 }}>
          <button 
            onClick={handleSignOut} 
            className="btn" 
            style={{ width: '100%', justifyContent: 'center', background: 'var(--color-surface-2)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </motion.div>

      </motion.div>
    </div>
  );
}
