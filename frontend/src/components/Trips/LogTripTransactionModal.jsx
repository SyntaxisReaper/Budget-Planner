import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useTripTransactions } from '../../hooks/useTrips.js';
import { useAccounts } from '../../hooks/useBudget.js';
import toast from '../../lib/haptics.js';

export default function LogTripTransactionModal({ trip, onClose }) {
  const { addMutation } = useTripTransactions(trip.id);
  const { query: { data: accounts } } = useAccounts();
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    paid_by_participant_id: trip.participants?.[0]?.id || '',
    account_id: '' // If set, dual-write
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addMutation.mutateAsync({
        ...formData,
        amount: Number(formData.amount)
      });
      toast.success('Transaction logged');
      onClose();
    } catch (error) {
      toast.error('Failed to log transaction');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        background: 'var(--color-surface)', width: '100%', maxWidth: 500, borderTopLeftRadius: 'var(--radius-xl)', borderTopRightRadius: 'var(--radius-xl)',
        padding: 'var(--space-6)', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}>Log Expense</h2>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--color-text-2)' }}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label className="form-label">Description</label>
            <input required type="text" className="form-input" name="description" value={formData.description} onChange={handleChange} placeholder="e.g. Dinner, Taxi" />
          </div>

          <div>
            <label className="form-label">Amount</label>
            <input required type="number" step="0.01" className="form-input" name="amount" value={formData.amount} onChange={handleChange} placeholder="0.00" />
          </div>

          <div>
            <label className="form-label">Paid By</label>
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

          {/* Dual write is only shown if the current app user is the one who paid. 
              We assume the user is the owner, and usually the owner's name is what they entered ("Me" by default). 
              Let's see if the selected participant is_owner to show the "Deduct from personal account" option. */}
          {trip.participants?.find(p => p.id === formData.paid_by_participant_id)?.is_owner && (
            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-bg)', borderRadius: 'var(--radius-lg)' }}>
              <label className="form-label" style={{ marginBottom: 'var(--space-2)' }}>Sync to Personal Ledger (Optional)</label>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginBottom: 'var(--space-3)' }}>
                Select an account to deduct this amount from your overall personal budget.
              </p>
              <select className="form-input" name="account_id" value={formData.account_id} onChange={handleChange}>
                <option value="">Do not sync</option>
                {accounts?.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} disabled={addMutation.isPending}>
            {addMutation.isPending ? 'Logging...' : 'Log Expense'}
          </button>
        </form>
      </div>
    </div>
  );
}
