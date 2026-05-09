'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export function LoadingScrim({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[100] flex items-center justify-center bg-white/40 backdrop-blur-[2px] transition-opacity duration-300",
      isLoading ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      <div className="bg-white p-6 rounded-3xl shadow-xl flex flex-col items-center gap-4 border border-border/20">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm font-medium text-text-primary">Searching...</p>
      </div>
    </div>
  );
}
