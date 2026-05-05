import Link from 'next/link';
import { Square, CheckSquare, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fromDateStr, todayStr } from '@/lib/calendar';
import { format } from 'date-fns';

export type TaskListItem = {
  id: string;
  title: string;
  isCompleted: boolean;
  dueDate: string;
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
};

export function TasksList({ tasks }: { tasks: TaskListItem[] }) {
  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-[24px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] border border-[rgba(196,200,188,0.2)] p-8 text-center text-text-tertiary">
        No tasks in this date range.
      </div>
    );
  }
  const today = todayStr();
  return (
    <>
      {/* Desktop / tablet */}
      <div className="bg-white rounded-[24px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] border border-[rgba(196,200,188,0.2)] overflow-hidden hidden md:block">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-[rgba(234,230,222,0.5)] border-b border-[rgba(196,200,188,0.2)] text-xs tracking-[1.2px] uppercase text-text-secondary font-light">
          <div className="col-span-6">Task</div>
          <div className="col-span-3">Due</div>
          <div className="col-span-3 text-right">Status</div>
        </div>
        <div className="divide-y divide-[rgba(196,200,188,0.1)]">
          {tasks.map((t) => {
            const isOverdue = !t.isCompleted && t.dueDate < today;
            const isDueToday = t.dueDate === today;
            const Icon = t.isCompleted ? CheckSquare : Square;
            return (
              <Link
                key={t.id}
                href={`/meetings/${t.meetingId}?task=${t.id}`}
                className="grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-board/50 transition-colors"
              >
                <div className="col-span-6 flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-amber/30 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-status-amber" />
                  </div>
                  <div className="min-w-0">
                    <div
                      className={cn(
                        'text-base font-medium text-text-primary leading-tight font-literata truncate',
                        t.isCompleted && 'line-through text-text-tertiary',
                      )}
                    >
                      {t.title}
                    </div>
                    <div className="mt-1 text-xs text-text-tertiary truncate flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span className="truncate">From: {t.meetingTitle}</span>
                    </div>
                  </div>
                </div>
                <div className="col-span-3 flex flex-col gap-0.5">
                  <span
                    className={cn(
                      'text-sm font-light',
                      isOverdue ? 'text-coral-text font-medium' : 'text-text-primary',
                    )}
                  >
                    {format(fromDateStr(t.dueDate), 'd MMM yyyy')}
                  </span>
                  {(isOverdue || isDueToday) && (
                    <span
                      className={cn(
                        'text-xs',
                        isOverdue ? 'text-coral-text' : 'text-status-amber',
                      )}
                    >
                      {isOverdue ? 'Overdue' : 'Due today'}
                    </span>
                  )}
                </div>
                <div className="col-span-3 flex justify-end">
                  {t.isCompleted ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-status-green-bg text-status-green text-xs font-light">
                      <CheckSquare className="h-3 w-3" />
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-status-grey-bg border border-border/30 text-text-secondary text-xs font-light">
                      Pending
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden flex flex-col gap-3">
        {tasks.map((t) => {
          const isOverdue = !t.isCompleted && t.dueDate < today;
          const isDueToday = t.dueDate === today;
          const Icon = t.isCompleted ? CheckSquare : Square;
          return (
            <Link
              key={t.id}
              href={`/meetings/${t.meetingId}?task=${t.id}`}
              className="bg-white border border-border/30 rounded-2xl p-4 flex items-start gap-3 hover:bg-board/30 transition-colors"
            >
              <div className="h-9 w-9 rounded-full bg-amber/30 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-status-amber" />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    'text-base font-medium text-text-primary leading-tight font-literata',
                    t.isCompleted && 'line-through text-text-tertiary',
                  )}
                >
                  {t.title}
                </div>
                <div className="mt-1 text-xs text-text-tertiary truncate">
                  From: {t.meetingTitle}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'text-xs font-light',
                      isOverdue ? 'text-coral-text font-medium' : 'text-text-secondary',
                    )}
                  >
                    {format(fromDateStr(t.dueDate), 'd MMM yyyy')}
                    {isOverdue && ' · Overdue'}
                    {!isOverdue && isDueToday && ' · Due today'}
                  </span>
                  {t.isCompleted ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-status-green-bg text-status-green text-[11px] font-light">
                      Done
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-status-grey-bg border border-border/30 text-text-secondary text-[11px] font-light">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
