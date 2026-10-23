import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarView({ events, onEventClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getEventsForDay = (day) => {
    return events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate.getFullYear() === year &&
             eventDate.getMonth() === month &&
             eventDate.getDate() === day;
    });
  };

  const today = new Date();
  const isToday = (day) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day;

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-24 sm:h-28" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = getEventsForDay(day);
    days.push(
      <div
        key={day}
        className={`h-24 sm:h-28 p-1.5 rounded-xl border transition-colors ${
          isToday(day)
            ? 'border-primary-500/30 dark:bg-primary-500/5 bg-primary-50'
            : 'dark:border-white/5 border-surface-100 hover:border-primary-500/20'
        }`}
      >
        <span className={`text-sm font-medium ${
          isToday(day) ? 'text-primary-500' : 'dark:text-surface-300 text-surface-600'
        }`}>
          {day}
        </span>
        <div className="mt-1 space-y-0.5 overflow-hidden">
          {dayEvents.slice(0, 2).map(evt => (
            <button
              key={evt.id}
              onClick={() => onEventClick?.(evt)}
              className="w-full text-left px-1.5 py-0.5 text-[10px] font-medium rounded-md truncate transition-colors bg-primary-500/10 text-primary-400 hover:bg-primary-500/20"
            >
              {evt.title}
            </button>
          ))}
          {dayEvents.length > 2 && (
            <p className="text-[10px] text-surface-400 px-1.5">+{dayEvents.length - 2} more</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl dark:bg-surface-900/50 bg-white border dark:border-white/5 border-surface-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-white/5 transition">
          <ChevronLeft className="w-5 h-5 dark:text-surface-300 text-surface-600" />
        </button>
        <h3 className="text-lg font-bold dark:text-white text-surface-900">{monthName}</h3>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-white/5 transition">
          <ChevronRight className="w-5 h-5 dark:text-surface-300 text-surface-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-xs font-semibold dark:text-surface-400 text-surface-500 py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>
    </div>
  );
}
