'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

const DEFAULT_RANKS = ['Executive', 'Manager', 'Associate', 'Director', 'Analyst', 'Staff'];

interface RankComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  seedRanks?: string[];
  placeholder?: string;
  required?: boolean;
  hasError?: boolean;
}

export function RankCombobox({
  id,
  value,
  onChange,
  seedRanks = [],
  placeholder = 'Select or type a role',
  required,
  hasError = false,
}: RankComboboxProps) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allRanks = [...new Set([...DEFAULT_RANKS, ...seedRanks])];

  const hasExactMatch = allRanks.some(
    (r) => r.toLowerCase() === value.trim().toLowerCase()
  );

  // When the current value is an exact match show all options (browsing);
  // otherwise filter to matches of what's been typed.
  const filtered = hasExactMatch
    ? allRanks
    : allRanks.filter((r) => r.toLowerCase().includes(value.toLowerCase()));

  const isCustomValue = value.trim() !== '' && !hasExactMatch;

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      const target = e.target as Node;
      const inAnchor = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inAnchor && !inDropdown) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  function openDropdown() {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
    setOpen(true);
  }

  function select(role: string) {
    onChange(role);
    setOpen(false);
  }

  const showDropdown = open && filtered.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`w-full px-4 py-3 bg-surface border rounded-2xl text-text-primary focus-within:ring-2 transition-all flex items-center gap-2 ${
          hasError
            ? 'border-red-400 focus-within:ring-red-200'
            : 'border-border/50 focus-within:ring-primary/20'
        }`}
        onClick={() => { openDropdown(); inputRef.current?.focus(); }}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className="flex-1 bg-transparent outline-none font-light text-text-primary placeholder:text-text-secondary/50"
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => { e.preventDefault(); if (open) { setOpen(false); } else { openDropdown(); } inputRef.current?.focus(); }}
        >
          <ChevronDown className="h-4 w-4 text-text-secondary" />
        </button>
      </div>

      {isCustomValue && (
        <p className="mt-1 text-xs text-text-secondary font-light px-1">
          New role &quot;{value.trim()}&quot; will be saved with this member.
        </p>
      )}

      {showDropdown && typeof document !== 'undefined' && createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="bg-white border border-border/40 rounded-2xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((r) => (
            <button
              key={r}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); select(r); }}
              className="w-full text-left px-4 py-3 text-text-primary hover:bg-surface transition-colors font-light first:rounded-t-2xl last:rounded-b-2xl"
            >
              {r}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
