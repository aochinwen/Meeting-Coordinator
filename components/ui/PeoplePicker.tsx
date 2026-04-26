'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PersonOption {
  id: string;
  name: string;
  division?: string | null;
  rank?: string | null;
}

interface PeoplePickerProps {
  people: PersonOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  // When true the picker collapses to inline chips + a "+ add" button.
  compact?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function PeoplePicker({
  people,
  value,
  onChange,
  multiple = true,
  placeholder = 'Add people...',
  compact = false,
}: PeoplePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ left: number; top: number; width: number } | null>(null);

  // Avoid SSR portal access.
  useEffect(() => setMounted(true), []);

  // Close on outside click (covers both trigger and portal-rendered dropdown).
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const inTrigger = containerRef.current?.contains(e.target as Node);
      const inDropdown = dropdownRef.current?.contains(e.target as Node);
      if (!inTrigger && !inDropdown) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Track trigger position for the portal-rendered dropdown.
  useLayoutEffect(() => {
    if (!open) return;
    function update() {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setCoords({ left: r.left, top: r.bottom + 4, width: r.width });
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  const selected = useMemo(
    () => value.map((id) => people.find((p) => p.id === id)).filter(Boolean) as PersonOption[],
    [value, people]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? people.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.division ?? '').toLowerCase().includes(q) ||
            (p.rank ?? '').toLowerCase().includes(q)
        )
      : people;
    return list.slice(0, 50);
  }, [people, query]);

  function toggle(id: string) {
    if (!multiple) {
      onChange(value.includes(id) ? [] : [id]);
      setOpen(false);
      return;
    }
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  }

  function remove(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger / chips */}
      <div
        className={cn(
          'min-h-[40px] w-full bg-surface border border-border rounded-2xl flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 cursor-text focus-within:ring-2 focus-within:ring-primary/20',
          compact && 'min-h-[32px] py-1 px-2'
        )}
        onClick={() => setOpen(true)}
      >
        {selected.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1.5 bg-mint text-status-green text-xs font-bold px-2 py-1 rounded-full"
          >
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-status-green text-white text-[9px]">
              {getInitials(p.name)}
            </span>
            {p.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(p.id);
              }}
              className="hover:bg-status-green/20 rounded-full p-0.5"
              aria-label={`Remove ${p.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-sm py-0.5"
        />
        <ChevronDown className="h-4 w-4 text-text-tertiary shrink-0" />
      </div>

      {/* Dropdown rendered via portal so it escapes overflow-hidden ancestors. */}
      {open && mounted && coords &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              left: coords.left,
              top: coords.top,
              width: coords.width,
              zIndex: 9999,
            }}
            className="bg-white border border-border rounded-2xl shadow-lg max-h-64 overflow-y-auto"
          >
            <div className="px-3 py-2 border-b border-border/30 flex items-center gap-2 sticky top-0 bg-white">
              <Search className="h-3.5 w-3.5 text-text-tertiary" />
              <span className="text-xs text-text-tertiary">
                {selected.length} selected
              </span>
            </div>
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-text-tertiary">No matches</div>
            ) : (
              filtered.map((p) => {
                const isSel = value.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface transition-colors',
                      isSel && 'bg-primary/5'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold',
                        isSel ? 'bg-primary text-white' : 'bg-sage text-white'
                      )}
                    >
                      {isSel ? <Check className="h-3 w-3" /> : getInitials(p.name)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-text-primary truncate">{p.name}</div>
                      {(p.rank || p.division) && (
                        <div className="text-[10px] text-text-tertiary truncate">
                          {[p.rank, p.division].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
