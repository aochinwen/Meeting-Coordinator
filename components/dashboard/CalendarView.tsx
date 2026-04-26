import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  daysInRange,
  fromDateStr,
  groupByDay,
  todayStr,
  visibleRange,
  type CalendarEvent,
  type CalendarMode,
} from '@/lib/calendar';
import { CalendarHeader } from './CalendarHeader';
import { EventChip } from './EventChip';
import { buildDashboardHref, type DashboardParams } from './url';

const WEEKDAY_LABELS_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarView({
  current,
  mode,
  anchor,
  events,
}: {
  current: DashboardParams;
  mode: CalendarMode;
  anchor: string;
  events: CalendarEvent[];
}) {
  return (
    <div className="bg-white rounded-[24px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] border border-[rgba(196,200,188,0.2)] p-4 sm:p-6 space-y-5">
      <CalendarHeader current={current} mode={mode} anchor={anchor} />
      {mode === 'month' ? (
        <MonthGrid current={current} anchor={anchor} events={events} />
      ) : (
        <WeekView anchor={anchor} events={events} />
      )}
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-text-tertiary font-light pt-2 border-t border-border/20">
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded bg-status-green-bg" />
        Meetings
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded bg-amber/60" />
        Tasks (due date)
      </div>
    </div>
  );
}

/* ---------------- Month grid ---------------- */

function MonthGrid({
  current,
  anchor,
  events,
}: {
  current: DashboardParams;
  anchor: string;
  events: CalendarEvent[];
}) {
  const range = visibleRange('month', anchor);
  const days = daysInRange(range.start, range.end);
  const grouped = groupByDay(events);
  const today = todayStr();
  const anchorMonth = fromDateStr(anchor).getMonth();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-7 border-b border-border/30">
          {WEEKDAY_LABELS_MON_FIRST.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-[11px] tracking-[1.2px] uppercase text-text-tertiary font-light"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 grid-flow-row auto-rows-fr">
          {days.map((d) => {
            const dayEvents = grouped.get(d) ?? [];
            const date = fromDateStr(d);
            const inMonth = date.getMonth() === anchorMonth;
            const isToday = d === today;
            const visible = dayEvents.slice(0, 3);
            const overflow = dayEvents.length - visible.length;
            const weekHref = buildDashboardHref(current, {
              calView: 'week',
              anchor: d,
            });
            return (
              <div
                key={d}
                className={cn(
                  'min-h-[112px] sm:min-h-[120px] border-b border-r border-border/20 p-2 flex flex-col gap-1',
                  !inMonth && 'bg-board/30',
                )}
              >
                <Link
                  href={weekHref}
                  className={cn(
                    'self-start text-xs font-medium leading-none rounded-full px-2 py-1 transition-colors hover:bg-board',
                    isToday
                      ? 'bg-primary text-white hover:bg-primary'
                      : inMonth
                      ? 'text-text-primary'
                      : 'text-text-tertiary',
                  )}
                >
                  {format(date, 'd')}
                </Link>
                <div className="flex flex-col gap-1 min-w-0">
                  {visible.map((ev) => (
                    <EventChip key={`${ev.kind}-${ev.id}`} event={ev} compact />
                  ))}
                  {overflow > 0 && (
                    <Link
                      href={weekHref}
                      className="text-[11px] font-light text-text-secondary hover:text-text-primary px-1.5"
                    >
                      +{overflow} more
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Week view ---------------- */

function WeekView({
  anchor,
  events,
}: {
  anchor: string;
  events: CalendarEvent[];
}) {
  const range = visibleRange('week', anchor);
  const days = daysInRange(range.start, range.end);
  const grouped = groupByDay(events);
  const today = todayStr();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[840px] grid grid-cols-7 gap-2">
        {days.map((d) => {
          const dayEvents = grouped.get(d) ?? [];
          const tasks = dayEvents.filter((e) => e.kind === 'task');
          const meetings = dayEvents.filter((e) => e.kind === 'meeting');
          const date = fromDateStr(d);
          const isToday = d === today;
          return (
            <div
              key={d}
              className="bg-board/30 rounded-2xl p-3 flex flex-col gap-3 min-h-[260px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] tracking-[1.2px] uppercase text-text-tertiary font-light">
                  {format(date, 'EEE')}
                </span>
                <span
                  className={cn(
                    'text-sm font-medium leading-none rounded-full px-2 py-1',
                    isToday ? 'bg-primary text-white' : 'text-text-primary',
                  )}
                >
                  {format(date, 'd')}
                </span>
              </div>

              {/* All-day lane: tasks */}
              {tasks.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-light">
                    All day
                  </span>
                  {tasks.map((ev) => (
                    <EventChip key={`task-${ev.id}`} event={ev} />
                  ))}
                </div>
              )}

              {/* Meetings ordered by start_time */}
              {meetings.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {tasks.length > 0 && (
                    <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-light">
                      Meetings
                    </span>
                  )}
                  {meetings.map((ev) => (
                    <EventChip key={`meeting-${ev.id}`} event={ev} />
                  ))}
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-xs text-text-tertiary font-light italic mt-2">
                  Nothing scheduled
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
