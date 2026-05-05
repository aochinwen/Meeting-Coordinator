'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  rangeLabel,
  shiftAnchor,
  todayStr,
  type CalendarMode,
} from '@/lib/calendar';
import { buildDashboardHref, type DashboardParams } from './url';
import { CalendarHoverProvider } from './CalendarHoverContext';

interface CalendarContainerProps {
  children: React.ReactNode;
  current: DashboardParams;
  mode: CalendarMode;
  anchor: string;
}

export function CalendarContainer({
  children,
  current,
  mode,
  anchor,
}: CalendarContainerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = (updates: Partial<DashboardParams>) => {
    const href = buildDashboardHref(current, updates);
    startTransition(() => {
      router.push(href, { scroll: false });
    });
  };

  const segBtn = 'px-3 py-1.5 rounded-xl text-sm font-light transition-colors';

  return (
    <div className="relative bg-white rounded-[24px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] border border-[rgba(196,200,188,0.2)] p-4 sm:p-6 space-y-5">
      {/* Header with navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate({ anchor: shiftAnchor(mode, anchor, -1) })}
            disabled={isPending}
            aria-label="Previous"
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-board border border-border hover:bg-white transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4 text-text-secondary" />
          </button>
          <button
            onClick={() => navigate({ anchor: shiftAnchor(mode, anchor, 1) })}
            disabled={isPending}
            aria-label="Next"
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-board border border-border hover:bg-white transition-colors disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4 text-text-secondary" />
          </button>
          <button
            onClick={() => navigate({ anchor: todayStr() })}
            disabled={isPending}
            className="px-3 h-9 flex items-center rounded-xl bg-board border border-border hover:bg-white text-sm font-light text-text-secondary transition-colors disabled:opacity-50"
          >
            Today
          </button>
          <h2 className="ml-2 text-lg sm:text-xl font-bold text-text-primary font-literata">
            {rangeLabel(mode, anchor)}
          </h2>
        </div>
        <div className="bg-board border border-border rounded-2xl p-1 inline-flex self-start sm:self-auto">
          <button
            onClick={() => navigate({ calView: 'month' })}
            disabled={isPending}
            aria-pressed={mode === 'month'}
            className={cn(
              segBtn,
              mode === 'month'
                ? 'bg-white text-text-primary shadow-sm'
                : 'text-text-secondary hover:bg-white/60',
              isPending && 'opacity-50 cursor-not-allowed'
            )}
          >
            Month
          </button>
          <button
            onClick={() => navigate({ calView: 'week' })}
            disabled={isPending}
            aria-pressed={mode === 'week'}
            className={cn(
              segBtn,
              mode === 'week'
                ? 'bg-white text-text-primary shadow-sm'
                : 'text-text-secondary hover:bg-white/60',
              isPending && 'opacity-50 cursor-not-allowed'
            )}
          >
            Week
          </button>
        </div>
      </div>

      {/* Calendar content */}
      <div className={cn('transition-opacity', isPending && 'opacity-50')}>
        <CalendarHoverProvider>
          {children}
        </CalendarHoverProvider>
      </div>

      {/* Full calendar loading scrim */}
      {isPending && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-[24px]">
          <div className="flex flex-col items-center gap-3 px-6 py-4 bg-white rounded-2xl shadow-xl border border-border">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <span className="text-sm font-light text-text-secondary">Updating calendar...</span>
          </div>
        </div>
      )}
    </div>
  );
}
