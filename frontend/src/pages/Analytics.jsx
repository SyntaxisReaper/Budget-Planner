import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import { useAnalytics, useDashboard } from '../hooks/useBudget.js';
import { motion } from 'framer-motion';
import { staggerContainer, itemVariants, fadeUp } from '../lib/motion.js';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export default function Analytics() {
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [downloading, setDownloading] = useState(false);
  const { summary } = useDashboard(month);
  const { trends: trendsQuery } = useAnalytics(month);

  const s = summary.data;
  const t = trendsQuery.data;
  const flagged = t?.category_trends?.filter((c) => c.flagged) || [];
  const trends = t?.category_trends || [];
  
  const historyData = (t?.history || []).map(h => {
    const net = h.income - h.expense;
    const rate = h.income > 0 ? (net / h.income) * 100 : 0;
    return {
      ...h,
      net,
      savings_rate: Math.round(rate * 10) / 10
    };
  });

  async function handleDownloadPDF() {
    const el = document.getElementById('analytics-content');
    if (!el) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#13141c' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Budget_Report_${month}.pdf`);
      toast.success('Report downloaded!');
    } catch (err) {
      toast.error('Failed to generate PDF');
      console.error(err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="page" id="analytics-content">
      <motion.div className="page-header flex items-center justify-between" variants={fadeUp} initial="hidden" animate="visible">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Spending trends, savings rate, and anomaly detection</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="month" className="input" value={month}
            onChange={(e) => setMonth(e.target.value)} style={{ width: 'auto' }} />
          <button className="btn btn-secondary" onClick={handleDownloadPDF} disabled={downloading}>
            {downloading ? <span className="spinner" /> : '📄 PDF Report'}
          </button>
        </div>
      </motion.div>

      {/* KPI cards */}
      <motion.div className="grid-4 mb-6" variants={staggerContainer} initial="hidden" animate="visible">
        {[
          { label: 'Income',       value: s ? fmt.format(s.cycle_income)  : '—', cls: 'primary'  },
          { label: 'Expenses',     value: s ? fmt.format(s.cycle_expense) : '—', cls: 'negative' },
          { label: 'Net Savings',  value: s ? fmt.format(s.net_savings)   : '—', cls: s && s.net_savings >= 0 ? 'positive' : 'negative' },
          { label: 'Savings Rate', value: s ? `${s.savings_rate}%`        : '—', cls: s && s.savings_rate >= 0 ? 'accent' : 'negative' },
        ].map(({ label, value, cls }) => (
          <motion.div key={label} className="card stat-card" variants={itemVariants} whileHover={{ y: -3, transition: { duration: 0.18 } }}>
            <div className="stat-label">{label}</div>
            <div className={`stat-value ${cls}`}>{value}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Savings rate trend */}
      <div className="card mb-6">
        <div className="section-title mb-5">📈 Income vs Expenses (6 months)</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={historyData} margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--color-text-3)', fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fill: 'var(--color-text-3)', fontSize: 11 }} />
            <Tooltip
              formatter={(v, name) => [fmt.format(v), name]}
              contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-2)', borderRadius: 12, fontSize: 13 }}
              labelStyle={{ color: 'var(--color-text-2)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-2)' }} />
            <Line type="monotone" dataKey="income" name="Income" stroke="hsl(155,65%,48%)" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="expense" name="Expenses" stroke="hsl(355,70%,60%)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid-2">
        {/* Savings rate line */}
        <div className="card">
          <div className="section-title mb-5">💰 Savings Rate Trend</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--color-text-3)', fontSize: 11 }} />
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
                <YAxis tickFormatter={(v) => `₹${v}`} tick={{ fill: 'var(--color-text-3)', fontSize: 10 }} />
                <Tooltip formatter={(v) => [fmt.format(v)]}
                  contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-2)', borderRadius: 12, fontSize: 12 }}
                />
                <Bar dataKey="current_spend" name="This cycle" radius={[4, 4, 0, 0]}>
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
                  <th>This Cycle</th>
                  <th>3-Cycle Avg</th>
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
