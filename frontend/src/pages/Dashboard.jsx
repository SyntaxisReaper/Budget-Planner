import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { useAnalytics, useTransactions, useGoals } from '../hooks/useBudget.js';
import { Link } from 'react-router-dom';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const currentMonth = new Date().toISOString().substring(0, 7);

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
    <div className="page animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · Your financial overview
        </p>
      </div>

      {/* Stats row */}
      <div className="grid-4 mb-6">
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(113,90,255,0.1)' }}>
            <DollarSign size={18} color="var(--color-primary)" />
          </div>
          <div className="stat-label">Monthly Income</div>
          <div className="stat-value primary">{s ? fmt.format(s.total_income) : '—'}</div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <TrendingDown size={18} color="var(--color-danger)" />
          </div>
          <div className="stat-label">Expenses</div>
          <div className="stat-value negative">{s ? fmt.format(s.total_expenses) : '—'}</div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(52,211,153,0.1)' }}>
            <TrendingUp size={18} color="var(--color-success)" />
          </div>
          <div className="stat-label">Net Savings</div>
          <div className={`stat-value ${s && s.net_savings >= 0 ? 'positive' : 'negative'}`}>
            {s ? fmt.format(s.net_savings) : '—'}
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(56,211,159,0.1)' }}>
            <TrendingUp size={18} color="var(--color-accent)" />
          </div>
          <div className="stat-label">Savings Rate</div>
          <div className={`stat-value ${s && s.savings_rate >= 0 ? 'accent' : 'negative'}`}>
            {s ? `${s.savings_rate}%` : '—'}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* At-risk goals alert */}
        <div className="card">
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
            <div className="flex flex-col gap-3">
              {atRiskGoals.map((g) => (
                <div key={g.id} className="flex items-center justify-between" style={{ padding: 'var(--space-3)', background: 'rgba(245,158,11,0.06)', borderRadius: 'var(--radius)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <div>
                    <div className="font-semibold text-sm">{g.name}</div>
                    <div className="text-xs text-muted">Needs {fmt.format(g.monthly_needed)}/mo</div>
                  </div>
                  <span className="badge badge-danger">At Risk</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted">
              {goals.length === 0 ? (
                <span>No goals yet. <Link to="/goals" style={{ color: 'var(--color-primary)' }}>Add one →</Link></span>
              ) : (
                <span className="text-success">✓ All goals on track</span>
              )}
            </div>
          )}
        </div>

        {/* Anomaly flags */}
        <div className="card">
          <div className="section-header">
            <div className="section-title">📈 Spending Alerts</div>
            <Link to="/analytics" className="btn btn-ghost btn-sm">Analytics</Link>
          </div>

          {s?.category_trends?.filter((c) => c.flagged).length > 0 ? (
            <div className="flex flex-col gap-3">
              {s.category_trends.filter((c) => c.flagged).slice(0, 4).map((c) => (
                <div key={c.item_id} className="flex items-center justify-between">
                  <span className="text-sm">{c.name}</span>
                  <span className={`badge ${c.deviation_pct > 0 ? 'badge-danger' : 'badge-success'}`}>
                    {c.deviation_pct > 0 ? '↑' : '↓'} {Math.abs(c.deviation_pct).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted">No spending anomalies this month.</div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card mt-6">
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
                  <th>Date</th>
                  <th>Item</th>
                  <th>Note</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTxns.map((t) => (
                  <tr key={t.id}>
                    <td className="text-muted">{new Date(t.date).toLocaleDateString()}</td>
                    <td>{t.items?.name || '—'}</td>
                    <td className="text-muted">{t.note || '—'}</td>
                    <td><span className={`badge ${t.type === 'income' ? 'badge-success' : 'badge-danger'}`}>{t.type}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: t.type === 'income' ? 'var(--color-success)' : 'var(--color-text)' }}>
                      {t.type === 'income' ? '+' : '-'}{fmt.format(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
