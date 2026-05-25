import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RoomSelector } from '@/components/RoomSelector';

interface MeetingDetailsFormProps {
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  startTime: string;
  setStartTime: (time: string) => void;
  endTime: string;
  isCustomDuration: boolean;
  setIsCustomDuration: (val: boolean) => void;
  duration: number;
  setDuration: (dur: number) => void;
  setCustomEndTime: (time: string) => void;
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string | null) => void;
  participantCount: number;
  allOccurrenceDates: string[];
}

export function MeetingDetailsForm({
  title,
  setTitle,
  description,
  setDescription,
  startDate,
  setStartDate,
  startTime,
  setStartTime,
  endTime,
  isCustomDuration,
  setIsCustomDuration,
  duration,
  setDuration,
  setCustomEndTime,
  selectedRoomId,
  setSelectedRoomId,
  participantCount,
  allOccurrenceDates
}: MeetingDetailsFormProps) {
  return (
    <div className="bg-white border border-border/20 rounded-[24px] p-6 flex flex-col gap-6 shadow-sm">
      <div className="flex items-center gap-3">
        <CalendarIcon className="h-5 w-5 text-text-primary" />
        <h2 className="text-xl font-bold text-text-primary font-literata">
          Meeting Details
        </h2>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-text-primary">Meeting Name <span className="text-coral-text">*</span></label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter meeting name..."
            className="w-full px-4 py-3 bg-surface border-none rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-light"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-text-primary">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add meeting description or agenda..."
            rows={3}
            className="w-full px-4 py-3 bg-surface border-none rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-light resize-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/20 pt-5 mt-2">
        <div className="flex flex-col gap-3">
          <label className="text-sm font-bold text-text-primary">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-3 bg-surface border-none rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-light"
          />
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-bold text-text-primary">Start Time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-4 py-3 bg-surface border-none rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-light"
          />
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {[15, 30, 60].map((dur) => (
              <button
                key={dur}
                type="button"
                onClick={() => {
                  setDuration(dur);
                  setIsCustomDuration(false);
                }}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-bold transition-all",
                  !isCustomDuration && duration === dur
                    ? "bg-primary text-white shadow-sm"
                    : "bg-status-grey-bg text-text-primary hover:bg-cream"
                )}
              >
                {dur === 60 ? '1h' : `${dur}m`}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsCustomDuration(true)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-bold transition-all",
                isCustomDuration
                  ? "bg-primary text-white shadow-sm"
                  : "bg-status-grey-bg text-text-primary hover:bg-cream"
              )}
            >
              Custom
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:col-span-2">
          <label className="text-sm font-bold text-text-primary">End Time</label>
          <input
            type="time"
            value={endTime}
            disabled={!isCustomDuration}
            onChange={(e) => {
              if (isCustomDuration) {
                const newEndTime = e.target.value;
                setCustomEndTime(newEndTime);
                const [startH, startM] = startTime.split(':').map(Number);
                const [endH, endM] = newEndTime.split(':').map(Number);
                let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                if (diffMinutes < 0) diffMinutes += 24 * 60;
                setDuration(diffMinutes);
              }
            }}
            className={cn(
              "w-full px-4 py-3 bg-surface border-none rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-light",
              !isCustomDuration && "opacity-60 cursor-not-allowed"
            )}
          />
          {!isCustomDuration && (
            <p className="text-xs font-light text-text-secondary">
              End time is calculated from duration
            </p>
          )}
        </div>

        <div className="md:col-span-2 bg-white border border-border/20 rounded-[20px] p-4">
          <RoomSelector
            date={startDate}
            startTime={startTime}
            endTime={endTime}
            selectedRoomId={selectedRoomId}
            onRoomSelect={setSelectedRoomId}
            minCapacity={participantCount + 1}
            occurrenceDates={allOccurrenceDates}
          />
        </div>
      </div>
    </div>
  );
}
