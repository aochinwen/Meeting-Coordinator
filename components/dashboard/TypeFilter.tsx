'use client';

import { useState, useRef, useEffect } from 'react';
import { Layers } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buildDashboardHref, type DashboardParams } from './url';
import { serializeTypes, type SelectedTypes } from './types';

export { parseTypes, type SelectedTypes } from './types';

export function TypeFilter({
  current,
  selected,
}: {
  current: DashboardParams;
  selected: SelectedTypes;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const label =
    selected.meetings && selected.tasks
      ? 'Meetings & Tasks'
      : selected.meetings
      ? 'Meetings only'
      : 'Tasks only';

  // Toggling a checkbox produces a link that flips that one.
  const meetingsHref = buildDashboardHref(current, {
    types: serializeTypes({ meetings: !selected.meetings, tasks: selected.tasks }),
    page: 1,
  });
  const tasksHref = buildDashboardHref(current, {
    types: serializeTypes({ meetings: selected.meetings, tasks: !selected.tasks }),
    page: 1,
  });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:w-auto bg-board border border-border rounded-2xl px-4 py-3 flex items-center justify-center gap-2 hover:bg-white transition-colors"
      >
        <Layers className="h-4 w-4 text-text-secondary" />
        <span className="text-sm font-light text-text-secondary">{label}</span>
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-border/30 py-2 z-20">
          <Link
            href={meetingsHref}
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2 text-sm font-light hover:bg-board/50 text-text-secondary"
          >
            <span
              className={cn(
                'h-4 w-4 rounded border flex items-center justify-center transition-colors',
                selected.meetings
                  ? 'bg-primary border-primary'
                  : 'border-text-tertiary',
              )}
            >
              {selected.meetings && (
                <svg viewBox="0 0 16 16" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            Meetings
          </Link>
          <Link
            href={tasksHref}
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2 text-sm font-light hover:bg-board/50 text-text-secondary"
          >
            <span
              className={cn(
                'h-4 w-4 rounded border flex items-center justify-center transition-colors',
                selected.tasks
                  ? 'bg-status-amber border-status-amber'
                  : 'border-text-tertiary',
              )}
            >
              {selected.tasks && (
                <svg viewBox="0 0 16 16" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            Tasks
          </Link>
        </div>
      )}
    </div>
  );
}
