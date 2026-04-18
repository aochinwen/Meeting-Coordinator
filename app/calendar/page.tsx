import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Dynamic calendar grid generation using current date
const generateCalendarGrid = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  
  const days = [];
  
  // Previous month tail
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = prevMonthLastDay - i;
    const prevMonth = month === 0 ? 12 : month;
    const prevYear = month === 0 ? year - 1 : year;
    days.push({ 
      date, 
      isCurrentMonth: false, 
      fullDate: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}` 
    });
  }
  
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ 
      date: i, 
      isCurrentMonth: true, 
      fullDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}` 
    });
  }
  
  // Next month start (fill to 35 days / 5 weeks)
  const remainingDays = 35 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    const nextMonth = month === 11 ? 1 : month + 2;
    const nextYear = month === 11 ? year + 1 : year;
    days.push({ 
      date: i, 
      isCurrentMonth: false, 
      fullDate: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}` 
    });
  }
  
  return days;
};

export default function CalendarPage() {
  const days = generateCalendarGrid();
  const today = new Date();
  const currentMonthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayStr = today.toISOString().split('T')[0];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="max-w-[960px] mx-auto space-y-8 flex flex-col h-full pb-12">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary font-literata">
            Calendar
          </h1>
          <p className="text-base font-light text-text-secondary">
            Monthly view of your scheduled meetings and tasks.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-1 bg-surface border border-border rounded-full shadow-sm pr-2">
            <button className="p-2 hover:bg-board text-text-secondary rounded-l-full transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="px-4 py-2 text-sm font-semibold text-text-primary font-literata">{currentMonthName}</span>
            <button className="p-2 hover:bg-board text-text-secondary rounded-r-full transition-colors">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <Link
            href="/"
            className="flex items-center justify-center px-6 py-3 bg-white border border-border rounded-full text-base font-light text-text-primary hover:bg-board shadow-sm transition-colors active:scale-95"
          >
            List View
          </Link>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-border overflow-hidden flex flex-col">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-border bg-surface/50">
          {weekDays.map((day) => (
            <div key={day} className="py-4 text-center text-xs font-light text-text-secondary uppercase tracking-[0.1em]">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 flex-1 auto-rows-[minmax(120px,1fr)]">
          {days.map((day, i) => {
            // TODO: Fetch real meetings from Supabase and filter by day.fullDate
            const dayMeetings: Array<{id: string; title: string; status: string}> = [];
            
            return (
              <div 
                key={i} 
                className={cn(
                  "p-2 border-b border-r border-border/50 flex flex-col overflow-hidden transition-colors hover:bg-board/50",
                  !day.isCurrentMonth && "bg-board/30 text-text-tertiary"
                )}
              >
                <span className={cn(
                  "text-sm font-medium p-1 w-8 h-8 flex items-center justify-center rounded-full mb-1",
                  day.fullDate === todayStr ? "bg-primary text-white" : "text-text-secondary"
                )}>
                  {day.date}
                </span>

                <div className="flex-1 overflow-y-auto space-y-1 mt-1">
                  {dayMeetings.map((meeting) => (
                    <div 
                      key={meeting.id} 
                      className={cn(
                        "text-xs px-2 py-1.5 rounded-lg truncate border shadow-sm font-light",
                        meeting.status === 'scheduled' && "bg-status-green-bg text-status-green border-status-green/20",
                        meeting.status === 'completed' && "bg-status-green-bg text-status-green border-status-green/20",
                        meeting.status === 'cancelled' && "bg-status-grey-bg text-text-tertiary border-border line-through opacity-70"
                      )}
                      title={meeting.title}
                    >
                      {meeting.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
