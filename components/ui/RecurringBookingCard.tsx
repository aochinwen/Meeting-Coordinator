'use client';

import { useRouter } from 'next/navigation';
import { Repeat, Clock, MapPin, AlertTriangle, CheckCircle2, ChevronRight, CalendarDays } from 'lucide-react';
import { formatRecurrencePattern } from '@/lib/recurrence';

export interface RecurringAvailability {
  roomId: string | null;
  roomName: string;
  frequency: string;
  daysOfWeek: string[] | null;
  startDate: string;
  time: string;
  endTime: string;
  durationMinutes: number;
  endRule: string;
  endDate?: string;
  endCount?: number;
  totalOccurrences: number;
  availableCount: number;
  conflictDates: string[];
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildScheduleUrl(ra: RecurringAvailability): string {
  const params = new URLSearchParams();
  if (ra.roomId) params.set('room', ra.roomId);
  params.set('date', ra.startDate);
  params.set('time', ra.time);
  params.set('endTime', ra.endTime);
  params.set('recurring', 'true');
  params.set('frequency', ra.frequency);
  if (ra.daysOfWeek && ra.daysOfWeek.length > 0) params.set('days', ra.daysOfWeek.join(','));
  params.set('endRule', ra.endRule);
  if (ra.endRule === 'date' && ra.endDate) params.set('endDate', ra.endDate);
  if (ra.endRule === 'count' && ra.endCount) params.set('endCount', String(ra.endCount));
  return `/schedule?${params.toString()}`;
}

export function RecurringBookingCard({ ra }: { ra: RecurringAvailability }) {
  const router = useRouter();
  const recurrenceLabel = formatRecurrencePattern(
    ra.frequency as Parameters<typeof formatRecurrencePattern>[0],
    ra.daysOfWeek,
    new Date(ra.startDate + 'T12:00:00Z')
  );
  const hasConflicts = ra.conflictDates.length > 0;
  const allConflict = ra.availableCount === 0;

  return (
    <div className="w-full rounded-3xl shadow-lg shadow-slate-200/60 border border-border/20 overflow-hidden bg-white">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border/10">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Repeat size={14} className="text-primary" />
          </div>
          <span className="font-bold text-text-primary">{recurrenceLabel}</span>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-text-secondary">
          <span className="flex items-center gap-1.5">
            <Clock size={13} className="opacity-50" />
            {formatTime(ra.time)} – {formatTime(ra.endTime)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin size={13} className="opacity-50" />
            {ra.roomName}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays size={13} className="opacity-50" />
            From {formatDateShort(ra.startDate)}
            {ra.endRule === 'date' && ra.endDate && ` – ${formatDateShort(ra.endDate)}`}
            {ra.endRule === 'count' && ra.endCount && ` · ${ra.endCount} occurrences`}
            {ra.endRule === 'never' && ' · Ongoing'}
          </span>
        </div>
      </div>

      {/* Availability summary */}
      <div className="px-5 py-4 space-y-3">
        <div className={[
          'flex items-center gap-3 px-4 py-3 rounded-2xl',
          allConflict
            ? 'bg-red-50 border border-red-100'
            : hasConflicts
            ? 'bg-amber-50 border border-amber-100'
            : 'bg-emerald-50 border border-emerald-100'
        ].join(' ')}>
          {allConflict ? (
            <AlertTriangle size={16} className="text-red-500 shrink-0" />
          ) : hasConflicts ? (
            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          )}
          <p className={[
            'text-sm font-medium',
            allConflict ? 'text-red-700' : hasConflicts ? 'text-amber-700' : 'text-emerald-700'
          ].join(' ')}>
            {allConflict
              ? `Room unavailable on all ${ra.totalOccurrences} dates`
              : hasConflicts
              ? `${ra.availableCount} of ${ra.totalOccurrences} dates available — room booking will be skipped on ${ra.conflictDates.length} conflicting date${ra.conflictDates.length > 1 ? 's' : ''}`
              : `Room available on all ${ra.totalOccurrences} dates`}
          </p>
        </div>

        {/* Conflict date list */}
        {hasConflicts && !allConflict && (
          <div className="px-1">
            <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-2">
              No room booking on these dates
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ra.conflictDates.map(d => (
                <span
                  key={d}
                  className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 font-medium"
                >
                  {formatDateShort(d)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Book Series button */}
      {!allConflict && (
        <div className="px-5 pb-5">
          <button
            onClick={() => router.push(buildScheduleUrl(ra))}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 px-5 rounded-2xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 active:scale-[0.98]"
          >
            <CheckCircle2 size={16} />
            Book Series
            <ChevronRight size={16} className="ml-auto" />
          </button>
        </div>
      )}
    </div>
  );
}
