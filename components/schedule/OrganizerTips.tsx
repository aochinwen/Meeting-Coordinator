import { Lightbulb, AlertCircle, Sparkles, Calendar as CalendarIcon } from 'lucide-react';

interface OrganizerTipsProps {
  conflicts: Array<{
    userName: string;
    meetingTitle: string;
    startTime: string;
  }>;
  previewDates: Date[];
  totalOccurrences: number | null;
}

export function OrganizerTips({
  conflicts,
  previewDates,
  totalOccurrences
}: OrganizerTipsProps) {
  return (
    <div className="bg-amber border border-amber-border/30 rounded-[24px] p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-text-primary" />
        <h3 className="text-base font-bold text-text-primary font-literata">
          Organizer Tips
        </h3>
      </div>

      <div className="flex flex-col gap-4">
        {conflicts.length > 0 ? (
          conflicts.slice(0, 2).map((conflict, i) => (
            <div key={i} className="flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-coral-text shrink-0 mt-0.5" />
              <p className="text-sm font-light text-text-primary leading-snug">
                <strong className="font-bold">{conflict.userName}</strong> has a conflict: {conflict.meetingTitle} at {conflict.startTime}
              </p>
            </div>
          ))
        ) : (
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm font-light text-text-primary leading-snug">
              <strong className="font-bold">No conflicts detected!</strong> All selected participants are available at this time.
            </p>
          </div>
        )}

        {previewDates.length > 0 && (
          <div className="flex items-start gap-3">
            <CalendarIcon className="h-4 w-4 text-text-tertiary shrink-0 mt-0.5" />
            <div className="text-sm font-light text-text-primary leading-snug w-full">
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold">Upcoming occurrences:</p>
                {totalOccurrences !== null && (
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {totalOccurrences} total
                  </span>
                )}
              </div>
              <ul className="space-y-1">
                {previewDates.slice(0, 5).map((date, i) => (
                  <li key={i} className="text-xs text-text-secondary">
                    {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </li>
                ))}
                {totalOccurrences !== null && totalOccurrences > 5 && (
                  <li className="text-xs text-text-tertiary">
                    +{totalOccurrences - 5} more
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
