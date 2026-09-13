import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { useAnalytics, useTransactions, useGoals } from '../hooks/useBudget.js';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { staggerContainer, itemVariants, fadeUp } from '../lib/motion.js';
import CashFlowSankey from '../components/CashFlowSankey.jsx';
import HistoryChart from '../components/HistoryChart.jsx';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const currentMonth = new Date().toISOString().substring(0, 7);

function StatCard({ icon, iconBg, iconColor, label, value, valueClass }) {
  return (
    <motion.div className="card stat-card" variants={itemVariants} whileHover={{ y: -3, transition: { duration: 0.18 } }}>
      <div className="stat-icon" style={{ background: iconBg }}>
        {icon(iconColor)}
      </div>
      <div className="stat-label">{label}</div>
      <motion.div className={`stat-value ${valueClass}`} variants={fadeUp}>
        {value}
      </motion.div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { summary } = useAnalytics(currentMonth);
  const { query: txnQuery } = useTransactions(currentMonth);
  const { query: goalsQuery } = useGoals();

  const s = summary.data;
  const transactions = txnQuery.data || [];
  const goals = goalsQuery.data || [];
  const atRiskGoals = goals.filter((g) => g.at_risk);

  const recentTxns = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  return (
    <div className="page">
      <motion.div className="page-header" variants={fadeUp} initial="hidden" animate="visible">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · Your financial overview
        </p>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        className="grid-4 mb-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <StatCard
          icon={(c) => <DollarSign size={18} color={c} />}
          iconBg="rgba(237,237,237,0.08)" iconColor="var(--color-text)"
          label="Monthly Income" value={s ? fmt.format(s.total_income) : '—'} valueClass="primary"
        />
        <StatCard
          icon={(c) => <TrendingDown size={18} color={c} />}
          iconBg="rgba(239,68,68,0.1)" iconColor="var(--color-danger)"
          label="Expenses" value={s ? fmt.format(s.total_expenses) : '—'} valueClass="negative"
        />
        <StatCard
          icon={(c) => <TrendingUp size={18} color={c} />}
          iconBg="rgba(52,211,153,0.1)" iconColor="var(--color-success)"
          label="Net Savings" value={s ? fmt.format(s.net_savings) : '—'}
          valueClass={s && s.net_savings >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          icon={(c) => <TrendingUp size={18} color={c} />}
          iconBg="rgba(99,179,237,0.1)" iconColor="hsl(205,75%,65%)"
          label="Savings Rate" value={s ? `${s.savings_rate}%` : '—'}
          valueClass={s && s.savings_rate >= 0 ? 'positive' : 'negative'}
        />
      </motion.div>

      {/* Cash Flow Visual */}
      {s?.sankey && s.sankey.links.length > 0 && (
        <motion.div className="card mb-6" variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
          <div className="section-header">
            <div className="section-title">💸 Cash Flow Map</div>
          </div>
          <CashFlowSankey data={s.sankey} />
        </motion.div>
      )}

      {/* 6-Month History Visual */}
      {s?.history && s.history.length > 0 && (
        <motion.div className="card mb-6" variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.15 }}>
          <div className="section-header">
            <div className="section-title">📊 6-Month Trend</div>
          </div>
          <HistoryChart data={s.history} />
        </motion.div>
      )}

      <motion.div className="grid-2" variants={staggerContainer} initial="hidden" animate="visible">
        {/* Goals at risk */}
        <motion.div className="card" variants={itemVariants}>
          <div className="section-header">
            <div className="section-title">
              {atRiskGoals.length > 0 ? (
                <span className="flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
                  <AlertTriangle size={16} /> Goals At Risk
                </span>
              ) : '🎯 Goals'}
            </div>
            <Link to="/goals" className="btn btn-ghost btn-sm">View All</Link>
          </div>

          {atRiskGoals.length > 0 ? (
            <motion.div className="flex flex-col gap-3" variants={staggerContainer} initial="hidden" animate="visible">
              {atRiskGoals.map((g) => (
                <motion.div
                  key={g.id}
                  variants={itemVariants}
                  className="flex items-center justify-between"
                  style={{ padding: 'var(--space-3)', background: 'rgba(245,158,11,0.06)', borderRadius: 'var(--radius)', border: '1px solid rgba(245,158,11,0.15)' }}
                >
                  <div>
                    <div className="font-semibold text-sm">{g.name}</div>
                    <div className="text-xs text-muted">Needs {fmt.format(g.monthly_needed)}/mo</div>
                  </div>
                  <span className="badge badge-danger">At Risk</span>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-sm text-muted">
              {goals.length === 0 ? (
                <span>No goals yet. <Link to="/goals" style={{ color: 'var(--color-primary)' }}>Add one →</Link></span>
              ) : (
                <span className="text-success">✓ All goals on track</span>
              )}
            </div>
          )}
        </motion.div>

        {/* Spending alerts */}
        <motion.div className="card" variants={itemVariants}>
          <div className="section-header">
            <div className="section-title">📈 Spending Alerts</div>
            <Link to="/analytics" className="btn btn-ghost btn-sm">Analytics</Link>
          </div>

          {s?.category_trends?.filter((c) => c.flagged).length > 0 ? (
            <motion.div className="flex flex-col gap-3" variants={staggerContainer} initial="hidden" animate="visible">
              {s.category_trends.filter((c) => c.flagged).slice(0, 4).map((c) => (
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
                  <th>Date</th><th>Item</th><th>Note</th><th>Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTxns.map((t, i) => (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.05, duration: 0.25, ease: 'easeOut' }}
                  >
                    <td className="text-muted">{new Date(t.date).toLocaleDateString()}</td>
                    <td>{t.items?.name || '—'}</td>
                    <td className="text-muted">{t.note || '—'}</td>
                    <td><span className={`badge ${t.type === 'income' ? 'badge-success' : 'badge-danger'}`}>{t.type}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: t.type === 'income' ? 'var(--color-success)' : 'var(--color-text)' }}>
                      {t.type === 'income' ? '+' : '-'}{fmt.format(t.amount)}
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
