import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropVariants, modalVariants } from '../lib/motion.js';
import { useTaskComments, useContacts, useProjects } from '../hooks/useBudget.js';
import { format } from 'date-fns';
import { X, Send, Paperclip, Maximize2, MoreHorizontal, User } from 'lucide-react';
import { impactLight } from '../lib/haptics.js';

export default function TaskModal({ task, onClose, onSave, isNew = false }) {
  const { query: contactsQuery } = useContacts();
  const { query: projectsQuery } = useProjects();
  
  const contacts = contactsQuery.data || [];
  const projects = projectsQuery.data || [];

  const [form, setForm] = useState({ 
    title: task?.title || '', 
    description: task?.description || '', 
    priority: task?.priority || 'normal', 
    due_date: task?.due_date || '',
    status: task?.status || 'todo',
    project_id: task?.project_id || '',
    assignee_id: task?.assignee_id || '',
    tags: task?.tags ? [...task.tags] : []
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('comments'); // comments, updates
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Comments fetching
  const { query: commentsQuery, create: createComment } = useTaskComments(task?.id);
  const comments = commentsQuery.data || [];
  const [commentText, setCommentText] = useState('');

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
      if (isNew) onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await createComment.mutateAsync({ taskId: task.id, text: commentText });
      setCommentText('');
      impactLight();
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityColor = (p) => {
    if (p === 'high') return 'var(--color-error)';
    if (p === 'low') return 'var(--color-success)';
    return 'var(--color-primary)';
  };

  return (
    <motion.div className="modal-overlay" style={{ alignItems: 'flex-end' }} variants={backdropVariants} initial="hidden" animate="visible" exit="exit" onClick={onClose}>
      <motion.div className="modal" style={{ height: '90vh', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, display: 'flex', flexDirection: 'column', padding: '16px 20px', gap: '16px' }} variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={e => e.stopPropagation()}>
        
        {/* Header Options */}
        <div className="flex justify-between items-center text-muted border-b border-border pb-3">
          <button 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-bg transition-colors"
            onClick={() => {
              const newStatus = form.status === 'completed' ? 'todo' : 'completed';
              set('status', newStatus);
              if (!isNew) {
                 onSave({ ...form, status: newStatus });
                 impactLight();
              }
            }}
          >
            <div className={`w-4 h-4 rounded-full border ${form.status === 'completed' ? 'bg-primary border-primary flex items-center justify-center' : 'border-muted'}`}>
              {form.status === 'completed' && <X size={10} className="text-white" />}
            </div>
            {form.status === 'completed' ? 'Completed' : 'Mark Completed'}
          </button>
          
          <div className="flex gap-4 items-center">
            <Paperclip size={18} />
            <Maximize2 size={18} />
            <MoreHorizontal size={18} />
            <button onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 flex flex-col gap-6 hide-scrollbar">
          {/* Title */}
          <input 
            type="text" 
            className="text-2xl font-bold bg-transparent border-none outline-none w-full placeholder:text-muted/50" 
            placeholder="Task Title..." 
            value={form.title} 
            onChange={e => set('title', e.target.value)}
            onBlur={() => !isNew && handleSubmit()}
            autoFocus={isNew}
          />

          {/* Properties Grid */}
          <div className="grid grid-cols-2 gap-y-4 gap-x-2 items-center text-sm">
            <div className="text-muted">Assignee</div>
            <select className="select bg-bg/50 border-none py-1.5" value={form.assignee_id} onChange={e => { set('assignee_id', e.target.value); !isNew && handleSubmit(); }}>
              <option value="">Unassigned</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <div className="text-muted">Due Date</div>
            <input type="date" className="input bg-bg/50 border-none py-1.5" value={form.due_date} onChange={e => { set('due_date', e.target.value); !isNew && handleSubmit(); }} />

            <div className="text-muted">Project</div>
            <select className="select bg-bg/50 border-none py-1.5" value={form.project_id} onChange={e => { set('project_id', e.target.value); !isNew && handleSubmit(); }}>
              <option value="">No Project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <div className="text-muted">Priority</div>
            <select className="select bg-bg/50 border-none py-1.5" value={form.priority} onChange={e => { set('priority', e.target.value); !isNew && handleSubmit(); }} style={{ color: getPriorityColor(form.priority), fontWeight: 'bold' }}>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <div className="font-bold mb-2 text-sm">Description</div>
            <textarea 
              className="input bg-bg/30 min-h-[80px]" 
              placeholder="Add details..." 
              value={form.description} 
              onChange={e => set('description', e.target.value)}
              onBlur={() => !isNew && handleSubmit()}
            />
          </div>

          {/* Comments Section (Only if existing task) */}
          {!isNew && (
            <div className="flex-1 flex flex-col mt-4 border-t border-border pt-4">
              <div className="flex gap-4 font-bold text-sm mb-4">
                <button className={`pb-1 ${activeTab === 'comments' ? 'border-b-2 border-primary text-text' : 'text-muted'}`} onClick={() => setActiveTab('comments')}>
                  Comments
                </button>
                <button className={`pb-1 ${activeTab === 'updates' ? 'border-b-2 border-primary text-text' : 'text-muted'}`} onClick={() => setActiveTab('updates')}>
                  Updates
                </button>
              </div>

              {activeTab === 'comments' && (
                <div className="flex-1 flex flex-col justify-between">
                  {/* Comment List */}
                  <div className="flex flex-col gap-4 mb-4">
                    {commentsQuery.isLoading && <div className="spinner mx-auto" />}
                    {comments.length === 0 && !commentsQuery.isLoading && <div className="text-muted text-sm text-center py-4">No comments yet.</div>}
                    {comments.map(c => (
                      <div key={c.id} className="flex gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          {c.people?.avatar ? <img src={c.people.avatar} className="w-full h-full rounded-full" /> : <User size={14} />}
                        </div>
                        <div>
                          <div className="font-bold text-xs flex gap-2 items-center">
                            {c.people?.name || 'You'} <span className="text-muted font-normal">{format(new Date(c.created_at), 'MMM d, p')}</span>
                          </div>
                          <div className="mt-0.5 opacity-90">{c.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Comment Input */}
                  <form onSubmit={handleAddComment} className="flex gap-2 items-center bg-bg/50 p-2 rounded-xl">
                    <input 
                      type="text" 
                      className="bg-transparent border-none outline-none flex-1 px-2 text-sm" 
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                    />
                    <button type="button" className="text-muted p-1"><Paperclip size={16} /></button>
                    <button type="submit" className="bg-primary text-white p-1.5 rounded-lg shrink-0" disabled={!commentText.trim() || createComment.isPending}>
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {isNew && (
            <div className="mt-auto pt-4 flex gap-3">
               <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
               <button className="btn btn-primary flex-1" onClick={() => handleSubmit()} disabled={loading}>{loading ? 'Saving...' : 'Create Task'}</button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
