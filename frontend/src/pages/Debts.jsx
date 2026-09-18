import { useState } from 'react';
import { Plus, DollarSign, Banknote, Pencil, Trash, CreditCard, Home } from 'lucide-react';
import { useDebts, useAccounts, useTransactions } from '../hooks/useBudget.js';
import toast from '../lib/haptics.js';
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
  const [form, setForm] = useState({ 
    name: '', principal: '', kind: 'debt', debt_date: new Date().toISOString().split('T')[0], description: '', priority: 'normal' 
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreate({ 
        name: form.name, 
        principal: parseFloat(form.principal), 
        kind: form.kind,
        debt_date: form.debt_date,
        description: form.description || null, 
        priority: form.priority 
      });
      toast.success(form.kind === 'rent' ? 'Rent added!' : 'Debt added!');
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <MotionModal onClose={onClose}>
      <h2 className="modal-title">💳 Add Debt / Rent</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="form-group">
          <label className="label">Name</label>
          <input type="text" className="input" placeholder="e.g. Student Loan or May Rent" required
            value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label className="label">Type</label>
            <select className="input" value={form.kind} onChange={(e) => set('kind', e.target.value)}>
              <option value="debt">Debt</option>
              <option value="rent">Rent</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Incurred Date</label>
            <input type="date" className="input" required
              value={form.debt_date} onChange={(e) => set('debt_date', e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Amount (₹)</label>
            <input type="number" inputMode="decimal" className="input" step="0.01" min="0" placeholder="0.00" required
              value={form.principal} onChange={(e) => set('principal', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        
        <div className="form-group">
          <label className="label">Description (Optional)</label>
          <textarea className="input" placeholder="Notes..." rows="2"
            value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Add'}
          </button>
        </div>
      </form>
    </MotionModal>
  );
}

function EditDebtModal({ debt, onClose, onUpdate }) {
  const [form, setForm] = useState({
    name: debt.name,
    kind: debt.kind || 'debt',
    debt_date: debt.debt_date || new Date().toISOString().split('T')[0],
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
        kind: form.kind,
        debt_date: form.debt_date,
        description: form.description || null,
        priority: form.priority,
      });
      toast.success('Updated successfully!');
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <MotionModal onClose={onClose}>
      <h2 className="modal-title">✏️ Edit {debt.kind === 'rent' ? 'Rent' : 'Debt'}</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="form-group">
          <label className="label">Name</label>
          <input type="text" className="input" required
            value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label className="label">Type</label>
            <select className="input" value={form.kind} onChange={(e) => set('kind', e.target.value)}>
              <option value="debt">Debt</option>
              <option value="rent">Rent</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Incurred Date</label>
            <input type="date" className="input" required
              value={form.debt_date} onChange={(e) => set('debt_date', e.target.value)} />
          </div>
        </div>
        

        <div className="form-row">
          <div className="form-group">
            <label className="label">Description (Optional)</label>
            <textarea className="input" placeholder="Notes..." rows="1"
              value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Save Changes'}
          </button>
        </div>
      </form>
    </MotionModal>
  );
}

function LogPaymentModal({ debt, accounts, onClose, onLog }) {
  const [form, setForm] = useState({ 
    account_id: accounts.length > 0 ? accounts[0].id : '',
    amount: '', 
    date: new Date().toISOString().slice(0, 16),
    utr_id: '',
    note: ''
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.account_id) return toast.error('Please select an account');

    setLoading(true);
    try {
      await onLog({ 
        type: 'debt_payment',
        debt_id: debt.id, 
        account_id: form.account_id,
        amount: parseFloat(form.amount), 
        occurred_at: new Date(form.date).toISOString(),
        utr_id: form.utr_id || undefined,
        note: form.note || undefined
      });
      toast.success('Payment logged!');
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <MotionModal onClose={onClose}>
      <h2 className="modal-title">💰 Log Payment — {debt.name}</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="form-group">
          <label className="label">Pay From Account</label>
          <select className="select" value={form.account_id} onChange={(e) => setForm(p => ({ ...p, account_id: e.target.value }))} required>
            <option value="">— select account —</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmt.format(a.current_balance)})</option>)}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Amount (₹)</label>
            <input type="number" inputMode="decimal" className="input" step="0.01" min="0" placeholder="0.00" required
              value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} autoFocus />
          </div>
          <div className="form-group">
            <label className="label">Date & Time</label>
            <input type="datetime-local" className="input" required
              value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">UTR / Ref (optional)</label>
            <input type="text" className="input" placeholder="e.g. UPI Ref" 
              value={form.utr_id} onChange={(e) => setForm((p) => ({ ...p, utr_id: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">Note (optional)</label>
            <input type="text" className="input" placeholder="Optional note..." 
              value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Submit Payment'}
          </button>
        </div>
      </form>
    </MotionModal>
  );
}

export default function Debts() {
  const { query, create, update, remove } = useDebts();
  const { query: accountsQuery } = useAccounts();
  const { create: createTxn } = useTransactions({});
  
  const [showAdd, setShowAdd] = useState(false);
  const [payDebt, setPayDebt] = useState(null);
  const [editDebt, setEditDebt] = useState(null);
  const [parent] = useAutoAnimate();

  const debts = query.data || [];
  const accounts = accountsQuery.data?.filter(a => a.is_active) || [];
  const active = debts.filter((d) => d.status === 'active');
  const paidOff = debts.filter((d) => d.status === 'paid_off');
  const totalRemaining = active.reduce((s, d) => s + Number(d.remaining_balance), 0);

  async function handleDelete(id) {
    if (!confirm('Delete this? It will NOT reverse any transactions already made.')) return;
    try { await remove.mutateAsync(id); toast.success('Deleted'); }
    catch (err) { toast.error(err.message); }
  }

  return (
    <div className="page">
      <motion.div className="page-header flex items-center justify-between" variants={fadeUp} initial="hidden" animate="visible">
        <div>
          <h1 className="page-title">Debts & Rent</h1>
          <p className="page-subtitle">Track and pay down your liabilities</p>
        </div>
        <motion.button
          className="btn btn-primary"
          onClick={() => setShowAdd(true)}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
        >
          <Plus size={16} /> Add New
        </motion.button>
      </motion.div>

      {/* Summary */}
      <motion.div className="grid-3 mb-6" variants={staggerContainer} initial="hidden" animate="visible">
        {[
          { icon: <Banknote size={18} color="var(--color-danger)" />, bg: 'rgba(239,68,68,0.1)', label: 'Total Remaining', value: fmt.format(totalRemaining), cls: 'negative' },
          { icon: <Banknote size={18} color="var(--color-text)" />, bg: 'var(--color-surface-2)', label: 'Active Items', value: active.length, cls: 'primary' },
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
              <p>No active debts or rent due. Great job or add one above!</p>
            </motion.div>
          )}
          {active.map((debt, i) => {
            const pct = 1 - (Number(debt.remaining_balance) / Number(debt.principal));
            return (
              <motion.div
                key={debt.id} className="card"
                variants={itemVariants}
                initial="hidden" animate="visible"
                transition={{ delay: i * 0.07 }}
                whileHover={hoverCard} whileTap={tapCard}
              >
                <div className="flex items-start justify-between mb-4 gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="stat-icon shrink-0" style={{ background: debt.priority === 'high' ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)', marginBottom: 0, height: 48, width: 48 }}>
                      {debt.kind === 'rent' ? <Home size={20} color={debt.priority === 'high' ? 'var(--color-danger)' : '#6366f1'} /> : <CreditCard size={20} color={debt.priority === 'high' ? 'var(--color-danger)' : '#6366f1'} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold break-words whitespace-normal max-w-full leading-tight">{debt.name}</span>
                        {debt.priority === 'high' && <span className="badge badge-negative shrink-0">High</span>}
                      </div>
                      <div className="text-xs text-muted mt-1">
                        {debt.debt_date ? `Incurred: ${new Date(debt.debt_date).toLocaleDateString()}` : ''}
                      </div>
                      {debt.description && <div className="text-xs text-muted mt-1" style={{ fontStyle: 'italic', wordBreak: 'break-word' }}>{debt.description}</div>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex gap-2">
                      <button className="btn btn-accent btn-sm" onClick={() => setPayDebt(debt)} title="Pay">
                        <DollarSign size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditDebt(debt)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(debt.id)} title="Delete">
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted">Remaining {fmt.format(debt.remaining_balance)}</span>
                  <span className="text-muted text-xs">{(pct * 100).toFixed(0)}%</span>
                </div>
                <div style={{ padding: '0 16px', position: 'relative', height: '48px', background: 'var(--color-surface-2)', borderRadius: '24px', border: '1px dashed var(--color-border)', display: 'flex', alignItems: 'center' }} className="mb-3">
                  <div style={{ position: 'absolute', right: '16px', fontSize: '20px', opacity: 0.5, zIndex: 1 }}>🏁</div>
                  
                  <div style={{ position: 'relative', flex: 1, height: '100%', display: 'flex', alignItems: 'center' }}>
                    <motion.div
                      initial={{ left: '0%' }}
                      animate={{ left: `${pct * 100}%` }}
                      transition={{ type: 'spring', stiffness: 40, damping: 12, delay: i * 0.1 }}
                      style={{ position: 'absolute', marginLeft: '-16px', zIndex: 10 }}
                    >
                      <div style={{ width: '32px', height: '32px', background: 'var(--color-surface)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: '16px' }}>
                        🏎️
                      </div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: `${pct * 100}%` }}
                      transition={{ type: 'spring', stiffness: 40, damping: 12, delay: i * 0.1 }}
                      style={{ height: '6px', background: 'var(--color-primary)', borderRadius: '3px', opacity: 0.3 }}
                    />
                  </div>
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

        {/* Removed Payoff chart since Phase 8 removed projection calculations */}
        <motion.div className="card" variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.25 }}>
          <div className="section-title mb-5">About Unified Ledger</div>
          <p className="text-sm text-muted" style={{ lineHeight: 1.6 }}>
            Payments made here are standard transactions. They instantly deduct from the chosen Account and reduce the remaining balance of this Debt/Rent via the Postgres trigger.
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {showAdd && <AddDebtModal onClose={() => setShowAdd(false)} onCreate={create.mutateAsync} />}
        {payDebt && <LogPaymentModal debt={payDebt} accounts={accounts} onClose={() => setPayDebt(null)} onLog={createTxn.mutateAsync} />}
        {editDebt && <EditDebtModal debt={editDebt} onClose={() => setEditDebt(null)} onUpdate={update.mutateAsync} />}
      </AnimatePresence>
    </div>
  );
}
