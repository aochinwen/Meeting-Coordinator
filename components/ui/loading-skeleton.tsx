import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-surface',
        className
      )}
    />
  );
}

// Dashboard loading skeleton
export function DashboardSkeleton() {
  return (
    <div className="max-w-[1280px] mx-auto space-y-8 pb-12 h-full flex flex-col pt-8 px-4 sm:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-72 sm:w-80" />
        </div>
        <Skeleton className="h-12 w-36 rounded-full" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-surface border border-border/30 rounded-3xl p-6 flex flex-col justify-between h-[178px]">
            <div className="flex items-start justify-between">
              <Skeleton className="h-11 w-11 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-10 w-12" />
            </div>
          </div>
        ))}
      </div>

      {/* Search/filter skeleton */}
      <div className="bg-status-grey-bg rounded-3xl p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center shrink-0">
        <Skeleton className="h-12 flex-1 rounded-2xl" />
        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
          <Skeleton className="h-12 w-full sm:w-24 rounded-2xl" />
          <Skeleton className="h-12 w-full sm:w-24 rounded-2xl" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-[24px] shadow-sm border border-border overflow-hidden flex-1 flex-col min-h-0 hidden md:flex">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-surface/50 border-b border-border">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-4 col-span-2" />
          ))}
        </div>
        <div className="divide-y divide-border/10">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 px-6 py-6 items-center">
              <div className="col-span-4 flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-4 col-span-2" />
              <Skeleton className="h-8 col-span-2 w-24 rounded-full" />
              <Skeleton className="h-4 col-span-2" />
              <Skeleton className="h-6 col-span-2 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards skeleton */}
      <div className="md:hidden flex flex-col gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white border border-border/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-full" />
              </div>
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row sm:items-center sm:justify-between pt-2 shrink-0">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-2">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-10 rounded-2xl" />
          ))}
          <Skeleton className="h-4 w-20 md:hidden" />
          <div className="hidden md:flex items-center gap-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={`desktop-${i}`} className="h-10 w-10 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Directory page loading skeleton
export function DirectorySkeleton() {
  return (
    <div className="max-w-[1280px] mx-auto pb-12 pt-8 space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:gap-6 sm:flex-row sm:items-end sm:justify-between shrink-0">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-12 w-32 rounded-2xl" />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 shrink-0">
        <Skeleton className="h-12 col-span-1 sm:col-span-2 rounded-[24px]" />
        <Skeleton className="h-12 rounded-[24px] hidden sm:block" />
        <Skeleton className="h-12 rounded-[24px] hidden sm:block" />
      </div>

      {/* Table - Desktop */}
      <div className="bg-white rounded-[24px] shadow-sm overflow-hidden hidden md:block">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-surface border-b border-border/30">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-4" />
          ))}
        </div>
        <div className="divide-y divide-border/20">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
              <div className="col-span-3 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-4 col-span-3" />
              <Skeleton className="h-4 col-span-3" />
              <Skeleton className="h-6 col-span-1 w-20 rounded-full" />
              <div className="col-span-2 flex justify-end gap-1">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cards - Mobile */}
      <div className="md:hidden flex flex-col gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white border border-border/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
            <div className="flex justify-end gap-1 pt-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 shrink-0">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-[24px] p-6 flex flex-col gap-4 border">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-6 w-6" />
            </div>
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Meeting detail loading skeleton
export function MeetingDetailSkeleton() {
  return (
    <div className="max-w-[1280px] mx-auto pb-24 flex flex-col pt-8 space-y-8 px-8">
      {/* Header */}
      <div className="flex items-start justify-between shrink-0">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-96" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-4 gap-6 shrink-0">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-border/30 rounded-3xl p-6 flex flex-col gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-8 flex flex-col gap-6">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
        <div className="col-span-4 flex flex-col gap-6">
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

// Card skeleton for general use
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white border border-border/20 rounded-3xl p-6", className)}>
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}

// Stats card skeleton
export function StatsCardSkeleton() {
  return (
    <div className="bg-surface border border-border/30 rounded-3xl p-6 flex flex-col justify-between h-[178px]">
      <div className="flex items-start justify-between">
        <Skeleton className="h-11 w-11 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-12" />
      </div>
    </div>
  );
}
