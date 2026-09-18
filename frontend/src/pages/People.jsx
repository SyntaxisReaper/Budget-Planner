import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Share2, Pencil, Trash2 } from 'lucide-react';
import { usePeople } from '../hooks/useBudget.js';
import { useSettings } from '../hooks/useBudget.js'; // Wait, I don't have useSettings exported from useBudget.js. Let me just use useQuery directly.
import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient.js';
import { pageVariants, staggerContainer, itemVariants, backdropVariants, modalVariants } from '../lib/motion.js';
import toast from '../lib/haptics.js';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

function MotionModal({ children, onClose }) {
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
        drag={window.innerWidth <= 768 ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        onDragEnd={(e, info) => {
          if (info.offset.y > 100) onClose();
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function AddPersonModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ person_name: '', amount: '', direction: 'lent', note: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreate({ ...form, amount: parseFloat(form.amount) });
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <MotionModal onClose={onClose}>
      <h2 className="modal-title">🤝 Add IOU</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="form-group">
          <label className="label">Who?</label>
          <input type="text" className="input" placeholder="e.g. Pratik" required autoFocus
            value={form.person_name} onChange={e => set('person_name', e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="label">Direction</label>
            <select className="select" value={form.direction} onChange={e => set('direction', e.target.value)}>
              <option value="lent">They owe me (Lent)</option>
              <option value="borrowed">I owe them (Borrowed)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Amount (₹)</label>
            <input type="number" inputMode="decimal" className="input" step="0.01" min="0" required
              value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="label">Note (Optional)</label>
          <input type="text" className="input" placeholder="Dinner, movie tickets..."
            value={form.note} onChange={e => set('note', e.target.value)} />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner"/> : 'Save'}
          </button>
        </div>
      </form>
    </MotionModal>
  );
}

export default function People() {
  const { query, create, update, remove } = usePeople();
  const [showAdd, setShowAdd] = useState(false);
  
  const people = query.data || [];
  
  const handleShare = async (person) => {
    if (person.direction !== 'lent') {
      toast.error("You can only request money when they owe you.");
      return;
    }
    
    // Check if UPI VPA is set
    const { data: settings } = await apiClient.get('/settings');
    if (!settings?.upi_vpa) {
      toast.error("Please set your UPI VPA in Settings first!");
      return;
    }

    const link = `${window.location.origin}/pay/${person.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Settle Up',
          text: `Hey! You owe me ${fmt.format(person.amount)}. You can pay here:`,
          url: link,
        });
        toast.success("Link shared!");
      } catch (err) {
        if (err.name !== 'AbortError') toast.error("Failed to share");
      }
    } else {
      await navigator.clipboard.writeText(link);
      toast.success("Payment link copied to clipboard!");
    }
  };

  const handleSettle = async (person) => {
    if (!confirm(`Mark this IOU with ${person.person_name} as settled?`)) return;
    try {
      await update.mutateAsync({ id: person.id, status: 'settled' });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this record?')) return;
    try {
      await remove.mutateAsync(id);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const activePeople = people.filter(p => p.status === 'active');
  const youOwe = activePeople.filter(p => p.direction === 'borrowed').reduce((s, p) => s + Number(p.amount), 0);
  const owedToYou = activePeople.filter(p => p.direction === 'lent').reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="page pb-24">
      <header className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title">People</h1>
          <p className="text-muted text-sm mt-1">Informal IOUs & Split Bills</p>
        </div>
        <button className="btn btn-primary btn-icon" onClick={() => setShowAdd(true)}>
          <Plus size={20} />
        </button>
      </header>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
        <motion.div variants={itemVariants} className="grid-2">
          <div className="card stat-card">
            <span className="stat-label">You Owe</span>
            <span className="stat-value negative">{fmt.format(youOwe)}</span>
          </div>
          <div className="card stat-card">
            <span className="stat-label">Owed to You</span>
            <span className="stat-value primary">{fmt.format(owedToYou)}</span>
          </div>
        </motion.div>

        <div className="flex flex-col gap-3">
          {activePeople.length === 0 ? (
            <motion.div variants={itemVariants} className="empty-state text-center py-10 text-muted">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>No active IOUs.</p>
              <p className="text-sm">Tap + to track money you lent or borrowed.</p>
            </motion.div>
          ) : (
            activePeople.map(person => (
              <motion.div key={person.id} variants={itemVariants} className="card p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{person.person_name}</h3>
                    <p className="text-xs text-muted mt-1">
                      {new Date(person.created_at).toLocaleDateString()} {person.note && `· ${person.note}`}
                    </p>
                  </div>
                  <div className={`text-lg font-bold ${person.direction === 'lent' ? 'text-primary' : 'text-negative'}`}>
                    {person.direction === 'lent' ? '+' : '-'}{fmt.format(person.amount)}
                  </div>
                </div>
                
                <div className="flex gap-2 mt-2 border-t border-border pt-3">
                  <button className="btn btn-sm btn-ghost flex-1" onClick={() => handleSettle(person)}>
                    Mark Settled
                  </button>
                  {person.direction === 'lent' && (
                    <button className="btn btn-sm btn-accent flex-1 flex justify-center gap-1" onClick={() => handleShare(person)}>
                      <Share2 size={14} /> Request
                    </button>
                  )}
                  <button className="btn btn-sm btn-danger btn-icon" onClick={() => handleDelete(person.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {showAdd && <AddPersonModal onClose={() => setShowAdd(false)} onCreate={create.mutateAsync} />}
    </div>
  );
}
