'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DoorOpen, AlertCircle, Check, ChevronDown, Users, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Room,
  getRoomAvailabilityForDates,
  RoomAvailabilityForDates,
} from '@/lib/rooms';

interface RoomSelectorProps {
  date: string;
  startTime: string;
  endTime: string;
  selectedRoomId: string | null;
  onRoomSelect: (roomId: string | null) => void;
  minCapacity?: number;
  /**
   * For recurring meetings, the full list of occurrence dates (YYYY-MM-DD).
   * When provided, availability is evaluated across all of them so the user
   * can see per-date conflicts before publishing. Defaults to `[date]`.
   */
  occurrenceDates?: string[];
}

// Small utility: render a single date as a friendly label (e.g. "Mon, Apr 22").
function formatDateLabel(isoDate: string): string {
  // Parse as local date — avoids TZ shifting a YYYY-MM-DD into the previous day.
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function RoomSelector({
  date,
  startTime,
  endTime,
  selectedRoomId,
  onRoomSelect,
  minCapacity = 2,
  occurrenceDates,
}: RoomSelectorProps) {
  const [availability, setAvailability] = useState<RoomAvailabilityForDates[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoomName, setSelectedRoomName] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // The dates we actually evaluate against. For one-off meetings this is
  // just `[date]`; for recurring we use every occurrence.
  const dates = useMemo<string[]>(() => {
    if (occurrenceDates && occurrenceDates.length > 0) return occurrenceDates;
    return date ? [date] : [];
  }, [occurrenceDates, date]);

  const fetchAvailability = useCallback(async () => {
    if (!startTime || !endTime || dates.length === 0) return;
    setIsLoading(true);
    try {
      const result = await getRoomAvailabilityForDates(
        dates,
        startTime,
        endTime,
        minCapacity,
      );
      setAvailability(result);

      // If the selected room is now entirely unavailable (no free dates),
      // deselect it. Keep it selected if it's partially available — the
      // user explicitly chose 'allow publish with warning' behavior.
      if (selectedRoomId) {
        const match = result.find((r) => r.room.id === selectedRoomId);
        if (!match || match.availableCount === 0) {
          onRoomSelect(null);
          setSelectedRoomName('');
        }
      }
    } catch (err) {
      console.error('Error fetching room availability:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dates, startTime, endTime, minCapacity, selectedRoomId, onRoomSelect]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Keep the displayed room name in sync with `selectedRoomId`. Needed when
  // the parent prefills `selectedRoomId` from URL params (Room Calendar drag
  // flow) — `handleRoomSelect` never runs in that case, so the name label
  // would otherwise stay blank until the rooms list loads and matches.
  useEffect(() => {
    if (!selectedRoomId) {
      setSelectedRoomName('');
      return;
    }
    const match = availability.find((a) => a.room.id === selectedRoomId);
    if (match) setSelectedRoomName(match.room.name);
  }, [selectedRoomId, availability]);

  const handleRoomSelect = (entry: RoomAvailabilityForDates) => {
    // Allow selection even when partially conflicting. The server-side
    // booking step skips conflicting dates and surfaces them in the
    // existing amber warning panel on the Schedule page.
    onRoomSelect(entry.room.id);
    setSelectedRoomName(entry.room.name);
    setIsDropdownOpen(false);
  };

  const handleClearRoom = () => {
    onRoomSelect(null);
    setSelectedRoomName('');
    setIsDropdownOpen(false);
  };

  const hasSelection = selectedRoomId !== null;
  const isRecurring = dates.length > 1;
  const totalDates = dates.length;
  const fullyAvailableCount = availability.filter((a) => a.availableCount === a.totalCount).length;
  const totalRoomCount = availability.length;

  const selectedEntry = availability.find((a) => a.room.id === selectedRoomId) || null;

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-bold text-text-primary flex items-center gap-2">
        <DoorOpen className="h-4 w-4" />
        Meeting Room
      </label>

      {/* Room Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={isLoading}
          className={cn(
            "w-full px-4 py-3 bg-surface border rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all flex items-center justify-between",
            isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/30",
            hasSelection ? "border-primary/30" : "border-border/50"
          )}
        >
          <div className="flex items-center gap-3">
            {hasSelection ? (
              <>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">{selectedRoomName}</p>
                  <p className="text-xs text-text-secondary">
                    {selectedEntry?.room.capacity} people capacity
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="h-8 w-8 rounded-full bg-status-grey-bg flex items-center justify-center">
                  <DoorOpen className="h-4 w-4 text-text-secondary" />
                </div>
                <span className="text-text-secondary font-light text-sm">
                  {isLoading ? 'Checking availability...' : 'Select a room (optional)'}
                </span>
              </>
            )}
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 text-text-secondary transition-transform",
            isDropdownOpen && "rotate-180"
          )} />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border/30 rounded-2xl shadow-lg z-50 max-h-80 overflow-y-auto">
            {/* Clear option */}
            {hasSelection && (
              <button
                type="button"
                onClick={handleClearRoom}
                className="w-full px-4 py-3 text-left text-text-secondary hover:bg-surface transition-colors text-sm font-light border-b border-border/20"
              >
                No room needed
              </button>
            )}

            {/* Room list */}
            {availability.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <AlertCircle className="h-8 w-8 text-coral-text mx-auto mb-2" />
                <p className="text-sm text-text-secondary font-light">
                  No rooms meet the capacity requirement
                </p>
                <p className="text-xs text-text-tertiary mt-1">
                  Try lowering the participant count
                </p>
              </div>
            ) : (
              <div className="py-2">
                {availability.map((entry) => {
                  const isSelected = selectedRoomId === entry.room.id;
                  const allFree = entry.availableCount === entry.totalCount;
                  const noneFree = entry.availableCount === 0;
                  const badgeTone = allFree
                    ? 'bg-green-100 text-green-700'
                    : noneFree
                      ? 'bg-coral-bg text-coral-text'
                      : 'bg-amber-100 text-amber-700';
                  const badgeLabel = isRecurring
                    ? `${entry.availableCount}/${entry.totalCount} dates free`
                    : (allFree ? 'Available' : 'Booked');
                  return (
                    <button
                      key={entry.room.id}
                      type="button"
                      onClick={() => handleRoomSelect(entry)}
                      disabled={noneFree}
                      className={cn(
                        "w-full px-4 py-3 text-left hover:bg-surface transition-colors flex items-center gap-3",
                        isSelected && "bg-primary/5",
                        noneFree && "opacity-50 cursor-not-allowed hover:bg-transparent"
                      )}
                    >
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                        isSelected ? "bg-primary" : "bg-status-grey-bg"
                      )}>
                        {isSelected ? (
                          <Check className="h-4 w-4 text-white" />
                        ) : (
                          <DoorOpen className="h-4 w-4 text-text-secondary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium text-sm truncate",
                          isSelected ? "text-primary" : "text-text-primary"
                        )}>
                          {entry.room.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <Users className="h-3 w-3" />
                          <span>Capacity: {entry.room.capacity}</span>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0",
                        badgeTone
                      )}>
                        {badgeLabel}
                      </span>
                      {isSelected && (
                        <Sparkles className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Availability Summary */}
      {startTime && endTime && !isLoading && totalRoomCount === 0 && (
        <div className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full bg-coral-text" />
          <span className="text-coral-text">No rooms meet the capacity requirement</span>
        </div>
      )}
      {startTime && endTime && !isLoading && totalRoomCount > 0 && (
        <div className="flex items-center gap-2 text-xs">
          {fullyAvailableCount > 0 ? (
            <>
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-text-secondary">
                {isRecurring
                  ? `${fullyAvailableCount} of ${totalRoomCount} rooms free on all ${totalDates} dates`
                  : `${fullyAvailableCount} room${fullyAvailableCount !== 1 ? 's' : ''} available`}
              </span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-coral-text" />
              <span className="text-coral-text">
                {isRecurring
                  ? `No room is free on all ${totalDates} dates`
                  : 'No rooms available at this time'}
              </span>
            </>
          )}
        </div>
      )}

      {/* Per-date availability for the selected room */}
      {hasSelection && selectedEntry && !isLoading && (
        <div className="mt-1 rounded-2xl border border-border/30 bg-white overflow-hidden">
          <div className="px-4 py-2.5 bg-surface border-b border-border/20 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
              {isRecurring ? 'Per-date availability' : 'Slot availability'}
            </p>
            <p className="text-xs font-medium text-text-secondary">
              {selectedEntry.availableCount}/{selectedEntry.totalCount} free
            </p>
          </div>
          <ul className="max-h-56 overflow-y-auto divide-y divide-border/10">
            {selectedEntry.perDate.map((p) => (
              <li
                key={p.date}
                className="flex items-center gap-3 px-4 py-2.5 text-sm"
              >
                {p.available ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-coral-text shrink-0" />
                )}
                <span
                  className={cn(
                    "font-medium shrink-0 w-36",
                    p.available ? "text-text-primary" : "text-coral-text"
                  )}
                >
                  {formatDateLabel(p.date)}
                </span>
                <span className="text-xs font-light text-text-secondary truncate">
                  {p.available
                    ? 'Room available'
                    : `Booked by "${p.conflict?.meetingTitle}"${p.conflict ? ` (${p.conflict.startTime.slice(0, 5)}–${p.conflict.endTime.slice(0, 5)})` : ''}`}
                </span>
              </li>
            ))}
          </ul>
          {selectedEntry.availableCount < selectedEntry.totalCount && (
            <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-200 text-xs text-amber-800 font-light">
              Conflicting dates will be skipped — the meeting is still created, but the room won&apos;t be booked on those dates.
            </div>
          )}
        </div>
      )}

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
}
