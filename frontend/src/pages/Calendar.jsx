import { useState } from 'react';
import { useCalendarEvents } from '../hooks/useBudget.js';
import { Calendar as CalendarIcon, CheckSquare, Plane, Repeat, CreditCard, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, itemVariants } from '../lib/motion.js';
import { format, isToday, isTomorrow, isPast, isThisWeek, isThisMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function Calendar() {
  const { query } = useCalendarEvents();
  const events = query.data || [];
  const navigate = useNavigate();

  const getEventIcon = (type) => {
    if (type === 'task') return <CheckSquare size={16} />;
    if (type === 'trip') return <Plane size={16} />;
    if (type === 'subscription') return <Repeat size={16} />;
    if (type === 'debt') return <CreditCard size={16} />;
    return <CalendarIcon size={16} />;
  };

  const getEventColor = (type) => {
    if (type === 'task') return 'var(--color-primary)';
    if (type === 'trip') return '#FF9800'; // Orange
    if (type === 'subscription') return '#E91E63'; // Pink
    if (type === 'debt') return 'var(--color-error)';
    return 'var(--color-text)';
  };

  const handleEventClick = (event) => {
    if (event.type === 'task') navigate('/tasks');
    if (event.type === 'trip') navigate(`/trips/${event.originalId}`);
    if (event.type === 'subscription') navigate('/subscriptions');
    if (event.type === 'debt') navigate('/debts');
  };

  // Group events by date category
  const grouped = {
    today: [],
    tomorrow: [],
    thisWeek: [],
    thisMonth: [],
    later: [],
    past: []
  };

  events.forEach(e => {
    const d = new Date(e.date);
    if (isPast(d) && !isToday(d)) {
      if (e.type !== 'task' || e.status === 'pending') { // Only show past pending tasks
        grouped.past.push(e);
      }
    } else if (isToday(d)) {
      grouped.today.push(e);
    } else if (isTomorrow(d)) {
      grouped.tomorrow.push(e);
    } else if (isThisWeek(d)) {
      grouped.thisWeek.push(e);
    } else if (isThisMonth(d)) {
      grouped.thisMonth.push(e);
    } else {
      grouped.later.push(e);
    }
  });

  const renderSection = (title, items) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="font-bold text-sm text-muted uppercase tracking-wider mb-2 pl-1">{title}</h3>
        <div className="flex flex-col gap-2">
          {items.map(e => (
            <motion.div key={e.id} variants={itemVariants} className="card p-3 flex items-center gap-3 cursor-pointer" onClick={() => handleEventClick(e)}>
              <div style={{ color: getEventColor(e.type), background: 'var(--color-bg)', padding: '10px', borderRadius: '12px' }}>
                {getEventIcon(e.type)}
              </div>
              <div className="flex-1">
                <h4 className="font-bold">{e.title}</h4>
                <p className="text-sm text-muted mt-1 flex justify-between">
                  <span>{format(new Date(e.date), 'MMM d, yyyy')}</span>
                  {e.amount && <span className="font-semibold text-text">{e.amount}</span>}
                </p>
              </div>
              <ChevronRight size={16} className="text-muted" />
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="page pb-24">
      <header className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="text-muted text-sm mt-1">Upcoming events & due dates</p>
        </div>
      </header>

      {query.isLoading ? (
        <p className="text-center text-muted py-10">Loading calendar...</p>
      ) : events.length === 0 ? (
        <div className="empty-state text-center py-10 text-muted">
          <CalendarIcon size={48} className="mx-auto mb-4 opacity-50" />
          <p>No upcoming events.</p>
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          {renderSection('Overdue / Past', grouped.past)}
          {renderSection('Today', grouped.today)}
          {renderSection('Tomorrow', grouped.tomorrow)}
          {renderSection('This Week', grouped.thisWeek)}
          {renderSection('This Month', grouped.thisMonth)}
          {renderSection('Later', grouped.later)}
        </motion.div>
      )}
    </div>
  );
}
