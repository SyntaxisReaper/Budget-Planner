import { useMemo } from 'react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskCard from './TaskCard.jsx';
import { Plus } from 'lucide-react';

function SortableTask({ task, onClick, remove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} remove={remove} />
    </div>
  );
}

function Column({ id, title, tasks, onTaskClick, remove, onAddTask }) {
  return (
    <div className="min-w-[280px] flex-1 flex flex-col gap-3">
      <h3 className="font-bold text-[13px] text-text sticky top-0 bg-bg py-2 z-10 flex justify-between items-center">
        <span>{title} <span className="ml-1 opacity-50">{tasks.length}</span></span>
      </h3>
      <SortableContext id={id} items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3 min-h-[100px]">
          {tasks.map(task => (
            <SortableTask key={task.id} task={task} onClick={() => onTaskClick(task)} remove={remove} />
          ))}
        </div>
      </SortableContext>
      {onAddTask && (
        <button 
          className="flex items-center gap-2 justify-center w-full py-3 border border-dashed border-border rounded-xl text-muted hover:bg-white transition-colors mt-2 text-sm font-medium" 
          onClick={onAddTask}
        >
          <Plus size={16} /> Add Task
        </button>
      )}
    </div>
  );
}

export default function KanbanBoard({ tasks, onTaskClick, onDrop, remove, onAddTask }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const todoTasks = useMemo(() => tasks.filter(t => t.status === 'todo' || t.status === 'pending'), [tasks]);
  const inProgressTasks = useMemo(() => tasks.filter(t => t.status === 'in_progress'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.status === 'completed'), [tasks]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const overId = over.id;
    
    let newStatus = null;
    if (['todo', 'in_progress', 'completed'].includes(overId)) {
      newStatus = overId;
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        newStatus = overTask.status === 'pending' ? 'todo' : overTask.status;
      }
    }

    if (newStatus) {
      const activeTask = tasks.find(t => t.id === taskId);
      const currentStatus = activeTask.status === 'pending' ? 'todo' : activeTask.status;
      if (newStatus !== currentStatus) {
        onDrop(taskId, newStatus);
      }
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-6 h-full items-start w-full">
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <Column id="todo" title="To Do" tasks={todoTasks} onTaskClick={onTaskClick} remove={remove} onAddTask={onAddTask} />
        <Column id="in_progress" title="In Progress" tasks={inProgressTasks} onTaskClick={onTaskClick} remove={remove} />
        <div className="opacity-70 flex-1 min-w-[280px]">
          <Column id="completed" title="Completed" tasks={completedTasks} onTaskClick={onTaskClick} remove={remove} />
        </div>
      </DndContext>
    </div>
  );
}
