import { useState } from 'react';
import { useContacts, usePeopleLedger } from '../hooks/useBudget.js';
import { useTrips } from '../hooks/useTrips.js';
import { Users, Plus, Phone, Mail, ChevronRight, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, itemVariants, backdropVariants, modalVariants } from '../lib/motion.js';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../lib/utils.js';

function ContactModal({ contact, onClose, onSave }) {
  const [form, setForm] = useState({ name: contact?.name || '', email: contact?.email || '', phone: contact?.phone || '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
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
        <h2 className="modal-title">{contact ? 'Edit Contact' : 'New Contact'}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="label">Name</label>
            <input type="text" className="input" placeholder="Pratik" required autoFocus
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="label">Email (Optional)</label>
            <input type="email" className="input" placeholder="pratik@example.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="label">Phone (Optional)</label>
            <input type="tel" className="input" placeholder="+91..."
              value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
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

export default function Contacts() {
  const { query, create, update, remove } = useContacts();
  const { query: ledgerQuery } = usePeopleLedger();
  const { query: tripsQuery } = useTrips();
  
  const [editingContact, setEditingContact] = useState(undefined);
  const navigate = useNavigate();
  
  const contacts = query.data || [];
  const ledgers = ledgerQuery.data || [];
  const trips = tripsQuery.data || [];

  const getContactSummary = (contactId) => {
    // IOU logic
    const contactLedgers = ledgers.filter(l => l.person_id === contactId && l.status === 'active');
    const youOwe = contactLedgers.filter(l => l.direction === 'borrowed').reduce((s, l) => s + Number(l.amount), 0);
    const owedToYou = contactLedgers.filter(l => l.direction === 'lent').reduce((s, l) => s + Number(l.amount), 0);
    const balance = owedToYou - youOwe;

    // Trip logic
    const tripCount = trips.filter(t => t.participants?.some(p => p.person_id === contactId)).length;

    return { balance, tripCount };
  };

  return (
    <div className="page pb-24">
      <header className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title">Contacts</h1>
          <p className="text-muted text-sm mt-1">People in your network</p>
        </div>
        <button className="btn btn-primary btn-icon" onClick={() => setEditingContact(null)}>
          <Plus size={20} />
        </button>
      </header>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-3">
        {contacts.length === 0 ? (
          <motion.div variants={itemVariants} className="empty-state text-center py-10 text-muted">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>No contacts yet.</p>
          </motion.div>
        ) : (
          contacts.map(contact => {
            const { balance, tripCount } = getContactSummary(contact.id);
            return (
              <motion.div key={contact.id} variants={itemVariants} className="card p-4 flex items-center gap-4 cursor-pointer" onClick={() => setEditingContact(contact)}>
                <div className="w-10 h-10 rounded-full bg-bg flex items-center justify-center text-primary font-bold text-lg uppercase">
                  {contact.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{contact.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted mt-1">
                    {contact.phone && <span className="flex items-center gap-1"><Phone size={10}/> {contact.phone}</span>}
                    {tripCount > 0 && <span>{tripCount} trip{tripCount > 1 ? 's' : ''}</span>}
                  </div>
                </div>
                <div className="text-right">
                  {balance !== 0 && (
                    <div className={`font-bold text-sm ${balance > 0 ? 'text-primary' : 'text-error'}`}>
                      {balance > 0 ? '+' : ''}{formatCurrency(balance)}
                    </div>
                  )}
                  <ChevronRight size={16} className="text-muted mt-1 ml-auto" />
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>

      <AnimatePresence>
        {editingContact !== undefined && (
          <ContactModal 
            contact={editingContact} 
            onClose={() => setEditingContact(undefined)} 
            onSave={(data) => editingContact ? update.mutateAsync({ id: editingContact.id, ...data }) : create.mutateAsync(data)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
