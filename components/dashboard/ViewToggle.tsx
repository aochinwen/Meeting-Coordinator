import Link from 'next/link';
import { CalendarDays, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildDashboardHref, type DashboardParams } from './url';

export function ViewToggle({
  current,
  view,
}: {
  current: DashboardParams;
  view: 'list' | 'calendar';
}) {
  const baseBtn =
    'flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-light transition-colors';
  return (
    <div className="bg-board border border-border rounded-2xl p-1 flex items-center gap-1 w-full sm:w-auto">
      <Link
        href={buildDashboardHref(current, { view: 'list', page: 1 })}
        className={cn(
          baseBtn,
          'flex-1',
          view === 'list'
            ? 'bg-white text-text-primary shadow-sm'
            : 'text-text-secondary hover:bg-white/60',
        )}
        aria-pressed={view === 'list'}
      >
        <List className="h-4 w-4" />
        List
      </Link>
      <Link
        href={buildDashboardHref(current, { view: 'calendar' })}
        className={cn(
          baseBtn,
          'flex-1',
          view === 'calendar'
            ? 'bg-white text-text-primary shadow-sm'
            : 'text-text-secondary hover:bg-white/60',
        )}
        aria-pressed={view === 'calendar'}
      >
        <CalendarDays className="h-4 w-4" />
        Calendar
      </Link>
    </div>
  );
}
