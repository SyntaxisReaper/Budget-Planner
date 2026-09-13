import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useItems } from '../hooks/useBudget.js';
import toast from 'react-hot-toast';

const PRIORITIES = ['essential', 'important', 'optional'];
const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

function ItemModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || {
    name: '', amount_needed: '', priority: 'important', is_recurring: false, due_date: '',
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ ...form, amount_needed: parseFloat(form.amount_needed) });
      toast.success(initial ? 'Item updated!' : 'Item added!');
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{initial ? '✏️ Edit Item' : '➕ Add Item'}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="label">Name</label>
            <input id="item-name" type="text" className="input" placeholder="e.g. Groceries" required
              value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Amount Needed (?)</label>
              <input id="item-amount" type="number" className="input" step="0.01" min="0" placeholder="0.00" required
                value={form.amount_needed} onChange={(e) => set('amount_needed', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Priority</label>
              <select id="item-priority" className="select" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Due Date (optional)</label>
              <input id="item-due" type="date" className="input" value={form.due_date || ''}
                onChange={(e) => set('due_date', e.target.value)} />
            </div>
            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <label className="label">&nbsp;</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
                <input id="item-recurring" type="checkbox" checked={form.is_recurring}
                  onChange={(e) => set('is_recurring', e.target.checked)}
                  style={{ accentColor: 'var(--color-primary)', width: 16, height: 16 }} />
                <span className="text-sm">Recurring</span>
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button id="item-submit" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : (initial ? 'Save Changes' : 'Add Item')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PriorityColumn({ title, color, items, onEdit, onDelete }) {
  return (
    <div className="card" style={{ borderColor: `${color}22`, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', height: 'fit-content' }}>
      <div className="flex items-center justify-between">
        <div className="section-title" style={{ color }}>{title}</div>
        <span className="badge" style={{ background: `${color}18`, color }}>{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted">No {title.toLowerCase()} items yet.</p>
      ) : (
        items.map((item) => (
          <div key={item.id} className="card card-sm" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between gap-3">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="font-semibold text-sm" style={{ marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div className="text-xs text-muted">{fmt.format(item.amount_needed)}{item.is_recurring ? ' · recurring' : ''}</div>
                {item.due_date && <div className="text-xs text-muted">Due {new Date(item.due_date).toLocaleDateString()}</div>}
              </div>
              <div className="flex gap-1">
                <button id={`item-edit-${item.id}`} className="btn btn-icon btn-ghost btn-sm" onClick={() => onEdit(item)}>
                  <Pencil size={12} />
                </button>
                <button id={`item-del-${item.id}`} className="btn btn-icon btn-danger btn-sm" onClick={() => onDelete(item.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function Items() {
  const { query, create, update, remove } = useItems();
  const [modal, setModal] = useState(null); // null | 'add' | item object

  const items = query.data || [];
  const groups = {
    essential: items.filter((i) => i.priority === 'essential'),
    important: items.filter((i) => i.priority === 'important'),
    optional:  items.filter((i) => i.priority === 'optional'),
  };
  const totalNeeded = items.reduce((s, i) => s + Number(i.amount_needed), 0);

  async function handleDelete(id) {
    if (!confirm('Delete this item?')) return;
    try {
      await remove.mutateAsync(id);
      toast.success('Item deleted');
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
    <div className="page animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Items</h1>
          <p className="page-subtitle">Manage needs & expense categories · Total needed: {fmt.format(totalNeeded)}</p>
        </div>
        <button id="add-item-btn" className="btn btn-primary" onClick={() => setModal('add')}>
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div className="grid-3">
        <PriorityColumn title="Essential" color="var(--color-essential)" items={groups.essential}
          onEdit={(item) => setModal(item)} onDelete={handleDelete} />
        <PriorityColumn title="Important" color="var(--color-warning)" items={groups.important}
          onEdit={(item) => setModal(item)} onDelete={handleDelete} />
        <PriorityColumn title="Optional" color="var(--color-optional)" items={groups.optional}
          onEdit={(item) => setModal(item)} onDelete={handleDelete} />
      </div>

      {modal && (
        <ItemModal
          initial={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
