import { useState } from 'react';
import { Plus, Repeat, CreditCard, Pencil, Trash } from 'lucide-react';
import { useSubscriptions, useAccounts } from '../hooks/useBudget.js';
import toast from '../lib/haptics.js';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, itemVariants, fadeUp, backdropVariants, modalVariants, hoverCard, tapCard } from '../lib/motion.js';
import { parseISO, format } from 'date-fns';

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

function SubscriptionModal({ sub, accounts, onClose, onSave }) {
  const [form, setForm] = useState({
    name: sub?.name || '',
    amount: sub?.amount || '',
    account_id: sub?.account_id || (accounts.length > 0 ? accounts[0].id : ''),
    interval: sub?.interval || 'monthly',
    next_date: sub?.next_date || new Date().toISOString().split('T')[0],
    status: sub?.status || 'active'
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (!form.account_id) throw new Error("Please select an account");
      const payload = {
        name: form.name,
        amount: parseFloat(form.amount),
        account_id: form.account_id,
        interval: form.interval,
        next_date: form.next_date,
        status: form.status
      };
      if (sub) {
        await onSave({ id: sub.id, ...payload });
        toast.success('Subscription updated!');
      } else {
        await onSave(payload);
        toast.success('Subscription added!');
      }
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <MotionModal onClose={onClose}>
      <h2 className="modal-title">🔄 {sub ? 'Edit Subscription' : 'New Subscription'}</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="form-group">
          <label className="label">Name (e.g. Netflix, Rent)</label>
          <input type="text" className="input" required
            value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label className="label">Amount (₹)</label>
            <input type="number" inputMode="decimal" className="input" step="0.01" min="0" required
              value={form.amount} onChange={(e) => set('amount', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Pay From Account</label>
            <select className="select" value={form.account_id} onChange={(e) => set('account_id', e.target.value)} required>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Billing Interval</label>
            <select className="select" value={form.interval} onChange={(e) => set('interval', e.target.value)}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Next Due Date</label>
            <input type="date" className="input" required
              value={form.next_date} onChange={(e) => set('next_date', e.target.value)} />
          </div>
        </div>
        
        {sub && (
          <div className="form-group">
            <label className="label">Status</label>
            <select className="select" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </div>
        )}
        
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : (sub ? 'Save Changes' : 'Add')}
          </button>
        </div>
      </form>
    </MotionModal>
  );
}

export default function Subscriptions() {
  const { query, create, update, remove, processAll } = useSubscriptions();
  const { query: accountsQuery } = useAccounts();
  
  const [showAdd, setShowAdd] = useState(false);
  const [editSub, setEditSub] = useState(null);
  const [parent] = useAutoAnimate();
  const [isProcessing, setIsProcessing] = useState(false);

  const subs = query.data || [];
  const accounts = accountsQuery.data?.filter(a => a.is_active) || [];
  const active = subs.filter(s => s.status === 'active');
  
  // Calculate approx monthly cost
  const monthlyCost = active.reduce((acc, sub) => {
    let amt = Number(sub.amount);
    if (sub.interval === 'weekly') amt *= 4.33;
    if (sub.interval === 'yearly') amt /= 12;
    return acc + amt;
  }, 0);

  async function handleDelete(id) {
    if (!confirm('Stop tracking this subscription? This will not delete past transactions.')) return;
    try { await remove.mutateAsync(id); toast.success('Deleted'); }
    catch (err) { toast.error(err.message); }
  }

  async function handleForceProcess() {
    setIsProcessing(true);
    try {
      const res = await processAll.mutateAsync();
      toast.success(res.data?.message || 'Processing complete');
    } catch (err) {
      toast.error('Failed to process subscriptions');
    }
    setIsProcessing(false);
  }

  return (
    <div className="page">
      <motion.div className="page-header flex items-center justify-between" variants={fadeUp} initial="hidden" animate="visible" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <p className="page-subtitle">Manage recurring payments and automatic tracking</p>
        </div>
        <div className="flex gap-2">
          <motion.button className="btn btn-ghost" onClick={handleForceProcess} disabled={isProcessing} whileHover={{ scale: 1.04 }} whileTap={tapFeedback} onTapStart={impactLight}>
            {isProcessing ? <span className="spinner" /> : <><Repeat size={16} /> Process Overdue</>}
          </motion.button>
          <motion.button className="btn btn-primary" onClick={() => setShowAdd(true)} whileHover={{ scale: 1.04 }} whileTap={tapFeedback} onTapStart={impactLight}>
            <Plus size={16} /> Add Sub
          </motion.button>
        </div>
      </motion.div>

      <motion.div className="grid-2 mb-6" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div className="card stat-card" variants={itemVariants}>
          <div className="stat-label">Active Subs</div>
          <div className="stat-value">{active.length}</div>
        </motion.div>
        <motion.div className="card stat-card" variants={itemVariants}>
          <div className="stat-label">Est. Monthly Cost</div>
          <div className="stat-value negative">{fmt.format(monthlyCost)}</div>
        </motion.div>
      </motion.div>

      <div className="card flex flex-col gap-4" ref={parent}>
        {subs.length === 0 && (
          <div className="empty-state">
            <p>No subscriptions found. Add Netflix, Spotify, or Rent!</p>
          </div>
        )}
        {subs.map(sub => (
          <motion.div key={sub.id} className="flex items-center justify-between p-4" 
            style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: sub.status === 'paused' ? 'var(--color-surface-2)' : 'var(--color-bg)' }}
            whileHover={hoverCard}
          >
            <div className="flex items-center gap-4">
              <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)', marginBottom: 0, height: 48, width: 48 }}>
                <Repeat size={20} color="#6366f1" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{sub.name}</span>
                  {sub.status === 'paused' && <span className="badge badge-optional">PAUSED</span>}
                </div>
                <div className="text-xs text-muted mt-1">
                  Next: {format(parseISO(sub.next_date), 'MMM do, yyyy')} • {sub.interval}
                </div>
                <div className="text-xs text-muted mt-1 flex items-center gap-1">
                  <CreditCard size={12} /> {sub.accounts?.name}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="font-bold text-md text-danger">{fmt.format(sub.amount)}</span>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm" onClick={() => setEditSub(sub)}><Pencil size={14} /></button>
                <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(sub.id)}><Trash size={14} /></button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showAdd && <SubscriptionModal accounts={accounts} onClose={() => setShowAdd(false)} onSave={create.mutateAsync} />}
        {editSub && <SubscriptionModal sub={editSub} accounts={accounts} onClose={() => setEditSub(null)} onSave={update.mutateAsync} />}
      </AnimatePresence>
    </div>
  );
}
