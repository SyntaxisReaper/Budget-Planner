import { useState, useMemo } from 'react';
import { useCalendarEvents } from '../hooks/useBudget.js';
import { Calendar as CalendarIcon, CheckSquare, Plane, Repeat, CreditCard, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, itemVariants } from '../lib/motion.js';
import { 
  format, isSameDay, isSameMonth, startOfMonth, endOfMonth, 
  eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isToday 
} from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function Calendar() {
  const { query } = useCalendarEvents();
  const events = query.data || [];
  const navigate = useNavigate();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // Generate grid of days
  const daysInGrid = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // Events on the selected date
  const selectedEvents = useMemo(() => {
    return events.filter(e => isSameDay(new Date(e.date), selectedDate));
  }, [events, selectedDate]);

  // Events map for the badges
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(e => {
      const dateStr = format(new Date(e.date), 'yyyy-MM-dd');
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(e);
    });
    return map;
  }, [events]);

  return (
    <div className="page pb-24">
      <header className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="text-muted text-sm mt-1">Schedule & Reminders</p>
        </div>
      </header>

      {query.isLoading ? (
        <p className="text-center text-muted py-10">Loading calendar...</p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Calendar Widget */}
          <div className="card p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">{format(currentMonth, 'MMMM yyyy')}</h2>
              <div className="flex gap-2">
                <button className="icon-btn p-2" onClick={prevMonth}>
                  <ChevronLeft size={20} />
                </button>
                <button className="icon-btn p-2" onClick={nextMonth}>
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 mb-2">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-muted uppercase">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-y-2">
              {daysInGrid.map((day, idx) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDate[dateStr] || [];
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);

                return (
                  <div key={idx} className="flex justify-center items-center h-10 relative">
                    <button
                      onClick={() => setSelectedDate(day)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors
                        ${!isCurrentMonth ? 'text-muted opacity-50' : ''}
                        ${isSelected ? 'bg-primary text-white font-bold' : ''}
                        ${isTodayDate && !isSelected ? 'border border-primary text-primary' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </button>
                    
                    {/* Event indicators (dots) */}
                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-[2px]">
                        {dayEvents.slice(0, 3).map((e, i) => (
                          <div 
                            key={i} 
                            className="w-1 h-1 rounded-full" 
                            style={{ background: getEventColor(e.type) }} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Events List for Selected Date */}
          <div>
            <h3 className="font-bold text-sm text-muted uppercase tracking-wider mb-4 pl-1">
              {isToday(selectedDate) ? 'Today' : format(selectedDate, 'MMM d, yyyy')}
            </h3>
            
            {selectedEvents.length === 0 ? (
              <div className="empty-state text-center py-8 text-muted bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
                <p>No events for this date.</p>
              </div>
            ) : (
              <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-2">
                {selectedEvents.map(e => (
                  <motion.div key={e.id} variants={itemVariants} className="card p-3 flex items-center gap-3 cursor-pointer" onClick={() => handleEventClick(e)}>
                    <div style={{ color: getEventColor(e.type), background: 'var(--color-bg)', padding: '10px', borderRadius: '12px' }}>
                      {getEventIcon(e.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold">{e.title}</h4>
                      <p className="text-sm text-muted mt-1 flex justify-between">
                        <span className="capitalize">{e.type}</span>
                        {e.amount && <span className="font-semibold text-text">{e.amount}</span>}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-muted" />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
