// Calendar helpers for the dashboard calendar view.
// All dates handled as 'YYYY-MM-DD' local-date strings to match the meetings.date column.

import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';

// Mon-start week per product decision.
export const WEEK_STARTS_ON: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1;

export type CalendarMode = 'month' | 'week';
export type DashboardView = 'list' | 'calendar';
export type DashboardType = 'meetings' | 'tasks';

export function toDateStr(d: Date): string {
  // Use local components to avoid TZ shifts off the YYYY-MM-DD column values.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromDateStr(s: string): Date {
  // Parse as local midnight to match toDateStr.
  return new Date(`${s}T00:00:00`);
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function clampAnchor(anchor: string | undefined): string {
  if (!anchor) return todayStr();
  const d = parseISO(anchor);
  if (isNaN(d.getTime())) return todayStr();
  return toDateStr(d);
}

/** Returns the visible date range for the given calendar mode and anchor. */
export function visibleRange(mode: CalendarMode, anchor: string): { start: string; end: string } {
  const a = fromDateStr(anchor);
  if (mode === 'week') {
    return {
      start: toDateStr(startOfWeek(a, { weekStartsOn: WEEK_STARTS_ON })),
      end: toDateStr(endOfWeek(a, { weekStartsOn: WEEK_STARTS_ON })),
    };
  }
  // month: pad to full weeks (Mon-start)
  const monthStart = startOfMonth(a);
  const monthEnd = endOfMonth(a);
  return {
    start: toDateStr(startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON })),
    end: toDateStr(endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON })),
  };
}

/** Title shown in the calendar header (e.g. "April 2026" or "Apr 20 – 26, 2026"). */
export function rangeLabel(mode: CalendarMode, anchor: string): string {
  const a = fromDateStr(anchor);
  if (mode === 'month') {
    return format(a, 'MMMM yyyy');
  }
  const ws = startOfWeek(a, { weekStartsOn: WEEK_STARTS_ON });
  const we = endOfWeek(a, { weekStartsOn: WEEK_STARTS_ON });
  if (ws.getMonth() === we.getMonth()) {
    return `${format(ws, 'MMM d')} – ${format(we, 'd, yyyy')}`;
  }
  return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
}

/** Move anchor by one unit (week or month) forward/back. */
export function shiftAnchor(mode: CalendarMode, anchor: string, dir: -1 | 1): string {
  const a = fromDateStr(anchor);
  if (mode === 'week') {
    return toDateStr(dir === 1 ? addDays(a, 7) : subDays(a, 7));
  }
  return toDateStr(dir === 1 ? addMonths(a, 1) : subMonths(a, 1));
}

/** Build the list of days (inclusive) covered by [start, end]. */
export function daysInRange(start: string, end: string): string[] {
  const out: string[] = [];
  let d = fromDateStr(start);
  const last = fromDateStr(end);
  while (d.getTime() <= last.getTime()) {
    out.push(toDateStr(d));
    d = addDays(d, 1);
  }
  return out;
}

/** Compute a task's effective due date string from its meeting + due_days_before. */
export function computeTaskDueDate(meetingDate: string, dueDaysBefore: number | null | undefined): string {
  if (dueDaysBefore == null) return meetingDate;
  const md = fromDateStr(meetingDate);
  return toDateStr(subDays(md, dueDaysBefore));
}

export type CalendarEventBase = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
};

export type MeetingEvent = CalendarEventBase & {
  kind: 'meeting';
  startTime: string | null;
  endTime: string | null;
  status: string | null;
};

export type TaskEvent = CalendarEventBase & {
  kind: 'task';
  meetingId: string;
  meetingTitle: string;
  isCompleted: boolean;
};

export type CalendarEvent = MeetingEvent | TaskEvent;

/** Group events by their date string. Order within a day: meetings (by start_time), then tasks. */
export function groupByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const arr = map.get(e.date) ?? [];
    arr.push(e);
    map.set(e.date, arr);
  }
  for (const [, arr] of map) {
    arr.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'meeting' ? -1 : 1;
      if (a.kind === 'meeting' && b.kind === 'meeting') {
        return (a.startTime ?? '').localeCompare(b.startTime ?? '');
      }
      return a.title.localeCompare(b.title);
    });
  }
  return map;
}
