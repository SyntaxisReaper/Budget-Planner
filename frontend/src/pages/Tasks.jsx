import { useState, useMemo } from 'react';
import { useTasks, useProjects, useContacts } from '../hooks/useBudget.js';
import { Plus, CheckSquare, Search, Bell, Paperclip, MessageSquare, Trash2, Calendar as CalendarIcon, User, ChevronDown, List, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, itemVariants } from '../lib/motion.js';
import { format } from 'date-fns';
import TaskModal from '../components/TaskModal.jsx';

function TaskCard({ task, onClick, remove }) {
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
        <span className="flex items-center gap-1.5"><Paperclip size={12}/> 3</span>
        <span className="flex items-center gap-1.5"><MessageSquare size={12}/> 7</span>
      </div>
    </motion.div>
  );
}

export default function Tasks() {
  const { query: tasksQuery, create, update, remove } = useTasks();
  const { query: projectsQuery, create: createProject } = useProjects();
  
  const [activeProject, setActiveProject] = useState('all');
  const [view, setView] = useState('list'); // list, board
  const [editingTask, setEditingTask] = useState(undefined); // undefined means no modal, null means new task
  const [isProjectDropdownOpen, setProjectDropdownOpen] = useState(false);
  
  const tasks = tasksQuery.data || [];
  const projects = projectsQuery.data || [];

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
      <header className="page-header flex justify-between items-center mb-6 pt-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              className="flex items-center gap-2 text-xl font-bold bg-white px-3 py-1.5 rounded-lg shadow-sm border border-border" 
              onClick={() => setProjectDropdownOpen(!isProjectDropdownOpen)}
            >
              <CheckSquare size={18} />
              {currentProjectName} <ChevronDown size={18} className="text-muted ml-1" />
            </button>
            {isProjectDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 w-48 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                <button className="w-full text-left px-4 py-3 hover:bg-bg/50 border-b border-border text-sm font-medium" onClick={() => { setActiveProject('all'); setProjectDropdownOpen(false); }}>All Tasks</button>
                {projects.map(p => (
                  <button key={p.id} className="w-full text-left px-4 py-3 hover:bg-bg/50 border-b border-border text-sm font-medium" onClick={() => { setActiveProject(p.id); setProjectDropdownOpen(false); }}>
                    {p.name}
                  </button>
                ))}
                <button className="w-full text-left px-4 py-3 text-primary font-bold hover:bg-bg/50 flex gap-2 items-center text-sm" onClick={() => { handleAddProject(); setProjectDropdownOpen(false); }}>
                  <Plus size={16} /> New Project
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-4 text-muted">
          <Search size={20} />
          <Bell size={20} />
        </div>
      </header>

      {/* View Toggles & Add button */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex bg-[var(--color-surface)] rounded-lg p-1 border border-border shadow-sm">
          <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${view === 'list' ? 'bg-[var(--color-bg)] text-[var(--color-text)]' : 'text-[var(--color-text-3)]'}`} onClick={() => setView('list')}>
            <List size={14} /> List
          </button>
          <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${view === 'board' ? 'bg-[var(--color-bg)] text-[var(--color-text)]' : 'text-[var(--color-text-3)]'}`} onClick={() => setView('board')}>
            <LayoutGrid size={14} /> Board
          </button>
        </div>
        <button className="btn btn-primary text-sm h-10" onClick={() => setEditingTask(null)}>
          <Plus size={16} /> Add Task
        </button>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar -mx-4 px-4">
        {view === 'list' && (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6 pb-10">
            {/* TODO Section */}
            <div>
              <h3 className="font-bold text-[13px] text-text mb-3">To Do ({todoTasks.length})</h3>
              <div className="flex flex-col gap-3">
                {todoTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setEditingTask(task)} remove={remove} />)}
                {todoTasks.length === 0 && <div className="text-muted text-sm py-2">No pending tasks.</div>}
              </div>
            </div>

            {/* IN PROGRESS Section */}
            {inProgressTasks.length > 0 && (
              <div>
                <h3 className="font-bold text-[13px] text-text mb-3 flex gap-2 items-center">
                  In Progress <span className="text-muted font-normal">({inProgressTasks.length})</span>
                </h3>
                <div className="flex flex-col gap-3">
                  {inProgressTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setEditingTask(task)} remove={remove} />)}
                </div>
              </div>
            )}

            {/* COMPLETED Section */}
            {completedTasks.length > 0 && (
              <div className="opacity-70">
                <h3 className="font-bold text-[13px] text-text mb-3">Completed ({completedTasks.length})</h3>
                <div className="flex flex-col gap-3">
                  {completedTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setEditingTask(task)} remove={remove} />)}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {view === 'board' && (
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-6 h-full items-start">
            {/* Board Columns */}
            <div className="min-w-[280px] flex-1 flex flex-col gap-3">
              <h3 className="font-bold text-[13px] text-text sticky top-0 bg-bg py-2 z-10">To Do <span className="ml-1 opacity-50">{todoTasks.length}</span></h3>
              {todoTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setEditingTask(task)} remove={remove} />)}
              <button className="flex items-center gap-2 justify-center w-full py-3 border border-dashed border-border rounded-xl text-muted hover:bg-white transition-colors mt-2 text-sm font-medium" onClick={() => setEditingTask(null)}>
                <Plus size={16} /> Add Task
              </button>
            </div>

            <div className="min-w-[280px] flex-1 flex flex-col gap-3">
              <h3 className="font-bold text-[13px] text-text sticky top-0 bg-bg py-2 z-10 flex items-center gap-2">
                In Progress <span className="ml-1 opacity-50">{inProgressTasks.length}</span>
              </h3>
              {inProgressTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setEditingTask(task)} remove={remove} />)}
            </div>

            <div className="min-w-[280px] flex-1 flex flex-col gap-3 opacity-70">
              <h3 className="font-bold text-[13px] text-text sticky top-0 bg-bg py-2 z-10">Completed <span className="ml-1 opacity-50">{completedTasks.length}</span></h3>
              {completedTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setEditingTask(task)} remove={remove} />)}
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
