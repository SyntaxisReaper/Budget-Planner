import { Trash2, Calendar as CalendarIcon, Paperclip, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { itemVariants } from '../lib/motion.js';
import { format } from 'date-fns';

export default function TaskCard({ task, onClick, remove }) {
  // task.task_comments is an array with {count: X} if we used the supabase aggregate feature
  const commentCount = Array.isArray(task.task_comments) 
    ? (task.task_comments[0]?.count || 0) 
    : (task.task_comments?.count || 0);

  return (
    <motion.div 
      variants={itemVariants} 
      className="card card-sm flex flex-col gap-3 cursor-pointer group" 
      onClick={onClick}
    >
      <div className="flex justify-between items-start gap-3">
        <h4 className="font-bold text-[15px] text-[var(--color-text)] leading-snug">{task.title}</h4>
        <button 
          onClick={(e) => { e.stopPropagation(); if(confirm('Delete?')) remove.mutate(task.id); }} 
          className="text-muted p-1 border border-border rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>
      
      {task.priority && (
        <div className="font-bold text-sm text-[var(--color-text)] mt-1 capitalize">
          {task.priority} Priority
        </div>
      )}

      <div className="flex items-center gap-4 mt-2 text-xs text-muted font-medium">
        {task.due_date && (
          <span className="flex items-center gap-1.5">
            <CalendarIcon size={12}/> {format(new Date(task.due_date), 'MMM d')}
          </span>
        )}
        <span className="flex items-center gap-1.5"><MessageSquare size={12}/> {commentCount}</span>
      </div>
    </motion.div>
  );
}
