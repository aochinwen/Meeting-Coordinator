'use client';

import { useState, useRef, useEffect } from 'react';
import { Filter, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';

interface FilterDropdownProps {
  search: string;
  filter: string;
  sortBy: string;
  sortOrder: string;
  view?: string;
  calView?: string;
  anchor?: string;
  types?: string;
  person?: string;
}

function extraQs(view?: string, calView?: string, anchor?: string, types?: string, person?: string) {
  const usp = new URLSearchParams();
  if (view) usp.set('view', view);
  if (calView) usp.set('calView', calView);
  if (anchor) usp.set('anchor', anchor);
  if (types) usp.set('types', types);
  if (person) usp.set('person', person);
  const s = usp.toString();
  return s ? `&${s}` : '';
}

export function FilterDropdown({ search, filter, sortBy, sortOrder, view, calView, anchor, types, person }: FilterDropdownProps) {
  const extra = extraQs(view, calView, anchor, types, person);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:w-auto bg-board border border-border rounded-2xl px-4 py-3 flex items-center justify-center gap-2 hover:bg-white transition-colors"
      >
        <Filter className="h-4 w-4 text-text-secondary" />
        <span className="text-sm font-light text-text-secondary">Filter</span>
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-border/30 py-2 z-20">
          <Link
            href={`/?search=${encodeURIComponent(search)}&filter=month&sortBy=${sortBy}&sortOrder=${sortOrder}${extra}`}
            onClick={() => setIsOpen(false)}
            className={`block px-4 py-2 text-sm font-light hover:bg-board/50 ${filter === 'month' || filter === '' ? 'text-primary font-medium' : 'text-text-secondary'}`}
          >
            Next 30 days (default)
          </Link>
          <Link
            href={`/?search=${encodeURIComponent(search)}&filter=today&sortBy=${sortBy}&sortOrder=${sortOrder}${extra}`}
            onClick={() => setIsOpen(false)}
            className={`block px-4 py-2 text-sm font-light hover:bg-board/50 ${filter === 'today' ? 'text-primary font-medium' : 'text-text-secondary'}`}
          >
            Today only
          </Link>
          <Link
            href={`/?search=${encodeURIComponent(search)}&filter=week&sortBy=${sortBy}&sortOrder=${sortOrder}${extra}`}
            onClick={() => setIsOpen(false)}
            className={`block px-4 py-2 text-sm font-light hover:bg-board/50 ${filter === 'week' ? 'text-primary font-medium' : 'text-text-secondary'}`}
          >
            This week
          </Link>
          <Link
            href={`/?search=${encodeURIComponent(search)}&filter=all&sortBy=${sortBy}&sortOrder=${sortOrder}${extra}`}
            onClick={() => setIsOpen(false)}
            className={`block px-4 py-2 text-sm font-light hover:bg-board/50 ${filter === 'all' ? 'text-primary font-medium' : 'text-text-secondary'}`}
          >
            All meetings
          </Link>
        </div>
      )}
    </div>
  );
}

export function SortDropdown({ search, filter, sortBy, sortOrder, view, calView, anchor, types, person }: FilterDropdownProps) {
  const extra = extraQs(view, calView, anchor, types, person);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:w-auto bg-board border border-border rounded-2xl px-4 py-3 flex items-center justify-center gap-2 hover:bg-white transition-colors"
      >
        <ArrowUpDown className="h-4 w-4 text-text-secondary" />
        <span className="text-sm font-light text-text-secondary">Sort</span>
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-border/30 py-2 z-20">
          <Link
            href={`/?search=${encodeURIComponent(search)}&filter=${filter}&sortBy=date&sortOrder=asc${extra}`}
            onClick={() => setIsOpen(false)}
            className={`block px-4 py-2 text-sm font-light hover:bg-board/50 ${sortBy === 'date' && sortOrder === 'asc' ? 'text-primary font-medium' : 'text-text-secondary'}`}
          >
            Date (earliest first)
          </Link>
          <Link
            href={`/?search=${encodeURIComponent(search)}&filter=${filter}&sortBy=date&sortOrder=desc${extra}`}
            onClick={() => setIsOpen(false)}
            className={`block px-4 py-2 text-sm font-light hover:bg-board/50 ${sortBy === 'date' && sortOrder === 'desc' ? 'text-primary font-medium' : 'text-text-secondary'}`}
          >
            Date (latest first)
          </Link>
          <Link
            href={`/?search=${encodeURIComponent(search)}&filter=${filter}&sortBy=title&sortOrder=asc${extra}`}
            onClick={() => setIsOpen(false)}
            className={`block px-4 py-2 text-sm font-light hover:bg-board/50 ${sortBy === 'title' && sortOrder === 'asc' ? 'text-primary font-medium' : 'text-text-secondary'}`}
          >
            Title (A-Z)
          </Link>
          <Link
            href={`/?search=${encodeURIComponent(search)}&filter=${filter}&sortBy=title&sortOrder=desc${extra}`}
            onClick={() => setIsOpen(false)}
            className={`block px-4 py-2 text-sm font-light hover:bg-board/50 ${sortBy === 'title' && sortOrder === 'desc' ? 'text-primary font-medium' : 'text-text-secondary'}`}
          >
            Title (Z-A)
          </Link>
        </div>
      )}
    </div>
  );
}
