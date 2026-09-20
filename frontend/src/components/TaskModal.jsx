import { useState } from 'react';
import { motion } from 'framer-motion';
import { backdropVariants, modalVariants } from '../lib/motion.js';
import { useTaskComments, useContacts, useProjects } from '../hooks/useBudget.js';
import { format } from 'date-fns';
import { X, Send, Paperclip, Maximize2, MoreHorizontal, User, CheckSquare, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('comments'); 
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const { query: commentsQuery, create: createComment } = useTaskComments(task?.id);
  const comments = commentsQuery.data || [];
  const [commentText, setCommentText] = useState('');

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!form.title.trim()) return;
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

  return (
    <motion.div className="modal-overlay" style={{ alignItems: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }} variants={backdropVariants} initial="hidden" animate="visible" exit="exit" onClick={onClose}>
      <motion.div className="modal" style={{ height: '90vh', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, display: 'flex', flexDirection: 'column', padding: '16px 20px', gap: '20px', backgroundColor: 'var(--color-surface)' }} variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={e => e.stopPropagation()}>
        
        {/* Header Options */}
        <div className="flex justify-between items-center text-[var(--color-text)] border-b border-border/50 pb-3">
          <button 
            className="flex items-center gap-1.5 px-2 py-1 rounded border border-border text-[13px] font-medium hover:bg-[var(--color-surface-2)] transition-colors"
            onClick={() => {
              const newStatus = form.status === 'completed' ? 'todo' : 'completed';
              set('status', newStatus);
              if (!isNew) {
                 onSave({ ...form, status: newStatus });
                 impactLight();
              }
            }}
          >
            <CheckSquare size={14} className={form.status === 'completed' ? 'text-primary' : ''} />
            {form.status === 'completed' ? 'Completed' : 'Mark Completed'}
          </button>
          
          <div className="flex gap-4 items-center text-muted">
            <Paperclip size={18} />
            <Maximize2 size={16} />
            <MoreHorizontal size={18} />
            <button onClick={onClose} className="border border-border p-0.5 rounded"><X size={18} /></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 flex flex-col gap-5 hide-scrollbar">
          {/* Title */}
          <input 
            type="text" 
            className="text-lg font-bold bg-transparent border-b border-border/50 outline-none w-full pb-2 placeholder:text-muted/50" 
            placeholder="Task Title..." 
            value={form.title} 
            onChange={e => set('title', e.target.value)}
            onBlur={() => !isNew && handleSubmit()}
            autoFocus={isNew}
          />

          {/* Properties Grid - Minimalist UI */}
          <div className="flex flex-col gap-4 text-sm">
            
            <div>
              <div className="text-muted text-[13px] mb-1">Assignee</div>
              <div className="relative">
                <select className="select pr-8" value={form.assignee_id} onChange={e => { set('assignee_id', e.target.value); !isNew && handleSubmit(); }}>
                  <option value="">Unassigned</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>

            <div>
              <div className="text-muted text-[13px] mb-1">Due Date</div>
              <div className="relative">
                <input type="date" className="input appearance-none pr-8" value={form.due_date} onChange={e => { set('due_date', e.target.value); !isNew && handleSubmit(); }} />
                <CalendarIcon size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text pointer-events-none bg-[var(--color-surface)] pl-1" />
              </div>
            </div>

            <div>
              <div className="text-muted text-[13px] mb-1">Project</div>
              <div className="relative">
                <select className="select pr-8" value={form.project_id} onChange={e => { set('project_id', e.target.value); !isNew && handleSubmit(); }}>
                  <option value="">No Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>

            <div>
              <div className="text-muted text-[13px] mb-1">Priority</div>
              <div className="relative">
                <select className="select font-bold capitalize pr-8" value={form.priority} onChange={e => { set('priority', e.target.value); !isNew && handleSubmit(); }}>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>

          </div>

          {/* Description */}
          <div>
            <div className="font-bold text-[13px] mb-2 text-[var(--color-text)]">Description</div>
            <textarea 
              className="textarea min-h-[80px] resize-none pt-3" 
              placeholder="Add details..." 
              value={form.description} 
              onChange={e => set('description', e.target.value)}
              onBlur={() => !isNew && handleSubmit()}
            />
          </div>

          {/* Comments Section */}
          {!isNew && (
            <div className="flex-1 flex flex-col mt-2">
              <div className="flex gap-3 mb-4 border-b border-border">
                <button className={`pb-1.5 px-1 text-[13px] ${activeTab === 'comments' ? 'border-b border-text text-text font-medium' : 'text-muted'}`} onClick={() => setActiveTab('comments')}>
                  Comments
                </button>
                <button className={`pb-1.5 px-1 text-[13px] ${activeTab === 'updates' ? 'border-b border-text text-text font-medium' : 'text-muted'}`} onClick={() => setActiveTab('updates')}>
                  Updates
                </button>
              </div>

              {activeTab === 'comments' && (
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex flex-col gap-4 mb-4 flex-1">
                    {commentsQuery.isLoading && <div className="spinner mx-auto" />}
                    {comments.length === 0 && !commentsQuery.isLoading && <div className="text-text text-[13px] py-2">No comments yet.</div>}
                    {comments.map(c => (
                      <div key={c.id} className="flex gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-bg flex items-center justify-center shrink-0 border border-border">
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

                  <form onSubmit={handleAddComment} className="flex gap-3 items-center">
                    <input 
                      type="text" 
                      className="input flex-1" 
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                    />
                    <button type="button" className="text-muted p-2 border border-border rounded-md hover:bg-[var(--color-surface-2)]"><Paperclip size={18} /></button>
                    <button type="submit" className="text-muted p-2 border border-border rounded-md hover:bg-[var(--color-surface-2)]" disabled={!commentText.trim() || createComment.isPending}>
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {isNew && (
            <div className="mt-auto pt-4 pb-4">
               <button className="btn btn-primary w-full" onClick={() => handleSubmit()} disabled={loading || !form.title.trim()}>{loading ? 'Saving...' : 'Create Task'}</button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
