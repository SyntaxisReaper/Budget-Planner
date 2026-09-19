import { useState } from 'react';
import { useTasks } from '../hooks/useBudget.js';
import { CheckSquare, Plus, CheckCircle, Circle, Trash2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, staggerContainer, itemVariants, backdropVariants, modalVariants, fadeUp, tapFeedback } from '../lib/motion.js';
import { impactLight } from '../lib/haptics.js';
import { format } from 'date-fns';

function TaskModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'normal', due_date: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreate(form);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div className="modal-overlay" variants={backdropVariants} initial="hidden" animate="visible" exit="exit" onClick={onClose}>
      <motion.div className="modal" variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">New Task</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="label">Title</label>
            <input type="text" className="input" placeholder="Buy groceries" required autoFocus
              value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Description (Optional)</label>
            <textarea className="input" placeholder="Milk, eggs, bread..." rows="2"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="label">Priority</label>
              <select className="select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Due Date</label>
              <input type="date" className="input" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner"/> : 'Save'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function Tasks() {
  const { query, create, update, remove } = useTasks();
  const [showAdd, setShowAdd] = useState(false);
  
  const tasks = query.data || [];
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const toggleStatus = (task) => {
    impactLight();
    update.mutate({ id: task.id, status: task.status === 'completed' ? 'pending' : 'completed' });
  };

  const getPriorityColor = (p) => {
    if (p === 'high') return 'var(--color-error)';
    if (p === 'low') return 'var(--color-text-3)';
    return 'var(--color-primary)';
  };

  return (
    <div className="page pb-24">
      <header className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="text-muted text-sm mt-1">To-dos & Action Items</p>
        </div>
        <button className="btn btn-primary btn-icon" onClick={() => setShowAdd(true)}>
          <Plus size={20} />
        </button>
      </header>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h3 className="font-bold text-sm text-muted uppercase tracking-wider mb-1">Pending ({pendingTasks.length})</h3>
          {pendingTasks.length === 0 ? (
            <motion.div variants={itemVariants} className="empty-state text-center py-6 text-muted border border-dashed border-border rounded-xl">
              <p>All caught up!</p>
            </motion.div>
          ) : (
            pendingTasks.map(task => (
              <motion.div key={task.id} variants={itemVariants} className="card p-3 flex items-start gap-3">
                <button className="mt-1" style={{ color: 'var(--color-text-3)', background: 'transparent' }} onClick={() => toggleStatus(task)}>
                  <Circle size={20} />
                </button>
                <div className="flex-1">
                  <h4 className="font-bold">{task.title}</h4>
                  {task.description && <p className="text-sm text-muted mt-1">{task.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span style={{ color: getPriorityColor(task.priority), fontWeight: 600, textTransform: 'uppercase' }}>{task.priority}</span>
                    {task.due_date && (
                      <span className="flex items-center gap-1 text-muted">
                        <Calendar size={12}/> {format(new Date(task.due_date), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
                <button className="btn btn-icon btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={() => { if(confirm('Delete task?')) remove.mutate(task.id); }}>
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))
          )}
        </div>

        {completedTasks.length > 0 && (
          <div className="flex flex-col gap-3 opacity-60">
            <h3 className="font-bold text-sm text-muted uppercase tracking-wider mb-1 mt-4">Completed ({completedTasks.length})</h3>
            {completedTasks.map(task => (
              <motion.div key={task.id} variants={itemVariants} className="card p-3 flex items-center gap-3">
                <button style={{ color: 'var(--color-success)', background: 'transparent' }} onClick={() => toggleStatus(task)}>
                  <CheckCircle size={20} />
                </button>
                <div className="flex-1 line-through text-muted">{task.title}</div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showAdd && <TaskModal onClose={() => setShowAdd(false)} onCreate={create.mutateAsync} />}
      </AnimatePresence>
    </div>
  );
}
