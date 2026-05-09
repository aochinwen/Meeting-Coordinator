'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { buildDashboardHref, type DashboardParams } from './url';

interface SearchFormProps {
  initialValue: string;
  currentParams: DashboardParams;
  onLoadingChange: (loading: boolean) => void;
}

export function SearchForm({ initialValue, currentParams, onLoadingChange }: SearchFormProps) {
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    onLoadingChange(isPending);
  }, [isPending, onLoadingChange]);

  // Sync value with external changes (e.g. back button)
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(() => {
      // Build the new URL with updated search
      const nextParams = { ...currentParams, search: value || undefined, page: undefined };
      const href = buildDashboardHref(nextParams, {});
      router.push(href);
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-1 bg-board rounded-2xl flex items-center px-4 py-3 relative overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all"
    >
      <Search className="h-5 w-5 text-gray-500 shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search meetings, attendees, or topics..."
        className="w-full bg-transparent border-none outline-none pl-3 text-text-secondary placeholder-gray-500 font-light text-base"
      />
      {isPending && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
    </form>
  );
}
