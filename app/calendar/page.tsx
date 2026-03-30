import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Mock data (same as Dashboard)
const mockMeetings = [
  { id: '1', title: 'Q3 Product Strategy Sync', date: '2026-04-05', status: 'scheduled' as const },
  { id: '2', title: 'Weekly UI/UX Review', date: '2026-04-12', status: 'completed' as const },
  { id: '3', title: 'External Vendor Kickoff', date: '2026-04-18', status: 'conflict' as const },
  { id: '4', title: 'Monthly Analytics Deep Dive', date: '2026-04-20', status: 'cancelled' as const },
];

// Helper to generate a 35-day grid (5 weeks) for April 2026 starting on Wednesday 
// (Just a mock generation for the UI)
const generateMockGrid = () => {
  const days = [];
  // April 1, 2026 is Wednesday
  for (let i = 29; i <= 31; i++) days.push({ date: i, isCurrentMonth: false, fullDate: `2026-03-${i}` }); // March tail
  for (let i = 1; i <= 30; i++) days.push({ date: i, isCurrentMonth: true, fullDate: `2026-04-${i.toString().padStart(2, '0')}` }); // April
  for (let i = 1; i <= 2; i++) days.push({ date: i, isCurrentMonth: false, fullDate: `2026-05-0${i}` }); // May start
  return days;
};

export default function CalendarPage() {
  const days = generateMockGrid();
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
            <span className="px-4 py-2 text-sm font-semibold text-text-primary font-literata">April 2026</span>
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
            const dayMeetings = mockMeetings.filter(m => m.date === day.fullDate);
            
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
                  day.fullDate === '2026-04-15' ? "bg-primary text-white" : "text-text-secondary" // Mock "today"
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
                        meeting.status === 'conflict' && "bg-status-amber-bg text-status-amber border-status-amber/20",
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
