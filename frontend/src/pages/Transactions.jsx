import { useState } from 'react';
import { Plus, Filter } from 'lucide-react';
import { useTransactions, useItems } from '../hooks/useBudget.js';
import toast from 'react-hot-toast';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, itemVariants, fadeUp, backdropVariants, modalVariants } from '../lib/motion.js';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

function AddTransactionModal({ items, onClose, onCreate }) {
  const [form, setForm] = useState({
    item_id: '', amount: '', type: 'expense',
    date: new Date().toISOString().split('T')[0], note: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreate({ ...form, amount: parseFloat(form.amount), item_id: form.item_id || undefined });
      toast.success('Transaction logged!');
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="modal-overlay"
      variants={backdropVariants} initial="hidden" animate="visible" exit="exit"
      onClick={onClose}
    >
      <motion.div
        className="modal"
        variants={modalVariants} initial="hidden" animate="visible" exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">➕ Log Transaction</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-row">
            <div className="form-group">
              <label className="label">Type</label>
              <select id="txn-type" className="select" value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Amount (?)</label>
              <input id="txn-amount" type="number" className="input" step="0.01" min="0" placeholder="0.00" required
                value={form.amount} onChange={(e) => set('amount', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Item (optional)</label>
            <select id="txn-item" className="select" value={form.item_id} onChange={(e) => set('item_id', e.target.value)}>
              <option value="">— none —</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Date</label>
            <input id="txn-date" type="date" className="input" required value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="label">Note</label>
            <input id="txn-note" type="text" className="input" placeholder="Optional note…" value={form.note} onChange={(e) => set('note', e.target.value)} />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button id="txn-submit" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Log Transaction'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function Transactions() {
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [showModal, setShowModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [parent] = useAutoAnimate();

  const { query, create } = useTransactions(month);
  const { query: itemsQuery } = useItems();

  const transactions = query.data || [];
  const items = itemsQuery.data || [];

  const filtered = transactions.filter((t) => typeFilter === 'all' || t.type === typeFilter);
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="page">
      <motion.div className="page-header flex items-center justify-between" variants={fadeUp} initial="hidden" animate="visible">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">Log and track your income &amp; expenses</p>
        </div>
        <motion.button id="add-txn-btn" className="btn btn-primary" onClick={() => setShowModal(true)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
          <Plus size={16} /> Log Transaction
        </motion.button>
      </motion.div>

      {/* Summary row */}
      <motion.div className="grid-3 mb-6" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div className="card stat-card" variants={itemVariants} whileHover={{ y: -3, transition: { duration: 0.18 } }}>
          <div className="stat-label">Income</div>
          <div className="stat-value positive">{fmt.format(totalIncome)}</div>
        </motion.div>
        <motion.div className="card stat-card" variants={itemVariants} whileHover={{ y: -3, transition: { duration: 0.18 } }}>
          <div className="stat-label">Expenses</div>
          <div className="stat-value negative">{fmt.format(totalExpenses)}</div>
        </motion.div>
        <motion.div className="card stat-card" variants={itemVariants} whileHover={{ y: -3, transition: { duration: 0.18 } }}>
          <div className="stat-label">Net</div>
          <div className={`stat-value ${totalIncome - totalExpenses >= 0 ? 'positive' : 'negative'}`}>
            {fmt.format(totalIncome - totalExpenses)}
          </div>
        </motion.div>
      </motion.div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-4 mb-5" style={{ flexWrap: 'wrap' }}>
          <div className="flex items-center gap-2">
            <Filter size={14} color="var(--color-text-3)" />
            <span className="text-sm text-muted">Filters:</span>
          </div>
          <input id="txn-month-filter" type="month" className="input" style={{ width: 'auto' }}
            value={month} onChange={(e) => setMonth(e.target.value)} />
          <select id="txn-type-filter" className="select" style={{ width: 'auto' }}
            value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All types</option>
            <option value="income">Income only</option>
            <option value="expense">Expenses only</option>
          </select>
        </div>

        {query.isLoading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>No transactions found. Log one to get started.</p>
          </div>
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
              <tbody ref={parent}>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>{new Date(t.date).toLocaleDateString()}</td>
                    <td>{t.items?.name || <span className="text-muted">—</span>}</td>
                    <td className="text-muted">{t.note || '—'}</td>
                    <td>
                      <span className={`badge ${t.type === 'income' ? 'badge-success' : 'badge-danger'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: t.type === 'income' ? 'var(--color-success)' : 'var(--color-text)', whiteSpace: 'nowrap' }}>
                      {t.type === 'income' ? '+' : '-'}{fmt.format(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <AddTransactionModal items={items} onClose={() => setShowModal(false)} onCreate={create.mutateAsync} />
        )}
      </AnimatePresence>
    </div>
  );
}
