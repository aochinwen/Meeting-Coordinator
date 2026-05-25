import { Calendar as CalendarIcon, Clock, Repeat, UserPlus } from 'lucide-react';
import { UserData } from './types';

interface ScheduleSummaryProps {
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  recurrenceDisplay: string;
  selectedParticipants: string[];
  users: UserData[];
}

export function ScheduleSummary({
  title,
  startTime,
  endTime,
  duration,
  recurrenceDisplay,
  selectedParticipants,
  users
}: ScheduleSummaryProps) {
  return (
    <div className="bg-primary rounded-[24px] p-8 flex flex-col gap-6 text-white shadow-lg relative overflow-hidden">
      <div className="absolute top-[-20px] right-[-20px] h-32 w-32 bg-white/10 blur-[30px] rounded-full pointer-events-none"></div>

      <h3 className="text-2xl font-bold tracking-tight font-literata">
        Schedule Summary
      </h3>

      <div className="flex flex-col gap-6 mt-2 relative z-10">
        <div className="flex items-start gap-4">
          <CalendarIcon className="h-5 w-5 mt-0.5 text-status-green-bg/80" />
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-status-green-bg/80 uppercase tracking-wider mb-1">Event Name</span>
            <span className="text-base font-bold leading-tight">{title || 'Untitled Meeting'}</span>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <Clock className="h-5 w-5 mt-0.5 text-status-green-bg/80" />
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-status-green-bg/80 uppercase tracking-wider mb-1">Time & Duration</span>
            <span className="text-base font-bold leading-tight">{startTime} — {endTime}<br/>({duration}m)</span>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <Repeat className="h-5 w-5 mt-0.5 text-status-green-bg/80" />
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-status-green-bg/80 uppercase tracking-wider mb-1">Recurrence</span>
            <span className="text-base font-bold leading-tight">{recurrenceDisplay}</span>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <UserPlus className="h-5 w-5 mt-0.5 text-status-green-bg/80" />
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-status-green-bg/80 uppercase tracking-wider mb-2">Participants</span>
            <div className="flex -space-x-2">
              {selectedParticipants.slice(0, 3).map((userId) => {
                const user = users.find(u => u.id === userId);
                return (
                  <div key={userId} className="h-8 w-8 rounded-full border-2 border-primary bg-primary overflow-hidden flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {user?.name?.charAt(0) || '?'}
                    </span>
                  </div>
                );
              })}
              {selectedParticipants.length > 3 && (
                <div className="h-8 w-8 rounded-full border-2 border-primary bg-warm flex items-center justify-center text-text-primary text-[10px] font-bold">
                  +{selectedParticipants.length - 3}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
