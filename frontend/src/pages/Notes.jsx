import { useState } from 'react';
import { useNotes } from '../hooks/useBudget.js';
import { FileText, Plus, Trash2, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, staggerContainer, itemVariants, backdropVariants, modalVariants, fadeUp, tapFeedback } from '../lib/motion.js';
import { impactLight } from '../lib/haptics.js';
import { format } from 'date-fns';

function NoteModal({ note, onClose, onSave }) {
  const [form, setForm] = useState({ title: note?.title || '', content: note?.content || '' });
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
      <motion.div className="modal" style={{ height: '80vh', display: 'flex', flexDirection: 'column' }} variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">{note ? 'Edit Note' : 'New Note'}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
          <div className="form-group">
            <input type="text" className="input" style={{ fontSize: '1.2rem', fontWeight: 'bold' }} placeholder="Title" required autoFocus
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group" style={{ flex: 1, display: 'flex' }}>
            <textarea className="input" style={{ flex: 1, resize: 'none', fontFamily: 'monospace' }} placeholder="Write something..."
              value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
          </div>
          <div className="modal-actions mt-auto">
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

export default function Notes() {
  const { query, create, update, remove } = useNotes();
  const [editingNote, setEditingNote] = useState(undefined); // undefined means closed, null means new note, object means editing
  
  const notes = query.data || [];

  return (
    <div className="page pb-24">
      <header className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title">Notes</h1>
          <p className="text-muted text-sm mt-1">Ideas, logs & journals</p>
        </div>
        <button className="btn btn-primary btn-icon" onClick={() => setEditingNote(null)}>
          <Plus size={20} />
        </button>
      </header>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid-2">
        {notes.length === 0 ? (
          <motion.div variants={itemVariants} className="empty-state col-span-2 text-center py-10 text-muted">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p>No notes yet.</p>
          </motion.div>
        ) : (
          notes.map(note => (
            <motion.div key={note.id} variants={itemVariants} className="card p-4 flex flex-col gap-2 cursor-pointer" onClick={() => setEditingNote(note)}>
              <h3 className="font-bold text-lg">{note.title}</h3>
              <p className="text-sm text-muted line-clamp-3" style={{ whiteSpace: 'pre-wrap' }}>{note.content}</p>
              <div className="text-xs text-muted mt-auto pt-4 flex justify-between items-center">
                <span>{format(new Date(note.created_at), 'MMM d, yyyy')}</span>
                <button className="btn-icon" style={{ padding: 4, color: 'var(--color-danger)' }} onClick={(e) => { e.stopPropagation(); if(confirm('Delete note?')) remove.mutate(note.id); }}>
                  <Trash2 size={14}/>
                </button>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>

      <AnimatePresence>
        {editingNote !== undefined && (
          <NoteModal 
            note={editingNote} 
            onClose={() => setEditingNote(undefined)} 
            onSave={(data) => editingNote ? update.mutateAsync({ id: editingNote.id, ...data }) : create.mutateAsync(data)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
