'use client';

import { useState } from 'react';
import { Clock, MapPin, ChevronRight, CheckCircle2, Users, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface AvailabilityDay {
  date: string; // YYYY-MM-DD
  rooms: Array<{
    roomId: string;
    roomName: string;
    capacity: number;
    slots: Array<{ startTime: string; endTime: string }>;
  }>;
}

interface BookingCardProps {
  availability: AvailabilityDay[];
  durationMinutes: number;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.toLocaleDateString('en-US', { weekday: 'short' });
  const mon = d.toLocaleDateString('en-US', { month: 'short' });
  const num = d.getDate();
  return { short: day, full: `${mon} ${num}` };
}

/** Generate all valid 30-min-aligned start times within a free block for a given duration */
function getStartTimesInBlock(slot: { startTime: string; endTime: string }, durationMinutes: number): string[] {
  const blockStart = timeToMinutes(slot.startTime);
  const blockEnd = timeToMinutes(slot.endTime);
  const times: string[] = [];
  for (let t = blockStart; t + durationMinutes <= blockEnd; t += 30) {
    times.push(minutesToTime(t));
  }
  return times;
}

interface ExpandedBlock {
  roomId: string;
  slotStartTime: string; // the free block's own start
}

interface SelectedSlot {
  roomId: string;
  roomName: string;
  date: string;
  dateLabel: string;
  startTime: string;
  endTime: string; // derived: startTime + durationMinutes
}

export function BookingCard({ availability, durationMinutes }: BookingCardProps) {
  const router = useRouter();
  const [activeDateIdx, setActiveDateIdx] = useState(0);
  // Which free block is expanded (showing start-time picker)
  const [expandedBlock, setExpandedBlock] = useState<ExpandedBlock | null>(null);
  // The final confirmed selection
  const [selected, setSelected] = useState<SelectedSlot | null>(null);

  const currentDay = availability[activeDateIdx];

  const handleBlockClick = (
    room: AvailabilityDay['rooms'][0],
    slot: { startTime: string; endTime: string },
  ) => {
    const blockDuration = timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
    const isSameBlockExpanded =
      expandedBlock?.roomId === room.roomId && expandedBlock?.slotStartTime === slot.startTime;

    if (isSameBlockExpanded) {
      // Toggle off
      setExpandedBlock(null);
      setSelected(null);
      return;
    }

    if (blockDuration <= durationMinutes) {
      // Exact fit — select immediately without picker
      const dayLabel = formatDateLabel(currentDay.date);
      setSelected({
        roomId: room.roomId,
        roomName: room.roomName,
        date: currentDay.date,
        dateLabel: `${dayLabel.short}, ${dayLabel.full}`,
        startTime: slot.startTime,
        endTime: minutesToTime(timeToMinutes(slot.startTime) + durationMinutes),
      });
      setExpandedBlock(null);
    } else {
      // Larger block — show start-time picker
      setExpandedBlock({ roomId: room.roomId, slotStartTime: slot.startTime });
      setSelected(null);
    }
  };

  const handleStartTimePick = (
    room: AvailabilityDay['rooms'][0],
    startTime: string,
  ) => {
    const dayLabel = formatDateLabel(currentDay.date);
    const endTime = minutesToTime(timeToMinutes(startTime) + durationMinutes);
    setSelected({
      roomId: room.roomId,
      roomName: room.roomName,
      date: currentDay.date,
      dateLabel: `${dayLabel.short}, ${dayLabel.full}`,
      startTime,
      endTime,
    });
  };

  const handleConfirm = () => {
    if (!selected) return;
    const time = selected.startTime.substring(0, 5);
    const endTime = selected.endTime.substring(0, 5);
    router.push(`/schedule?room=${selected.roomId}&date=${selected.date}&time=${time}&endTime=${endTime}`);
  };

  return (
    <div className="w-full rounded-3xl shadow-lg shadow-slate-200/60 border border-border/20 overflow-hidden bg-white transition-all duration-300">
      {/* Date Tabs */}
      <div className="px-5 pt-5 pb-0 border-b border-border/20">
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
          {availability.map((day, idx) => {
            const label = formatDateLabel(day.date);
            return (
              <button
                key={day.date}
                onClick={() => {
                  setActiveDateIdx(idx);
                  setSelected(null);
                  setExpandedBlock(null);
                }}
                className={cn(
                  "flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-center leading-tight",
                  activeDateIdx === idx
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "bg-surface text-text-secondary hover:bg-border/20"
                )}
              >
                {label.short}
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">{label.full}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Room / Slot Grid */}
      <div className="p-5 space-y-6 bg-slate-50/20">
        {currentDay.rooms.map((room) => {
          return (
            <div key={room.roomId} className="space-y-3">
              {/* Room header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white border border-border/30 flex items-center justify-center text-text-secondary shadow-sm">
                    <MapPin size={14} />
                  </div>
                  <span className="font-bold text-text-primary">{room.roomName}</span>
                  {room.capacity > 0 && (
                    <span className="flex items-center gap-1 text-xs text-text-tertiary bg-surface px-2 py-0.5 rounded-full">
                      <Users size={11} />
                      {room.capacity}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-text-tertiary font-medium uppercase tracking-wider">
                  {room.slots.length} {room.slots.length === 1 ? 'block' : 'blocks'} free
                </span>
              </div>

              {/* Free block buttons */}
              <div className="flex flex-wrap gap-2">
                {room.slots.map((slot) => {
                  const blockDuration = timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
                  const needsPicker = blockDuration > durationMinutes;
                  const isExpanded = expandedBlock?.roomId === room.roomId && expandedBlock?.slotStartTime === slot.startTime;
                  const isBlockSelected = selected?.roomId === room.roomId
                    && selected?.date === currentDay.date
                    && timeToMinutes(selected.startTime) >= timeToMinutes(slot.startTime)
                    && timeToMinutes(selected.endTime) <= timeToMinutes(slot.endTime);

                  return (
                    <div key={`${room.roomId}-${slot.startTime}`} className="w-full">
                      {/* The block pill */}
                      <button
                        onClick={() => handleBlockClick(room, slot)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all active:scale-[0.98]",
                          isExpanded || isBlockSelected
                            ? "bg-primary/5 border-primary/30 text-primary ring-2 ring-primary/20 ring-offset-1"
                            : "bg-white border-border/30 text-text-secondary hover:border-primary/30 hover:bg-primary/5"
                        )}
                      >
                        <Clock size={13} className="opacity-60 shrink-0" />
                        <span>{formatTime(slot.startTime)}</span>
                        <span className="opacity-40 mx-0.5">–</span>
                        <span>{formatTime(slot.endTime)}</span>
                        {needsPicker && (
                          <span className="ml-auto pl-2 flex items-center gap-1 text-[10px] opacity-60 font-normal">
                            Pick start time
                            <ArrowRight size={10} />
                          </span>
                        )}
                      </button>

                      {/* Start-time picker (shown when expanded) */}
                      {isExpanded && (
                        <div className="mt-2 ml-2 p-3 bg-white border border-border/20 rounded-2xl shadow-sm animate-in slide-in-from-top-1 duration-200">
                          <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-2.5">
                            Choose your start time ({durationMinutes >= 60 ? `${durationMinutes / 60}h` : `${durationMinutes}min`})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {getStartTimesInBlock(slot, durationMinutes).map((startTime) => {
                              const endTime = minutesToTime(timeToMinutes(startTime) + durationMinutes);
                              const isPickSelected = selected?.roomId === room.roomId
                                && selected?.startTime === startTime
                                && selected?.date === currentDay.date;
                              return (
                                <button
                                  key={startTime}
                                  onClick={() => handleStartTimePick(room, startTime)}
                                  className={cn(
                                    "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all active:scale-95",
                                    isPickSelected
                                      ? "bg-primary text-white border-primary shadow-md"
                                      : "bg-surface border-border/30 text-text-secondary hover:border-primary/30 hover:bg-primary/5"
                                  )}
                                >
                                  {formatTime(startTime)}
                                  <span className="opacity-50">→</span>
                                  {formatTime(endTime)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Bar — only shown after a precise start time is selected */}
      {selected && (
        <div className="p-5 bg-primary transition-all duration-300 animate-in slide-in-from-bottom-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-white">
              <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest mb-1.5">Confirm Selection</p>
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                <span className="font-bold">{selected.roomName}</span>
                <span className="opacity-40">·</span>
                <span className="opacity-90">{selected.dateLabel}</span>
                <span className="opacity-40">·</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-lg font-medium">
                  {formatTime(selected.startTime)} – {formatTime(selected.endTime)}
                </span>
              </div>
            </div>
            <button
              onClick={handleConfirm}
              className="shrink-0 bg-white text-primary hover:bg-white/85 px-5 py-2.5 rounded-2xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-xl active:scale-95 text-sm"
            >
              <CheckCircle2 size={16} />
              Book this Room
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
}
