import { TrendingUp, TrendingDown, DollarSign, Landmark, AlertTriangle } from 'lucide-react';
import { useDashboard, useAnalytics, useSettings, useTransactions } from '../hooks/useBudget.js';
import { computeCycleBounds } from '../lib/dateUtils.js';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { staggerContainer, itemVariants, fadeUp } from '../lib/motion.js';
import CashFlowSankey from '../components/CashFlowSankey.jsx';
import HistoryChart from '../components/HistoryChart.jsx';
import { useMemo } from 'react';
import { useAccounts, useItems, useDebts, useGoals } from '../hooks/useBudget.js';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const currentMonth = new Date().toISOString().substring(0, 7);

function StatCard({ icon, iconBg, iconColor, label, value, valueClass }) {
  return (
    <motion.div className="card stat-card" variants={itemVariants} whileHover={{ y: -3, transition: { duration: 0.18 } }}>
      <div className="stat-icon" style={{ background: iconBg }}>
        {icon(iconColor)}
      </div>
      <div className="stat-label flex items-center justify-between">
        <span>{label}</span>
      </div>
      <motion.div className={`stat-value ${valueClass}`} variants={fadeUp}>
        {value}
      </motion.div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { summary } = useDashboard(currentMonth);
  const { trends } = useAnalytics(currentMonth);
  const { data: settings } = useSettings();
  const { start: cycleStart, end: cycleEnd } = computeCycleBounds(currentMonth, settings?.data || settings);
  const { query: txnQuery } = useTransactions({ from: cycleStart, to: cycleEnd });
  
  const { query: accountsQuery } = useAccounts();
  const { query: itemsQuery } = useItems();
  const { query: debtsQuery } = useDebts();
  const { query: goalsQuery } = useGoals();
  
  const s = summary.data;
  const t = trends.data;
  const transactions = txnQuery.data || [];

  const accountMap = useMemo(() => Object.fromEntries((accountsQuery.data || []).map(a => [a.id, a])), [accountsQuery.data]);
  const itemMap = useMemo(() => Object.fromEntries((itemsQuery.data || []).map(i => [i.id, i])), [itemsQuery.data]);
  const debtMap = useMemo(() => Object.fromEntries((debtsQuery.data || []).map(d => [d.id, d])), [debtsQuery.data]);
  const goalMap = useMemo(() => Object.fromEntries((goalsQuery.data || []).map(g => [g.id, g])), [goalsQuery.data]);

  const recentTxns = [...transactions]
    .sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at))
    .slice(0, 6);

  function renderTarget(txn) {
    if (txn.type === 'expense' && txn.item_id) return itemMap[txn.item_id]?.name || 'Item';
    if (txn.type === 'debt_payment' && txn.debt_id) return debtMap[txn.debt_id]?.name || 'Debt';
    if (txn.type === 'goal_contribution' && txn.goal_id) return goalMap[txn.goal_id]?.name || 'Goal';
    return <span className="text-muted">—</span>;
  }

  return (
    <div className="page">
      <motion.div className="page-header" variants={fadeUp} initial="hidden" animate="visible">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {settings && (settings.data?.cycle_start_date || settings.cycle_start_date)
              ? `Cycle: ${new Date(cycleStart).toLocaleDateString()} — ${new Date(cycleEnd).toLocaleDateString()}`
              : `${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · Your financial overview`}
          </p>
        </div>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        className="grid-4 mb-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <StatCard
          icon={(c) => <Landmark size={18} color={c} />}
          iconBg="rgba(237,237,237,0.08)" iconColor="var(--color-text)"
          label="Total Balance" value={s ? fmt.format(s.total_balance) : '—'} valueClass=""
        />
        <StatCard
          icon={(c) => <DollarSign size={18} color={c} />}
          iconBg="rgba(52,211,153,0.1)" iconColor="var(--color-success)"
          label="Cycle Income" value={s ? fmt.format(s.cycle_income) : '—'} valueClass="positive"
        />
        <StatCard
          icon={(c) => <TrendingDown size={18} color={c} />}
          iconBg="rgba(239,68,68,0.1)" iconColor="var(--color-danger)"
          label="Cycle Expenses" value={s ? fmt.format(s.cycle_expense) : '—'} valueClass="negative"
        />
        <StatCard
          icon={(c) => <TrendingUp size={18} color={c} />}
          iconBg="rgba(99,179,237,0.1)" iconColor="hsl(205,75%,65%)"
          label="Net Savings" value={s ? fmt.format(s.net_savings) : '—'}
          valueClass={s && s.net_savings >= 0 ? 'positive' : 'negative'}
        />
      </motion.div>

      {/* 6-Month History Visual */}
      {t?.history && t.history.length > 0 && (
        <motion.div className="card mb-6" variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.15 }}>
          <div className="section-header">
            <div className="section-title">📊 6-Month Trend</div>
          </div>
          <HistoryChart data={t.history} />
        </motion.div>
      )}

      <motion.div className="grid-2" variants={staggerContainer} initial="hidden" animate="visible">
        {/* Goals Progress */}
        <motion.div className="card" variants={itemVariants}>
          <div className="section-header">
            <div className="section-title">
              🎯 Goals Progress
            </div>
            <Link to="/goals" className="btn btn-ghost btn-sm">View All</Link>
          </div>

          {s?.goals && s.goals.length > 0 ? (
            <motion.div className="flex flex-col gap-3" variants={staggerContainer} initial="hidden" animate="visible">
              {s.goals.slice(0, 4).map((g) => {
                const pct = Math.min(100, (g.current_amount / g.target_amount) * 100);
                return (
                  <motion.div
                    key={g.id}
                    variants={itemVariants}
                    className="flex flex-col"
                    style={{ padding: 'var(--space-3)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius)' }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-semibold text-sm">{g.name}</div>
                      <div className="text-xs text-muted">{pct.toFixed(0)}%</div>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--color-primary)' }} />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <div className="text-sm text-muted">
              <span>No goals yet. <Link to="/goals" style={{ color: 'var(--color-primary)' }}>Add one →</Link></span>
            </div>
          )}
        </motion.div>

        {/* Spending alerts */}
        <motion.div className="card" variants={itemVariants}>
          <div className="section-header">
            <div className="section-title">📈 Spending Alerts</div>
            <Link to="/analytics" className="btn btn-ghost btn-sm">Analytics</Link>
          </div>

          {t?.category_trends?.filter((c) => c.flagged).length > 0 ? (
            <motion.div className="flex flex-col gap-3" variants={staggerContainer} initial="hidden" animate="visible">
              {t.category_trends.filter((c) => c.flagged).slice(0, 4).map((c) => (
                <motion.div key={c.item_id} className="flex items-center justify-between" variants={itemVariants}>
                  <span className="text-sm">{c.name}</span>
                  <span className={`badge ${c.deviation_pct > 0 ? 'badge-danger' : 'badge-success'}`}>
                    {c.deviation_pct > 0 ? '↑' : '↓'} {Math.abs(c.deviation_pct).toFixed(1)}%
                  </span>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-sm text-muted">No spending anomalies this month.</div>
          )}
        </motion.div>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div className="card mt-6" variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.3 }}>
        <div className="section-header">
          <div className="section-title">Recent Transactions</div>
          <Link to="/transactions" className="btn btn-ghost btn-sm">View All</Link>
        </div>

        {recentTxns.length === 0 ? (
          <div className="text-sm text-muted">No transactions this month. <Link to="/transactions" style={{ color: 'var(--color-primary)' }}>Log one →</Link></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Account</th><th>Target</th><th>Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTxns.map((txn, i) => (
                  <motion.tr
                    key={txn.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.05, duration: 0.25, ease: 'easeOut' }}
                  >
                    <td className="text-muted">
                      {new Date(txn.occurred_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </td>
                    <td>{accountMap[txn.account_id]?.name || '—'}</td>
                    <td>{renderTarget(txn)}</td>
                    <td>
                      <span className={`badge ${
                        txn.type === 'income' || txn.type === 'transfer_in' ? 'badge-success' : 
                        (txn.type === 'expense' || txn.type === 'transfer_out' ? 'badge-danger' : 'badge-important')
                      }`}>
                        {txn.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: (txn.type === 'income' || txn.type === 'transfer_in') ? 'var(--color-success)' : 'var(--color-text)' }}>
                      {(txn.type === 'income' || txn.type === 'transfer_in') ? '+' : '-'}{fmt.format(txn.amount)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
