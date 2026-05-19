'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { DoorOpen, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buildDashboardHref, type DashboardParams } from './url';

export interface RoomFilterOption {
  id: string;
  name: string;
}

export function RoomFilter({
  current,
  rooms,
  selectedId,
}: {
  current: DashboardParams;
  rooms: RoomFilterOption[];
  selectedId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const selected = useMemo(
    () => (selectedId ? rooms.find((r) => r.id === selectedId) ?? null : null),
    [rooms, selectedId]
  );

  const clearHref = buildDashboardHref(current, { room: undefined, page: 1 });

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
        <DoorOpen className="h-4 w-4 text-text-secondary" />
        <span className="text-sm font-light text-text-secondary">
          {selected ? selected.name : 'Any Room'}
        </span>
        {selected && (
          <Link
            href={clearHref}
            onClick={(e) => e.stopPropagation()}
            className="ml-1 -mr-1 p-0.5 rounded-full hover:bg-board"
            aria-label="Clear room filter"
          >
            <X className="h-3.5 w-3.5 text-text-tertiary" />
          </Link>
        )}
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-border/30 z-20 overflow-hidden">
          <div className="max-h-72 overflow-y-auto py-1">
            <Link
              href={clearHref}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-2 text-sm font-light hover:bg-board/50',
                !selectedId ? 'text-text-primary font-bold' : 'text-text-secondary'
              )}
            >
              Any Room
            </Link>
            {rooms.length === 0 ? (
              <div className="px-4 py-3 text-xs text-text-tertiary text-center">No rooms</div>
            ) : (
              rooms.map((r) => {
                const href = buildDashboardHref(current, { room: r.id, page: 1 });
                const isSel = r.id === selectedId;
                return (
                  <Link
                    key={r.id}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2 text-sm font-light hover:bg-board/50',
                      isSel ? 'text-text-primary font-bold bg-primary/5' : 'text-text-secondary'
                    )}
                  >
                    {r.name}
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
