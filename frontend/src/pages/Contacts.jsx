import { useState } from 'react';
import { useContacts, useDebts } from '../hooks/useBudget.js';
import { useTrips } from '../hooks/useTrips.js';
import { Users, Plus, Phone, Mail, ChevronRight, User, Trash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, itemVariants, backdropVariants, modalVariants } from '../lib/motion.js';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../lib/utils.js';
import ContactHistoryModal from '../components/ContactHistoryModal.jsx';
import apiClient from '../lib/apiClient.js';
import toast from 'react-hot-toast';
import { useUndoableAction } from '../hooks/useUndo.jsx';

function ImportContactsButton({ onSuccess }) {
  const [importing, setImporting] = useState(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append('contacts', file);
      const { data } = await apiClient.post('/people/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data.skipped === data.total && data.total > 0) {
        toast.success(`Scanned ${data.total} contacts, no new updates found.`);
      } else {
        toast.success(`Imported ${data.total} contacts (${data.created} new, ${data.updated} updated)`);
      }
      onSuccess(data);
    } catch (e) {
      toast.error('Import failed — check the file format');
    } finally {
      setImporting(false);
      // Reset the file input
      e.target.value = '';
    }
  }

  return (
    <label className="btn btn-secondary cursor-pointer">
      {importing ? <span className="spinner"></span> : '📱 Import'}
      <input type="file" accept=".vcf,.csv" className="hidden" onChange={handleFile} />
    </label>
  );
}

function ContactModal({ contact, onClose, onSave, onViewHistory, onDelete }) {
  const [form, setForm] = useState({ 
    name: contact?.name || '', 
    email: contact?.email || '', 
    phone: contact?.phone || '',
    birthday: contact?.birthday || '',
  });
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
          <div className="form-row">
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
          </div>
          <div className="form-group">
              <label className="label">Birthday (Optional)</label>
              <input type="date" className="input"
                value={form.birthday} onChange={e => setForm({ ...form, birthday: e.target.value })} />
          </div>
          
          {contact && (
            <button 
              type="button" 
              className="btn btn-ghost w-full flex justify-center gap-2 mt-2 border border-border" 
              onClick={() => onViewHistory(contact)}
            >
              View Transaction History
            </button>
          )}

          <div className="modal-actions mt-4 flex justify-between items-center w-full">
            {contact ? (
              <button type="button" className="btn btn-ghost text-error" onClick={onDelete}>
                <Trash size={18} />
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="spinner"/> : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function Contacts() {
  const { query, create, update, remove } = useContacts();
  const { query: debtsQuery } = useDebts();
  const { query: tripsQuery } = useTrips();
  
  const [editingContact, setEditingContact] = useState(undefined);
  const [viewingHistoryFor, setViewingHistoryFor] = useState(null);
  const navigate = useNavigate();
  const { executeUndoable } = useUndoableAction();

  async function handleDelete(id) {
    executeUndoable(id, ['contacts', 'calendarEvents'], async (tid) => {
      await remove.mutateAsync(tid);
    }, 'Contact deleted');
    setEditingContact(undefined);
  }
  
  const contacts = query.data || [];
  const debts = debtsQuery.data || [];
  const trips = tripsQuery.data || [];

  const getContactSummary = (contactId) => {
    // Debt/IOU logic
    const contactDebts = debts.filter(d => d.person_id === contactId && d.status === 'active');
    const youOwe = contactDebts.filter(d => d.direction === 'borrowed').reduce((s, d) => s + Number(d.remaining_balance), 0);
    const owedToYou = contactDebts.filter(d => d.direction === 'lent').reduce((s, d) => s + Number(d.remaining_balance), 0);
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
        <div className="flex items-center gap-2">
          <ImportContactsButton onSuccess={() => query.refetch()} />
          <button className="btn btn-primary btn-icon" onClick={() => setEditingContact(null)}>
            <Plus size={20} />
          </button>
        </div>
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
            onDelete={() => handleDelete(editingContact.id)}
            onViewHistory={(contact) => {
              setEditingContact(undefined);
              setViewingHistoryFor(contact);
            }}
          />
        )}
        {viewingHistoryFor !== null && (
          <ContactHistoryModal 
            contact={viewingHistoryFor} 
            onClose={() => setViewingHistoryFor(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
