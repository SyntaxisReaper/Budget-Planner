import { useState } from 'react';
import { Plus, DollarSign, TrendingDown, Banknote, Pencil } from 'lucide-react';
import { useDebts } from '../hooks/useBudget.js';
import DebtPayoffChart from '../components/DebtPayoffChart.jsx';
import toast from 'react-hot-toast';
import apiClient from '../lib/apiClient.js';
import { useQuery } from '@tanstack/react-query';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, itemVariants, fadeUp, backdropVariants, modalVariants, hoverCard, tapCard } from '../lib/motion.js';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

function MotionModal({ children, onClose }) {
  return (
    <AnimatePresence>
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
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function AddDebtModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', principal: '', description: '', priority: 'normal' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreate({ name: form.name, principal: parseFloat(form.principal), description: form.description || null, priority: form.priority });
      toast.success('Debt added!');
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <MotionModal onClose={onClose}>
      <h2 className="modal-title">💳 Add Debt</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="form-group">
          <label className="label">Debt Name</label>
          <input id="debt-name" type="text" className="input" placeholder="e.g. Student Loan" required
            value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="label">Amount (₹)</label>
            <input id="debt-principal" type="number" className="input" step="0.01" min="0" placeholder="0.00" required
              value={form.principal} onChange={(e) => set('principal', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Priority</label>
            <select id="debt-priority" className="input" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="label">Description (Optional)</label>
          <textarea id="debt-desc" className="input" placeholder="Notes about this debt..." rows="2"
            value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button id="debt-submit" type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Add Debt'}
          </button>
        </div>
      </form>
    </MotionModal>
  );
}

function EditDebtModal({ debt, onClose, onUpdate }) {
  const [form, setForm] = useState({
    name: debt.name,
    interest_rate: debt.interest_rate ?? '',
    min_payment: debt.min_payment ?? '',
    description: debt.description ?? '',
    priority: debt.priority || 'normal',
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onUpdate({
        id: debt.id,
        name: form.name,
        interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : null,
        min_payment: form.min_payment ? parseFloat(form.min_payment) : null,
        description: form.description || null,
        priority: form.priority,
      });
      toast.success('Debt updated!');
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <MotionModal onClose={onClose}>
      <h2 className="modal-title">✏️ Edit Debt</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="form-group">
          <label className="label">Debt Name</label>
          <input id="edit-debt-name" type="text" className="input" required
            value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="label">Interest Rate (%)</label>
            <input id="edit-debt-rate" type="number" className="input" step="0.01" min="0" placeholder="0.00"
              value={form.interest_rate} onChange={(e) => set('interest_rate', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Min Payment / month (₹)</label>
            <input id="edit-debt-min" type="number" className="input" step="0.01" min="0" placeholder="0.00"
              value={form.min_payment} onChange={(e) => set('min_payment', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="label">Description (Optional)</label>
            <textarea id="edit-debt-desc" className="input" placeholder="Notes about this debt..." rows="1"
              value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Priority</label>
            <select id="edit-debt-priority" className="input" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-muted" style={{ lineHeight: 1.6 }}>
          💡 Leave both fields blank and the budget allocator will distribute payments evenly.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button id="edit-debt-submit" type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Save Changes'}
          </button>
        </div>
      </form>
    </MotionModal>
  );
}

function LogPaymentModal({ debt, onClose, onLog }) {
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0] });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onLog({ id: debt.id, amount: parseFloat(form.amount), date: form.date });
      toast.success('Payment logged!');
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <MotionModal onClose={onClose}>
      <h2 className="modal-title">💰 Log Payment — {debt.name}</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="form-row">
          <div className="form-group">
            <label className="label">Amount (₹)</label>
            <input id="pay-amount" type="number" className="input" step="0.01" min="0" placeholder="0.00" required
              value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} autoFocus />
          </div>
          <div className="form-group">
            <label className="label">Date</label>
            <input id="pay-date" type="date" className="input" required
              value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button id="pay-submit" type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Log Payment'}
          </button>
        </div>
      </form>
    </MotionModal>
  );
}

export default function Debts() {
  const { query, create, update, remove, logPayment } = useDebts();
  const [showAdd, setShowAdd] = useState(false);
  const [payDebt, setPayDebt] = useState(null);
  const [editDebt, setEditDebt] = useState(null);
  const [parent] = useAutoAnimate();

  const projectionQuery = useQuery({
    queryKey: ['analytics', 'debt-projection'],
    queryFn: () => apiClient.get('/analytics/debt-projection'),
  });

  const debts = query.data || [];
  const projections = projectionQuery.data || [];
  const active = debts.filter((d) => d.status === 'active');
  const paidOff = debts.filter((d) => d.status === 'paid_off');
  const totalRemaining = active.reduce((s, d) => s + Number(d.remaining_balance), 0);

  const chartData = projections.map((p) => ({
    ...p,
    remaining_balance: active.find((d) => d.id === p.id)?.remaining_balance || p.remaining_balance,
  }));

  async function handleDelete(id) {
    if (!confirm('Delete this debt?')) return;
    try { await remove.mutateAsync(id); toast.success('Debt deleted'); }
    catch (err) { toast.error(err.message); }
  }

  return (
    <div className="page">
      <motion.div className="page-header flex items-center justify-between" variants={fadeUp} initial="hidden" animate="visible">
        <div>
          <h1 className="page-title">Debts</h1>
          <p className="page-subtitle">Track and pay down your debts with equal distribution</p>
        </div>
        <motion.button
          id="add-debt-btn" className="btn btn-primary"
          onClick={() => setShowAdd(true)}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
        >
          <Plus size={16} /> Add Debt
        </motion.button>
      </motion.div>

      {/* Summary */}
      <motion.div className="grid-3 mb-6" variants={staggerContainer} initial="hidden" animate="visible">
        {[
          { icon: <Banknote size={18} color="var(--color-danger)" />, bg: 'rgba(239,68,68,0.1)', label: 'Total Remaining', value: fmt.format(totalRemaining), cls: 'negative' },
          { icon: <DollarSign size={18} color="var(--color-text)" />, bg: 'rgba(237,237,237,0.08)', label: 'Active Debts', value: active.length, cls: 'primary' },
          { icon: <TrendingDown size={18} color="var(--color-success)" />, bg: 'rgba(52,211,153,0.1)', label: 'Paid Off', value: paidOff.length, cls: 'positive' },
        ].map(({ icon, bg, label, value, cls }) => (
          <motion.div key={label} className="card stat-card" variants={itemVariants} whileHover={{ y: -3, transition: { duration: 0.18 } }}>
            <div className="stat-icon" style={{ background: bg }}>{icon}</div>
            <div className="stat-label">{label}</div>
            <div className={`stat-value ${cls}`}>{value}</div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid-2">
        {/* Debt cards */}
        <div ref={parent} className="flex flex-col gap-4">
          {active.length === 0 && (
            <motion.div className="card empty-state" variants={itemVariants} initial="hidden" animate="visible">
              <p>No active debts. Great job or add one above!</p>
            </motion.div>
          )}
          {active.map((debt, i) => {
            const proj = projections.find((p) => p.id === debt.id);
            const pct = 1 - (Number(debt.remaining_balance) / Number(debt.principal));
            return (
              <motion.div
                key={debt.id} className="card"
                variants={itemVariants}
                initial="hidden" animate="visible"
                transition={{ delay: i * 0.07 }}
                whileHover={hoverCard} whileTap={tapCard}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-bold" style={{ fontSize: 'var(--text-md)' }}>{debt.name}</div>
                      {debt.priority === 'high' && <span className="badge badge-negative" style={{ fontSize: '0.65rem' }}>High Priority</span>}
                      {debt.priority === 'low' && <span className="badge" style={{ fontSize: '0.65rem', opacity: 0.7 }}>Low</span>}
                    </div>
                    <div className="text-xs text-muted mt-1">
                      {debt.interest_rate ? `${debt.interest_rate}% APR` : 'No interest'}
                      {debt.min_payment ? ` · Min ${fmt.format(debt.min_payment)}/mo` : ''}
                    </div>
                    {debt.description && <div className="text-xs text-muted mt-1" style={{ fontStyle: 'italic' }}>{debt.description}</div>}
                  </div>
                  <div className="flex gap-2">
                    <motion.button id={`pay-btn-${debt.id}`} className="btn btn-accent btn-sm" onClick={() => setPayDebt(debt)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <DollarSign size={13} /> Pay
                    </motion.button>
                    <motion.button id={`edit-btn-${debt.id}`} className="btn btn-ghost btn-sm" onClick={() => setEditDebt(debt)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Pencil size={13} /> Edit
                    </motion.button>
                    <motion.button id={`del-debt-${debt.id}`} className="btn btn-danger btn-sm" onClick={() => handleDelete(debt.id)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      Delete
                    </motion.button>
                  </div>
                </div>

                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted">Remaining</span>
                  <span className="font-bold text-danger">{fmt.format(debt.remaining_balance)}</span>
                </div>
                <div className="progress-bar mb-3">
                  <motion.div
                    className="progress-fill accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>{Math.round(pct * 100)}% paid off</span>
                  {proj?.months_to_payoff ? <span>~{proj.months_to_payoff} months to go</span> : null}
                </div>
              </motion.div>
            );
          })}

          {paidOff.length > 0 && (
            <motion.div className="card" variants={itemVariants} initial="hidden" animate="visible"
              style={{ borderColor: 'rgba(52,211,153,0.2)', background: 'rgba(52,211,153,0.03)' }}>
              <div className="section-title text-sm mb-3" style={{ color: 'var(--color-success)' }}>✓ Paid Off</div>
              {paidOff.map((d) => (
                <div key={d.id} className="flex justify-between text-sm py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <span>{d.name}</span>
                  <span className="text-success">Paid off 🎉</span>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Payoff chart */}
        <motion.div className="card" variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.25 }}>
          <div className="section-title mb-5">Payoff Timeline</div>
          <DebtPayoffChart debts={chartData} />
          {projections.length > 0 && (
            <div className="mt-5 flex flex-col gap-2">
              {projections.map((p) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className="text-muted">{p.name}</span>
                  <span className="font-semibold">
                    {p.months_to_payoff ? `${p.months_to_payoff} months · ${p.payoff_date}` : 'No projection'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {showAdd && <AddDebtModal onClose={() => setShowAdd(false)} onCreate={create.mutateAsync} />}
        {payDebt && <LogPaymentModal debt={payDebt} onClose={() => setPayDebt(null)} onLog={logPayment.mutateAsync} />}
        {editDebt && <EditDebtModal debt={editDebt} onClose={() => setEditDebt(null)} onUpdate={update.mutateAsync} />}
      </AnimatePresence>
    </div>
  );
}
