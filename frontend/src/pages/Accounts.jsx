import { useState } from 'react';
import { Plus, Pencil, Trash2, Wallet, Landmark } from 'lucide-react';
import { useAccounts } from '../hooks/useBudget.js';
import toast from 'react-hot-toast';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUp, backdropVariants, modalVariants } from '../lib/motion.js';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

function AccountModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || {
    name: '', type: 'bank', last4: ''
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
      toast.success(initial ? 'Account updated!' : 'Account added!');
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
        <h2 className="modal-title">{initial ? '✏️ Edit Account' : '➕ Add Account'}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="label">Account Name</label>
            <input type="text" className="input" placeholder="e.g. HDFC Savings" required
              value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Type</label>
              <select className="select" value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            
            {form.type === 'bank' && (
              <div className="form-group">
                <label className="label">Last 4 Digits (Optional)</label>
                <input type="text" className="input" placeholder="e.g. 1234" maxLength="4" pattern="\d*"
                  value={form.last4 || ''} onChange={(e) => set('last4', e.target.value)} />
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : (initial ? 'Save Changes' : 'Add Account')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function Accounts() {
  const { query, create, update, remove } = useAccounts();
  const [modal, setModal] = useState(null); // null | 'add' | account object
  const [parent] = useAutoAnimate();

  const accounts = query.data || [];
  const activeAccounts = accounts.filter(a => a.is_active);
  const totalBalance = activeAccounts.reduce((sum, a) => sum + Number(a.current_balance), 0);

  async function handleDelete(id) {
    if (!confirm('Delete this account? (If it has transactions, it will be marked as inactive)')) return;
    try {
      const res = await remove.mutateAsync(id);
      if (res?.data?.message) {
        toast.success(res.data.message);
      } else {
        toast.success('Account removed');
      }
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleSave(form) {
    if (modal === 'add') {
      await create.mutateAsync(form);
    } else {
      await update.mutateAsync({ id: modal.id, ...form });
    }
  }

  return (
    <div className="page">
      <motion.div className="page-header flex items-center justify-between" variants={fadeUp} initial="hidden" animate="visible">
        <div>
          <h1 className="page-title">Accounts</h1>
          <p className="page-subtitle">Manage your bank and cash accounts · Total Balance: {fmt.format(totalBalance)}</p>
        </div>
        <motion.button className="btn btn-primary" onClick={() => setModal('add')} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
          <Plus size={16} /> Add Account
        </motion.button>
      </motion.div>

      <div className="grid-auto" ref={parent}>
        {activeAccounts.length === 0 ? (
          <div className="col-span-full text-center text-muted py-8">
            <p>No accounts yet. Add a bank or cash account to get started!</p>
          </div>
        ) : (
          activeAccounts.map((acc) => (
            <motion.div key={acc.id} className="card" variants={fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div style={{ padding: 10, background: 'var(--color-surface-2)', borderRadius: 'var(--radius)', color: 'var(--color-primary)' }}>
                    {acc.type === 'bank' ? <Landmark size={20} /> : <Wallet size={20} />}
                  </div>
                  <div>
                    <h3 className="font-semibold">{acc.name}</h3>
                    <div className="text-xs text-muted">
                      {acc.type === 'bank' ? `Bank Account${acc.last4 ? ` (***${acc.last4})` : ''}` : 'Cash Wallet'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setModal(acc)}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn btn-icon btn-danger btn-sm" onClick={() => handleDelete(acc.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              <div style={{ padding: 'var(--space-4)', background: 'var(--color-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
                <div className="text-xs text-muted mb-1">Current Balance</div>
                <div className="font-bold text-xl" style={{ color: acc.current_balance < 0 ? 'var(--color-danger)' : 'var(--color-text)' }}>
                  {fmt.format(acc.current_balance)}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {modal && (
          <AccountModal
            initial={modal === 'add' ? null : modal}
            onClose={() => setModal(null)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
