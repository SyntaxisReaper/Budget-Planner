import { useState } from 'react';
import { Plus, DollarSign, TrendingDown, Banknote, Pencil } from 'lucide-react';
import { useDebts } from '../hooks/useBudget.js';
import DebtPayoffChart from '../components/DebtPayoffChart.jsx';
import toast from 'react-hot-toast';
import apiClient from '../lib/apiClient.js';
import { useQuery } from '@tanstack/react-query';

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function AddDebtModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', principal: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreate({ name: form.name, principal: parseFloat(form.principal) });
      toast.success('Debt added!');
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">💳 Add Debt</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="label">Debt Name</label>
            <input id="debt-name" type="text" className="input" placeholder="e.g. Student Loan" required
              value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="label">Amount ($)</label>
            <input id="debt-principal" type="number" className="input" step="0.01" min="0" placeholder="0.00" required
              value={form.principal} onChange={(e) => set('principal', e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button id="debt-submit" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Add Debt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Edit Debt modal — all fields optional except name.
 * Leaving interest_rate / min_payment blank = no floor,
 * so the allocator distributes purely by equal distribution.
 */
function EditDebtModal({ debt, onClose, onUpdate }) {
  const [form, setForm] = useState({
    name: debt.name,
    interest_rate: debt.interest_rate ?? '',
    min_payment: debt.min_payment ?? '',
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
        // Send null explicitly to clear these fields
        interest_rate: form.interest_rate !== '' ? parseFloat(form.interest_rate) : null,
        min_payment: form.min_payment !== '' ? parseFloat(form.min_payment) : null,
      });
      toast.success('Debt updated!');
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">✏️ Edit Debt</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="label">Debt Name</label>
            <input id="edit-debt-name" type="text" className="input" required
              value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Annual Interest Rate (%)</label>
              <input id="edit-debt-rate" type="number" className="input" step="0.01" min="0"
                placeholder="Leave blank = no interest"
                value={form.interest_rate} onChange={(e) => set('interest_rate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Min Payment / month ($)</label>
              <input id="edit-debt-minpay" type="number" className="input" step="0.01" min="0"
                placeholder="Leave blank = auto-allocate"
                value={form.min_payment} onChange={(e) => set('min_payment', e.target.value)} />
            </div>
          </div>

          <p className="text-xs text-muted" style={{ lineHeight: 1.6 }}>
            💡 Leave both fields blank and the budget allocator will distribute
            payments evenly across all active debts with no minimum floor.
          </p>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button id="edit-debt-submit" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">💰 Log Payment — {debt.name}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-row">
            <div className="form-group">
              <label className="label">Amount ($)</label>
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
      </div>
    </div>
  );
}

export default function Debts() {
  const { query, create, update, remove, logPayment } = useDebts();
  const [showAdd, setShowAdd] = useState(false);
  const [payDebt, setPayDebt] = useState(null);
  const [editDebt, setEditDebt] = useState(null);

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
    <div className="page animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Debts</h1>
          <p className="page-subtitle">Track and pay down your debts with equal distribution</p>
        </div>
        <button id="add-debt-btn" className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Debt
        </button>
      </div>

      {/* Summary */}
      <div className="grid-3 mb-6">
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)' }}><Banknote size={18} color="var(--color-danger)" /></div>
          <div className="stat-label">Total Remaining</div>
          <div className="stat-value negative">{fmt.format(totalRemaining)}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(113,90,255,0.1)' }}><DollarSign size={18} color="var(--color-primary)" /></div>
          <div className="stat-label">Active Debts</div>
          <div className="stat-value primary">{active.length}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(52,211,153,0.1)' }}><TrendingDown size={18} color="var(--color-success)" /></div>
          <div className="stat-label">Paid Off</div>
          <div className="stat-value positive">{paidOff.length}</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Debt cards */}
        <div className="flex flex-col gap-4">
          {active.length === 0 && (
            <div className="card empty-state"><p>No active debts. Great job or add one above!</p></div>
          )}
          {active.map((debt) => {
            const proj = projections.find((p) => p.id === debt.id);
            const pct = 1 - (Number(debt.remaining_balance) / Number(debt.principal));
            return (
              <div key={debt.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-bold" style={{ fontSize: 'var(--text-md)' }}>{debt.name}</div>
                    <div className="text-xs text-muted">
                      {debt.interest_rate ? `${debt.interest_rate}% APR` : 'No interest'}
                      {debt.min_payment ? ` · Min ${fmt.format(debt.min_payment)}/mo` : ''}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button id={`pay-btn-${debt.id}`} className="btn btn-accent btn-sm" onClick={() => setPayDebt(debt)}>
                      <DollarSign size={13} /> Pay
                    </button>
                    <button id={`edit-btn-${debt.id}`} className="btn btn-ghost btn-sm" onClick={() => setEditDebt(debt)}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button id={`del-debt-${debt.id}`} className="btn btn-danger btn-sm" onClick={() => handleDelete(debt.id)}>
                      Delete
                    </button>
                  </div>
                </div>

                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted">Remaining</span>
                  <span className="font-bold text-danger">{fmt.format(debt.remaining_balance)}</span>
                </div>
                <div className="progress-bar mb-3">
                  <div className="progress-fill accent" style={{ width: `${pct * 100}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>{Math.round(pct * 100)}% paid off</span>
                  {proj?.months_to_payoff ? <span>~{proj.months_to_payoff} months to go</span> : null}
                </div>
              </div>
            );
          })}

          {paidOff.length > 0 && (
            <div className="card" style={{ borderColor: 'rgba(52,211,153,0.2)', background: 'rgba(52,211,153,0.03)' }}>
              <div className="section-title text-sm mb-3" style={{ color: 'var(--color-success)' }}>✓ Paid Off</div>
              {paidOff.map((d) => (
                <div key={d.id} className="flex justify-between text-sm py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <span>{d.name}</span>
                  <span className="text-success">Paid off 🎉</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payoff projection chart */}
        <div className="card">
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
        </div>
      </div>

      {showAdd && <AddDebtModal onClose={() => setShowAdd(false)} onCreate={create.mutateAsync} />}
      {payDebt && <LogPaymentModal debt={payDebt} onClose={() => setPayDebt(null)} onLog={logPayment.mutateAsync} />}
      {editDebt && <EditDebtModal debt={editDebt} onClose={() => setEditDebt(null)} onUpdate={update.mutateAsync} />}
    </div>
  );
}
