import { useState, useMemo } from 'react';
import { useTasks, useProjects, useContacts } from '../hooks/useBudget.js';
import { Plus, CheckSquare, Search, Bell, Paperclip, MessageSquare, Circle, CheckCircle, Trash2, Calendar as CalendarIcon, User, ChevronDown, List, LayoutGrid, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, itemVariants } from '../lib/motion.js';
import { impactLight } from '../lib/haptics.js';
import { format } from 'date-fns';
import TaskModal from '../components/TaskModal.jsx';

function TaskCard({ task, onClick, contacts, remove }) {
  const getPriorityColor = (p) => {
    if (p === 'high') return 'var(--color-error)';
    if (p === 'low') return 'var(--color-success)';
    return 'var(--color-primary)';
  };

  const assignee = contacts.find(c => c.id === task.assignee_id);

  return (
    <motion.div variants={itemVariants} className="card p-4 flex flex-col gap-3 cursor-pointer relative group" onClick={onClick}>
      <div className="flex justify-between items-start gap-3">
        <h4 className="font-bold text-sm leading-snug">{task.title}</h4>
        <button onClick={(e) => { e.stopPropagation(); if(confirm('Delete?')) remove.mutate(task.id); }} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 size={14} />
        </button>
      </div>
      
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <div 
          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border" 
          style={{ 
            color: getPriorityColor(task.priority), 
            borderColor: getPriorityColor(task.priority),
            backgroundColor: `${getPriorityColor(task.priority)}15`
          }}
        >
          {task.priority} Priority
        </div>
        
        {task.tags && task.tags.map(t => (
          <div key={t} className="px-2 py-0.5 rounded-full text-[10px] bg-bg border border-border text-muted">
            {t}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-2 pt-3 border-t border-border text-xs text-muted">
        <div className="flex items-center gap-3">
          {task.due_date && (
            <span className="flex items-center gap-1">
              <CalendarIcon size={12}/> {format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
          <span className="flex items-center gap-1"><Paperclip size={12}/> {Math.floor(Math.random() * 5)}</span>
          <span className="flex items-center gap-1"><MessageSquare size={12}/> {Math.floor(Math.random() * 10)}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {assignee && (
            <div className="flex items-center gap-1 text-[10px]">
              <User size={12} /> {assignee.name.split(' ')[0]}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Tasks() {
  const { query: tasksQuery, create, update, remove } = useTasks();
  const { query: projectsQuery, create: createProject } = useProjects();
  const { query: contactsQuery } = useContacts();
  
  const [activeProject, setActiveProject] = useState('all');
  const [view, setView] = useState('list'); // list, board
  const [editingTask, setEditingTask] = useState(undefined); // undefined means no modal, null means new task
  const [isProjectDropdownOpen, setProjectDropdownOpen] = useState(false);
  
  const tasks = tasksQuery.data || [];
  const projects = projectsQuery.data || [];
  const contacts = contactsQuery.data || [];

  const filteredTasks = useMemo(() => {
    if (activeProject === 'all') return tasks;
    return tasks.filter(t => t.project_id === activeProject);
  }, [tasks, activeProject]);

  const todoTasks = filteredTasks.filter(t => t.status === 'todo' || t.status === 'pending');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  const currentProjectName = activeProject === 'all' ? 'All Tasks' : projects.find(p => p.id === activeProject)?.name || 'Project';

  const handleSaveTask = async (taskData) => {
    if (editingTask === null) {
      await create.mutateAsync(taskData);
    } else {
      await update.mutateAsync({ id: editingTask.id, ...taskData });
    }
  };

  const handleAddProject = async () => {
    const name = prompt("New project name:");
    if (name) {
      const p = await createProject.mutateAsync({ name });
      if (p) setActiveProject(p.id);
    }
  };

  return (
    <div className="page pb-24 h-full flex flex-col">
      <header className="page-header flex justify-between items-center mb-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center">
            <CheckSquare size={20} />
          </div>
          <div className="relative">
            <button 
              className="flex items-center gap-2 text-xl font-bold" 
              onClick={() => setProjectDropdownOpen(!isProjectDropdownOpen)}
            >
              {currentProjectName} <ChevronDown size={20} className="text-muted" />
            </button>
            {isProjectDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 w-48 bg-[var(--color-surface)] border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                <button className="w-full text-left px-4 py-3 hover:bg-bg border-b border-border" onClick={() => { setActiveProject('all'); setProjectDropdownOpen(false); }}>All Tasks</button>
                {projects.map(p => (
                  <button key={p.id} className="w-full text-left px-4 py-3 hover:bg-bg border-b border-border" onClick={() => { setActiveProject(p.id); setProjectDropdownOpen(false); }}>
                    {p.name}
                  </button>
                ))}
                <button className="w-full text-left px-4 py-3 text-primary font-bold hover:bg-bg flex gap-2 items-center" onClick={() => { handleAddProject(); setProjectDropdownOpen(false); }}>
                  <Plus size={16} /> New Project
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 text-muted">
          <Search size={20} />
          <Bell size={20} />
        </div>
      </header>

      {/* View Toggles */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'list' ? 'bg-primary/20 text-primary' : 'text-muted hover:bg-bg'}`} onClick={() => setView('list')}>
            <List size={16} /> List
          </button>
          <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'board' ? 'bg-primary/20 text-primary' : 'text-muted hover:bg-bg'}`} onClick={() => setView('board')}>
            <LayoutGrid size={16} /> Board
          </button>
        </div>
        <button className="btn btn-primary btn-sm flex items-center gap-1" onClick={() => setEditingTask(null)}>
          <Plus size={16} /> Add Task
        </button>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar -mx-4 px-4">
        {view === 'list' && (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-8 pb-10">
            {/* TODO Section */}
            <div>
              <h3 className="font-bold text-xs text-muted uppercase tracking-wider mb-3">To Do ({todoTasks.length})</h3>
              <div className="flex flex-col gap-3">
                {todoTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setEditingTask(task)} contacts={contacts} remove={remove} />)}
                {todoTasks.length === 0 && <div className="text-muted text-sm py-2">No pending tasks.</div>}
              </div>
            </div>

            {/* IN PROGRESS Section */}
            {inProgressTasks.length > 0 && (
              <div>
                <h3 className="font-bold text-xs text-muted uppercase tracking-wider mb-3 flex gap-2 items-center">
                  In Progress <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full">{inProgressTasks.length}</span>
                </h3>
                <div className="flex flex-col gap-3">
                  {inProgressTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setEditingTask(task)} contacts={contacts} remove={remove} />)}
                </div>
              </div>
            )}

            {/* COMPLETED Section */}
            {completedTasks.length > 0 && (
              <div className="opacity-60">
                <h3 className="font-bold text-xs text-muted uppercase tracking-wider mb-3">Completed ({completedTasks.length})</h3>
                <div className="flex flex-col gap-3">
                  {completedTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setEditingTask(task)} contacts={contacts} remove={remove} />)}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {view === 'board' && (
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-6 h-full items-start">
            {/* Board Columns */}
            <div className="min-w-[280px] flex-1 flex flex-col gap-3">
              <h3 className="font-bold text-xs text-muted uppercase tracking-wider sticky top-0 bg-[var(--color-bg)] py-2 z-10">To Do <span className="ml-1 opacity-50">{todoTasks.length}</span></h3>
              {todoTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setEditingTask(task)} contacts={contacts} remove={remove} />)}
              <button className="flex items-center gap-2 justify-center w-full py-3 border border-dashed border-border rounded-xl text-muted hover:bg-bg transition-colors mt-2" onClick={() => setEditingTask(null)}>
                <Plus size={16} /> Add Task
              </button>
            </div>

            <div className="min-w-[280px] flex-1 flex flex-col gap-3">
              <h3 className="font-bold text-xs text-muted uppercase tracking-wider sticky top-0 bg-[var(--color-bg)] py-2 z-10 flex items-center gap-2">
                In Progress <span className="w-2 h-2 rounded-full bg-primary"></span>
              </h3>
              {inProgressTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setEditingTask(task)} contacts={contacts} remove={remove} />)}
            </div>

            <div className="min-w-[280px] flex-1 flex flex-col gap-3 opacity-70">
              <h3 className="font-bold text-xs text-muted uppercase tracking-wider sticky top-0 bg-[var(--color-bg)] py-2 z-10">Completed</h3>
              {completedTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setEditingTask(task)} contacts={contacts} remove={remove} />)}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {editingTask !== undefined && (
          <TaskModal 
            task={editingTask} 
            isNew={editingTask === null}
            onClose={() => setEditingTask(undefined)} 
            onSave={handleSaveTask} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
