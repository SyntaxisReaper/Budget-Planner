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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '8px' }}>
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                <div key={day} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '600', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: '4px' }}>
              {daysInGrid.map((day, idx) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDate[dateStr] || [];
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40px', position: 'relative' }}>
                    <button
                      onClick={() => setSelectedDate(day)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: isSelected ? '700' : '400',
                        border: isTodayDate && !isSelected ? '2px solid var(--color-primary)' : '2px solid transparent',
                        background: isSelected ? 'var(--color-primary)' : 'transparent',
                        color: isSelected ? '#fff' : !isCurrentMonth ? 'var(--color-text-3)' : isTodayDate ? 'var(--color-primary)' : 'var(--color-text)',
                        opacity: !isCurrentMonth ? 0.4 : 1,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        outline: 'none',
                      }}
                    >
                      {format(day, 'd')}
                    </button>
                    
                    {/* Event indicators (dots) */}
                    {dayEvents.length > 0 && (
                      <div style={{ position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '2px' }}>
                        {dayEvents.slice(0, 3).map((e, i) => (
                          <div 
                            key={i} 
                            style={{ width: '4px', height: '4px', borderRadius: '50%', background: getEventColor(e.type) }} 
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
