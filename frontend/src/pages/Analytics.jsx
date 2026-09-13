import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import { useAnalytics } from '../hooks/useBudget.js';
import apiClient from '../lib/apiClient.js';
import { useQuery } from '@tanstack/react-query';

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function buildTrendHistory(currentMonth) {
  const months = [];
  const [year, mon] = currentMonth.split('-').map(Number);
  for (let i = 5; i >= 0; i--) {
    let m = mon - i;
    let y = year;
    if (m <= 0) { m += 12; y -= 1; }
    months.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  return months;
}

export default function Analytics() {
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const { summary } = useAnalytics(month);

  // Fetch last 6 months of summaries for trend line
  const trendMonths = buildTrendHistory(month);
  const trendQueries = trendMonths.map((m) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ['analytics', m],
      queryFn: () => apiClient.get(`/analytics/summary?month=${m}`),
      staleTime: 60_000,
    })
  );

  const trendData = trendMonths.map((m, i) => {
    const d = trendQueries[i].data;
    return {
      month: m.slice(5), // MM
      income: d?.total_income || 0,
      expenses: d?.total_expenses || 0,
      savings_rate: d?.savings_rate || 0,
      net: d?.net_savings || 0,
    };
  });

  const s = summary.data;
  const flagged = s?.category_trends?.filter((c) => c.flagged) || [];
  const trends = s?.category_trends || [];

  return (
    <div className="page animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Spending trends, savings rate, and anomaly detection</p>
        </div>
        <input id="analytics-month" type="month" className="input" value={month}
          onChange={(e) => setMonth(e.target.value)} style={{ width: 'auto' }} />
      </div>

      {/* KPI cards */}
      <div className="grid-4 mb-6">
        <div className="card stat-card">
          <div className="stat-label">Income</div>
          <div className="stat-value primary">{s ? fmt.format(s.total_income) : '—'}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Expenses</div>
          <div className="stat-value negative">{s ? fmt.format(s.total_expenses) : '—'}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Net Savings</div>
          <div className={`stat-value ${s && s.net_savings >= 0 ? 'positive' : 'negative'}`}>
            {s ? fmt.format(s.net_savings) : '—'}
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Savings Rate</div>
          <div className={`stat-value ${s && s.savings_rate >= 0 ? 'accent' : 'negative'}`}>
            {s ? `${s.savings_rate}%` : '—'}
          </div>
        </div>
      </div>

      {/* Savings rate trend */}
      <div className="card mb-6">
        <div className="section-title mb-5">📈 Income vs Expenses (6 months)</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trendData} margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="month" tick={{ fill: 'var(--color-text-3)', fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: 'var(--color-text-3)', fontSize: 11 }} />
            <Tooltip
              formatter={(v, name) => [fmt.format(v), name]}
              contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-2)', borderRadius: 12, fontSize: 13 }}
              labelStyle={{ color: 'var(--color-text-2)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-2)' }} />
            <Line type="monotone" dataKey="income" name="Income" stroke="hsl(155,65%,48%)" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="expenses" name="Expenses" stroke="hsl(355,70%,60%)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid-2">
        {/* Savings rate line */}
        <div className="card">
          <div className="section-title mb-5">💰 Savings Rate Trend</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--color-text-3)', fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: 'var(--color-text-3)', fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}%`, 'Savings Rate']}
                contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-2)', borderRadius: 12, fontSize: 13 }}
              />
              <Line type="monotone" dataKey="savings_rate" name="Rate" stroke="hsl(245,70%,65%)" strokeWidth={2.5} dot={{ fill: 'hsl(245,70%,65%)', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category spend vs avg */}
        <div className="card">
          <div className="section-header mb-4">
            <div className="section-title">🔍 Category Trends</div>
            {flagged.length > 0 && (
              <span className="badge badge-danger">⚠️ {flagged.length} anomal{flagged.length > 1 ? 'ies' : 'y'}</span>
            )}
          </div>
          {trends.length === 0 ? (
            <div className="empty-state"><p>No category spend data yet.</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trends.slice(0, 8)} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-3)', fontSize: 10 }}
                  tickFormatter={(v) => v.length > 10 ? v.slice(0, 9) + '…' : v} />
                <YAxis tickFormatter={(v) => `$${v}`} tick={{ fill: 'var(--color-text-3)', fontSize: 10 }} />
                <Tooltip formatter={(v) => [fmt.format(v)]}
                  contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-2)', borderRadius: 12, fontSize: 12 }}
                />
                <Bar dataKey="current_spend" name="This month" radius={[4, 4, 0, 0]}>
                  {trends.slice(0, 8).map((c, i) => (
                    <Cell key={i} fill={c.flagged ? 'hsl(355,70%,60%)' : 'hsl(245,70%,65%)'} fillOpacity={0.85} />
                  ))}
                </Bar>
                <Bar dataKey="trailing_avg" name="3-mo avg" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Anomaly table */}
      {flagged.length > 0 && (
        <div className="card mt-6">
          <div className="section-title mb-4">⚠️ Spending Anomalies (&gt;25% deviation from 3-month avg)</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>This Month</th>
                  <th>3-Month Avg</th>
                  <th>Deviation</th>
                </tr>
              </thead>
              <tbody>
                {flagged.map((c) => (
                  <tr key={c.item_id}>
                    <td className="font-semibold">{c.name}</td>
                    <td>{fmt.format(c.current_spend)}</td>
                    <td className="text-muted">{c.trailing_avg != null ? fmt.format(c.trailing_avg) : '—'}</td>
                    <td>
                      <span className={`badge ${c.deviation_pct > 0 ? 'badge-danger' : 'badge-success'}`}>
                        {c.deviation_pct > 0 ? '↑' : '↓'} {Math.abs(c.deviation_pct).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
