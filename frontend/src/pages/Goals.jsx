import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useGoals } from '../hooks/useBudget.js';
import GoalProgressCard from '../components/GoalProgressCard.jsx';
import toast from 'react-hot-toast';

function GoalModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || { name: '', target_amount: '', current_amount: '0', target_date: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        ...form,
        target_amount: parseFloat(form.target_amount),
        current_amount: parseFloat(form.current_amount || 0),
      });
      toast.success(initial ? 'Goal updated!' : 'Goal created!');
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{initial ? '✏️ Edit Goal' : '🎯 New Goal'}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="label">Goal Name</label>
            <input id="goal-name" type="text" className="input" placeholder="e.g. Emergency Fund" required
              value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="label">Target Amount (?)</label>
              <input id="goal-target" type="number" className="input" step="0.01" min="0" placeholder="5000.00" required
                value={form.target_amount} onChange={(e) => set('target_amount', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Current Saved (?)</label>
              <input id="goal-current" type="number" className="input" step="0.01" min="0" placeholder="0.00"
                value={form.current_amount} onChange={(e) => set('current_amount', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Target Date (optional)</label>
            <input id="goal-date" type="date" className="input"
              value={form.target_date || ''} onChange={(e) => set('target_date', e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button id="goal-submit" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : (initial ? 'Save Changes' : 'Create Goal')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Goals() {
  const { query, create, update, remove } = useGoals();
  const [modal, setModal] = useState(null);

  const goals = query.data || [];
  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const totalSaved = goals.reduce((s, g) => s + Number(g.current_amount), 0);
  const atRisk = goals.filter((g) => g.at_risk).length;

  async function handleDelete(id) {
    if (!confirm('Delete this goal?')) return;
    try { await remove.mutateAsync(id); toast.success('Goal deleted'); }
    catch (err) { toast.error(err.message); }
  }

  async function handleSave(form) {
    if (!modal || modal === 'add') await create.mutateAsync(form);
    else await update.mutateAsync({ id: modal.id, ...form });
  }

  return (
    <div className="page animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Goals</h1>
          <p className="page-subtitle">
            Track savings goals · {goals.length} total
            {atRisk > 0 && <span style={{ color: 'var(--color-warning)', marginLeft: 8 }}>⚠️ {atRisk} at risk</span>}
          </p>
        </div>
        <button id="add-goal-btn" className="btn btn-primary" onClick={() => setModal('add')}>
          <Plus size={16} /> Add Goal
        </button>
      </div>

      {/* Summary */}
      <div className="grid-3 mb-6">
        <div className="card stat-card">
          <div className="stat-label">Total Target</div>
          <div className="stat-value primary">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalTarget)}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Total Saved</div>
          <div className="stat-value positive">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalSaved)}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Still Needed</div>
          <div className="stat-value">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Math.max(0, totalTarget - totalSaved))}</div>
        </div>
      </div>

      {query.isLoading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : goals.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon"><span style={{ fontSize: 28 }}>🎯</span></div>
          <p>No goals yet. Set your first financial target!</p>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('add')}>Add a Goal</button>
        </div>
      ) : (
        <div className="grid-2">
          {goals.map((goal) => (
            <GoalProgressCard
              key={goal.id}
              goal={goal}
              onEdit={(g) => setModal(g)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {modal && (
        <GoalModal
          initial={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
