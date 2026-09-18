import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, AlertTriangle, Calendar, CreditCard, ChevronRight, CheckCircle2, Repeat } from 'lucide-react';
import { useSubscriptions, useDebts } from '../hooks/useBudget.js';
import { pageVariants, staggerContainer, fadeUp } from '../lib/motion.js';
import { isBefore, addDays, parseISO, isSameDay } from 'date-fns';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export default function Notifications() {
  const { data: subscriptions = [], isLoading: subsLoading } = useSubscriptions();
  const { data: debts = [], isLoading: debtsLoading } = useDebts();

  const today = new Date();
  const nextWeek = addDays(today, 7);

  // Filter Subscriptions
  const overdueSubs = subscriptions.filter(s => s.status === 'active' && isBefore(parseISO(s.next_date), today) && !isSameDay(parseISO(s.next_date), today));
  const upcomingSubs = subscriptions.filter(s => {
    if (s.status !== 'active') return false;
    const d = parseISO(s.next_date);
    return (isBefore(d, nextWeek) || isSameDay(d, nextWeek)) && (isBefore(today, d) || isSameDay(d, today));
  });

  // Filter active debts/rent
  const activeDebts = debts.filter(d => d.remaining_balance > 0);

  const totalNotifications = overdueSubs.length + upcomingSubs.length + activeDebts.length;

  if (subsLoading || debtsLoading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-3)' }}>Loading alerts...</p>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      <header className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">You have {totalNotifications} alerts to review.</p>
        </div>
      </header>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {totalNotifications === 0 && (
          <motion.div variants={fadeUp} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-3)' }}>
            <CheckCircle2 size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
            <p>You're all caught up!</p>
          </motion.div>
        )}

        {/* Overdue Subscriptions */}
        {overdueSubs.length > 0 && (
          <motion.div variants={fadeUp}>
            <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--color-danger)', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} /> Overdue
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {overdueSubs.map(s => (
                <Link key={s.id} to="/subscriptions" style={{ textDecoration: 'none' }}>
                  <div className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid var(--color-danger)' }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: 8, borderRadius: 8 }}>
                      <Repeat size={18} color="var(--color-danger)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-danger)' }}>Overdue since {s.next_date}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{fmt.format(s.amount)}</div>
                    <ChevronRight size={16} color="var(--color-text-3)" />
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Upcoming Subscriptions */}
        {upcomingSubs.length > 0 && (
          <motion.div variants={fadeUp}>
            <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--color-text-3)', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} /> Upcoming in 7 Days
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingSubs.map(s => (
                <Link key={s.id} to="/subscriptions" style={{ textDecoration: 'none' }}>
                  <div className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid var(--color-primary)' }}>
                    <div style={{ background: 'var(--color-surface-2)', padding: 8, borderRadius: 8 }}>
                      <Calendar size={18} color="var(--color-primary)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Due on {s.next_date}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{fmt.format(s.amount)}</div>
                    <ChevronRight size={16} color="var(--color-text-3)" />
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Active Debts/Rent */}
        {activeDebts.length > 0 && (
          <motion.div variants={fadeUp}>
            <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--color-text-3)', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CreditCard size={14} /> Outstanding Debts & Rent
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeDebts.map(d => (
                <Link key={d.id} to="/debts" style={{ textDecoration: 'none' }}>
                  <div className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid var(--color-accent)' }}>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: 8, borderRadius: 8 }}>
                      <CreditCard size={18} color="var(--color-accent)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{d.creditor}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{d.kind === 'rent' ? 'Rent' : 'Debt'}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{fmt.format(d.remaining_balance)} left</div>
                    <ChevronRight size={16} color="var(--color-text-3)" />
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

      </motion.div>
    </div>
  );
}
