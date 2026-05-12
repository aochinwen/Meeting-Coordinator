'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, List, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildDashboardHref, type DashboardParams } from './url';

export function ViewToggle({
  current,
  view,
}: {
  current: DashboardParams;
  view: 'list' | 'calendar';
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleToggle = (newView: 'list' | 'calendar') => {
    if (view === newView) return;
    
    startTransition(() => {
      // Build the href for the target view
      const href = buildDashboardHref(current, newView === 'list' ? { view: 'list', page: 1 } : { view: 'calendar' });
      // Push with scroll: false to avoid page jump
      router.push(href, { scroll: false });
    });
  };

  const baseBtn =
    'flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-light transition-colors cursor-pointer select-none relative';

  return (
    <div className="bg-board border border-border rounded-2xl p-1 flex items-center gap-1 w-fit sm:w-auto relative">
      <button
        type="button"
        onClick={() => handleToggle('list')}
        className={cn(
          baseBtn,
          'flex-1 whitespace-nowrap',
          view === 'list'
            ? 'bg-white text-text-primary shadow-sm ring-1 ring-blue-600/50'
            : 'text-text-secondary hover:bg-white/60',
          isPending ? 'opacity-70 pointer-events-none' : ''
        )}
        aria-pressed={view === 'list'}
        disabled={isPending}
      >
        <List className="h-4 w-4" />
        List
      </button>
      <button
        type="button"
        onClick={() => handleToggle('calendar')}
        className={cn(
          baseBtn,
          'flex-1 whitespace-nowrap',
          view === 'calendar'
            ? 'bg-white text-text-primary shadow-sm ring-1 ring-blue-600/50'
            : 'text-text-secondary hover:bg-white/60',
          isPending ? 'opacity-70 pointer-events-none' : ''
        )}
        aria-pressed={view === 'calendar'}
        disabled={isPending}
      >
        <CalendarDays className="h-4 w-4" />
        Calendar
      </button>
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/40 rounded-2xl z-10">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
