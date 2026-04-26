'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { UserCircle2, Search, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buildDashboardHref, type DashboardParams } from './url';

export interface PersonFilterOption {
  id: string;
  name: string;
}

export function PersonFilter({
  current,
  people,
  selectedId,
}: {
  current: DashboardParams;
  people: PersonFilterOption[];
  selectedId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const selected = useMemo(
    () => (selectedId ? people.find((p) => p.id === selectedId) ?? null : null),
    [people, selectedId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;
    return list.slice(0, 50);
  }, [people, query]);

  const clearHref = buildDashboardHref(current, { person: undefined, page: 1 });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full sm:w-auto bg-board border border-border rounded-2xl px-4 py-3 flex items-center justify-center gap-2 hover:bg-white transition-colors',
          selected && 'border-primary/40 bg-primary/5'
        )}
      >
        <UserCircle2 className="h-4 w-4 text-text-secondary" />
        <span className="text-sm font-light text-text-secondary">
          {selected ? selected.name : 'Anyone'}
        </span>
        {selected && (
          <Link
            href={clearHref}
            onClick={(e) => e.stopPropagation()}
            className="ml-1 -mr-1 p-0.5 rounded-full hover:bg-board"
            aria-label="Clear person filter"
          >
            <X className="h-3.5 w-3.5 text-text-tertiary" />
          </Link>
        )}
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-lg border border-border/30 z-20 overflow-hidden">
          <div className="p-2 border-b border-border/20 flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-text-tertiary ml-2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people..."
              className="flex-1 bg-transparent border-none outline-none text-sm py-1.5"
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            <Link
              href={clearHref}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-2 text-sm font-light hover:bg-board/50',
                !selectedId ? 'text-text-primary font-bold' : 'text-text-secondary'
              )}
            >
              Anyone
            </Link>
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-xs text-text-tertiary text-center">No matches</div>
            ) : (
              filtered.map((p) => {
                const href = buildDashboardHref(current, { person: p.id, page: 1 });
                const isSel = p.id === selectedId;
                return (
                  <Link
                    key={p.id}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2 text-sm font-light hover:bg-board/50',
                      isSel ? 'text-text-primary font-bold bg-primary/5' : 'text-text-secondary'
                    )}
                  >
                    {p.name}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
