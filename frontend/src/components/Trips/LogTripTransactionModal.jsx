import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useTripTransactions } from '../../hooks/useTrips.js';
import { useAccounts } from '../../hooks/useBudget.js';
import toast from '../../lib/haptics.js';
import { motion } from 'framer-motion';
import { backdropVariants, modalVariants } from '../../lib/motion.js';

export default function LogTripTransactionModal({ trip, onClose }) {
  const { data: accounts } = useAccounts();
  const { createTxMutation } = useTripTransactions(trip.id);

  const [formData, setFormData] = useState({
    paid_by_participant_id: trip.participants?.[0]?.id || '',
    amount: '',
    description: '',
    account_id: ''
  });

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createTxMutation.mutateAsync({
        ...formData,
        amount: Number(formData.amount),
        account_id: formData.account_id || null
      });
      toast.success('Transaction logged');
      onClose();
    } catch (error) {
      toast.error('Failed to log transaction');
    }
  };

  return (
    <motion.div className="modal-overlay" variants={backdropVariants} initial="hidden" animate="visible" exit="exit" onClick={onClose}>
      <motion.div className="modal" variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={e => e.stopPropagation()}
        drag={window.innerWidth <= 768 ? "y" : false} dragConstraints={{ top: 0, bottom: 0 }} onDragEnd={(e, info) => { if (info.offset.y > 100) onClose(); }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>Log Expense</h2>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--color-text-2)' }}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="label">Description</label>
            <input required type="text" className="input" name="description" value={formData.description} onChange={handleChange} placeholder="e.g. Dinner, Taxi" />
          </div>

          <div className="form-group">
            <label className="label">Amount</label>
            <input required type="number" step="0.01" className="input" name="amount" value={formData.amount} onChange={handleChange} placeholder="0.00" />
          </div>

          <div className="form-group">
            <label className="label">Paid By</label>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {trip.participants?.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, paid_by_participant_id: p.id }))}
                  className={`btn ${formData.paid_by_participant_id === p.id ? 'btn-primary' : 'btn-outline'}`}
                  style={{ borderRadius: 30, display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 'max-content' }}
                >
                  {formData.paid_by_participant_id === p.id && <Check size={14} />}
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {trip.participants?.find(p => p.id === formData.paid_by_participant_id)?.is_owner && (
            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-bg)', borderRadius: 'var(--radius-lg)' }}>
              <label className="label" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>Sync to Personal Ledger (Optional)</label>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginBottom: 'var(--space-3)' }}>
                Select an account to deduct this amount from your overall personal budget.
              </p>
              <select className="select" name="account_id" value={formData.account_id} onChange={handleChange}>
                <option value="">Do not sync</option>
                {accounts?.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: 'var(--space-4)' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={createTxMutation.isPending}>
              {createTxMutation.isPending ? 'Logging...' : 'Log Expense'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
