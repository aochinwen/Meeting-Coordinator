import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  rangeLabel,
  shiftAnchor,
  todayStr,
  type CalendarMode,
} from '@/lib/calendar';
import { buildDashboardHref, type DashboardParams } from './url';

export function CalendarHeader({
  current,
  mode,
  anchor,
}: {
  current: DashboardParams;
  mode: CalendarMode;
  anchor: string;
}) {
  const prev = buildDashboardHref(current, { anchor: shiftAnchor(mode, anchor, -1) });
  const next = buildDashboardHref(current, { anchor: shiftAnchor(mode, anchor, 1) });
  const today = buildDashboardHref(current, { anchor: todayStr() });
  const monthHref = buildDashboardHref(current, { calView: 'month' });
  const weekHref = buildDashboardHref(current, { calView: 'week' });

  const segBtn =
    'px-3 py-1.5 rounded-xl text-sm font-light transition-colors';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-2">
        <Link
          href={prev}
          aria-label="Previous"
          className="h-9 w-9 flex items-center justify-center rounded-xl bg-board border border-border hover:bg-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-text-secondary" />
        </Link>
        <Link
          href={next}
          aria-label="Next"
          className="h-9 w-9 flex items-center justify-center rounded-xl bg-board border border-border hover:bg-white transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-text-secondary" />
        </Link>
        <Link
          href={today}
          className="px-3 h-9 flex items-center rounded-xl bg-board border border-border hover:bg-white text-sm font-light text-text-secondary transition-colors"
        >
          Today
        </Link>
        <h2 className="ml-2 text-lg sm:text-xl font-bold text-text-primary font-literata">
          {rangeLabel(mode, anchor)}
        </h2>
      </div>
      <div className="bg-board border border-border rounded-2xl p-1 inline-flex self-start sm:self-auto">
        <Link
          href={monthHref}
          aria-pressed={mode === 'month'}
          className={cn(
            segBtn,
            mode === 'month'
              ? 'bg-white text-text-primary shadow-sm'
              : 'text-text-secondary hover:bg-white/60',
          )}
        >
          Month
        </Link>
        <Link
          href={weekHref}
          aria-pressed={mode === 'week'}
          className={cn(
            segBtn,
            mode === 'week'
              ? 'bg-white text-text-primary shadow-sm'
              : 'text-text-secondary hover:bg-white/60',
          )}
        >
          Week
        </Link>
      </div>
    </div>
  );
}
