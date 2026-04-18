'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, DoorOpen, Clock, Users, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { Room, RoomBooking, getRooms, getRoomBookings } from '@/lib/rooms';

interface RoomCalendarProps {
  onBookingClick?: (booking: RoomBooking & { room: Room; meetings?: { title: string; status: string } | null }) => void;
  onTimeSlotClick?: (room: Room, date: Date, startTime: string, endTime: string) => void;
}

interface DragState {
  roomId: string;
  dateKey: string;
  startIndex: number; // 0-based 30-min slot index from FIRST_HOUR
  endIndex: number;
}

type BookingWithRoom = RoomBooking & { room: Room; meetings?: { title: string; status: string } | null };

// Bookable day window: 6:00 through 23:00. HOURS is the list of starting
// hours rendered in the time column; each hour contains two 30-min slots,
// so TOTAL_SLOTS = HOURS.length * 2 and the end-edge boundary index is
// TOTAL_SLOTS (= 23:00).
const FIRST_HOUR = 6;
const LAST_HOUR = 23; // exclusive end boundary (last slot is 22:30–23:00)
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => i + FIRST_HOUR);
const TOTAL_SLOTS = HOURS.length * 2;
const SLOT_HEIGHT = 40; // px; height of one 30-min slot

// Convert a 30-min slot boundary index into an "HH:MM" string. The value
// may range from 0 (= FIRST_HOUR:00) through TOTAL_SLOTS (= LAST_HOUR:00).
function slotIndexToTime(boundary: number): string {
  const hour = FIRST_HOUR + Math.floor(boundary / 2);
  const min = (boundary % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function RoomCalendar({ onBookingClick, onTimeSlotClick }: RoomCalendarProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Record<string, BookingWithRoom[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Refs to day-column DOM nodes, keyed by `yyyy-MM-dd`. Used during drag to
  // hit-test the mouse against the originating column via getBoundingClientRect,
  // so we can derive the hovered 30-min slot from clientY even when the pointer
  // moves outside the column (Google-Calendar-style selection).
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Mutable ref mirroring dragState so global handlers always see fresh values
  // without needing to rebind listeners on every endIndex change.
  const dragStateRef = useRef<DragState | null>(null);
  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  // Keep the selected room tab valid as `rooms` changes (initial load, deletes).
  // If the active room disappears, fall back to the first available one.
  useEffect(() => {
    if (rooms.length === 0) {
      setSelectedRoomId(null);
      return;
    }
    setSelectedRoomId((prev) =>
      prev && rooms.some((r) => r.id === prev) ? prev : rooms[0].id
    );
  }, [rooms]);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId]
  );

  // Calculate visible days (7 days starting from current week) - memoized to prevent infinite loops
  const visibleDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [currentDate]);

  // Load rooms + bookings together in a single effect keyed on currentDate.
  //
  // Previously this was split into two effects: one for rooms (mount-only) and
  // one for bookings (deps: [rooms, currentDate]). Because `getRooms()` returns
  // a fresh array reference on every call, every `setRooms` invocation retriggered
  // the bookings effect, and under React 19 / Next 16 StrictMode the doubled
  // mount effects caused overlapping fetches that flipped the loading flag on
  // and off repeatedly — producing the visible spinner/grid flashing.
  //
  // Merging into one effect with a `cancelled` flag removes the cascading
  // re-fire and makes stale in-flight responses safe to discard.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const roomsData = await getRooms();
        if (cancelled) return;

        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
        const startDate = format(days[0], 'yyyy-MM-dd');
        const endDate = format(days[6], 'yyyy-MM-dd');

        const allBookings: Record<string, BookingWithRoom[]> = {};
        for (const day of days) {
          allBookings[format(day, 'yyyy-MM-dd')] = [];
        }

        if (roomsData.length > 0) {
          const results = await Promise.all(
            roomsData.map((room) =>
              getRoomBookings(room.id, startDate, endDate).then((bs) => ({ room, bs }))
            )
          );
          if (cancelled) return;

          for (const { room, bs } of results) {
            for (const booking of bs) {
              const dateKey = booking.date;
              if (!allBookings[dateKey]) allBookings[dateKey] = [];
              allBookings[dateKey].push({
                ...booking,
                room,
                meetings: booking.meetings,
              });
            }
          }
        }

        setRooms(roomsData);
        setBookings(allBookings);
      } catch (err) {
        if (cancelled) return;
        setError('Failed to load room schedule');
        console.error('Error loading room schedule:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [currentDate]);

  // While a drag is in progress, track the pointer globally:
  //   - mousemove → recompute the hovered slot from the originating column's
  //     bounding rect so that fast movement or crossing sibling elements
  //     never loses a frame. This mirrors Google/Apple Calendar behaviour.
  //   - mouseup  → commit the selection and fire onTimeSlotClick.
  useEffect(() => {
    // Only bind listeners when a drag is actually in progress.
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const col = columnRefs.current[ds.dateKey];
      if (!col) return;
      const rect = col.getBoundingClientRect();
      const slotIdx = clamp(
        Math.floor((e.clientY - rect.top) / SLOT_HEIGHT),
        0,
        TOTAL_SLOTS - 1,
      );
      setDragState((prev) =>
        prev && prev.endIndex !== slotIdx ? { ...prev, endIndex: slotIdx } : prev,
      );
    };

    const handleMouseUp = () => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const { roomId, dateKey, startIndex, endIndex } = ds;
      const lo = Math.min(startIndex, endIndex);
      const hi = Math.max(startIndex, endIndex);
      const startTime = slotIndexToTime(lo);
      const endTime = slotIndexToTime(hi + 1);
      const room = rooms.find((r) => r.id === roomId);
      const day = visibleDays.find((d) => format(d, 'yyyy-MM-dd') === dateKey);
      setDragState(null);
      if (room && day) {
        onTimeSlotClick?.(room, day, startTime, endTime);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    // Bind only when dragState toggles (null ↔ non-null), not on every index change.
    // Handlers read from the mutable ref to always see fresh endIndex.
  }, [!!dragState, rooms, visibleDays, onTimeSlotClick]);

  const goToPreviousWeek = () => {
    setCurrentDate(addDays(currentDate, -7));
  };

  const goToNextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get bookings for a specific room and day
  const getBookingsForRoomAndDay = (room: Room, day: Date): BookingWithRoom[] => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayBookings = bookings[dateKey] || [];
    return dayBookings.filter(b => b.room_id === room.id).map(b => b as BookingWithRoom);
  };

  // Calculate position and height for a booking
  const getBookingStyle = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutesFromFirstHour = (startHour - FIRST_HOUR) * 60 + startMin;
    const durationMinutes = (endHour - startHour) * 60 + (endMin - startMin);

    const top = (startMinutesFromFirstHour / 30) * SLOT_HEIGHT;
    const height = (durationMinutes / 30) * SLOT_HEIGHT;
    
    return { top, height };
  };

  // Format time for display
  const formatTime = (time: string) => {
    const [hour, min] = time.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
  };

  if (error) {
    return (
      <div className="bg-coral-bg border border-coral-text/20 rounded-2xl p-6 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-coral-text" />
        <p className="text-sm text-coral-text">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-text-primary font-literata">
            Room Schedule
          </h2>
          <div className="flex items-center gap-1 bg-white border border-border/30 rounded-xl p-1">
            <button
              onClick={goToPreviousWeek}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-surface transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-text-secondary" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 h-8 text-sm font-medium text-text-primary hover:bg-surface rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={goToNextWeek}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-surface transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-text-secondary" />
            </button>
          </div>
        </div>
        
        <p className="text-sm text-text-secondary font-light">
          {format(visibleDays[0], 'MMM d')} - {format(visibleDays[6], 'MMM d, yyyy')}
        </p>
      </div>

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-3xl border border-border/30">
          <DoorOpen className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary font-light">No rooms available</p>
          <p className="text-sm text-text-tertiary mt-1">
            Add rooms to see the schedule
          </p>
        </div>
      ) : (
        <>
          {/* Room tabs — click to switch which room's weekly availability is shown. */}
          <div
            role="tablist"
            aria-label="Rooms"
            className="flex items-center gap-2 overflow-x-auto pb-1"
          >
            {rooms.map((room) => {
              const isActive = room.id === selectedRoomId;
              return (
                <button
                  key={room.id}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={cn(
                    'shrink-0 px-4 py-2.5 rounded-xl border text-sm font-bold flex items-center gap-2 transition-colors',
                    isActive
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-text-primary border-border/40 hover:border-primary/50'
                  )}
                >
                  <DoorOpen className="h-4 w-4" />
                  <span className="truncate max-w-[160px]">{room.name}</span>
                  <span
                    className={cn(
                      'flex items-center gap-1 text-xs font-medium',
                      isActive ? 'text-white/80' : 'text-text-secondary'
                    )}
                  >
                    <Users className="h-3 w-3" />
                    {room.capacity}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="bg-white border border-border/30 rounded-3xl overflow-hidden shadow-sm">
            {/* Column Headers: time + 7 days for the selected room */}
            <div className="flex border-b border-border/50">
              <div className="w-20 shrink-0 p-4 border-r border-border/50 bg-surface/50">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Time
                </span>
              </div>
              {visibleDays.map((day) => {
                const isToday = isSameDay(day, new Date());
                return (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  className={cn(
                    'flex-1 min-w-[120px] p-3 text-center border-r border-border/50 last:border-r-0 bg-surface/50',
                    isToday && 'bg-primary/5 border-l-2 border-l-primary border-r-0'
                  )}
                >
                  <p className="text-xs font-bold text-text-primary">
                    {format(day, 'EEE')}
                  </p>
                  <p
                    className={cn(
                      'text-xs mt-0.5',
                      isToday
                        ? 'text-primary font-bold'
                        : 'text-text-secondary'
                    )}
                  >
                    {format(day, 'MMM d')}
                  </p>
                </div>
              );})}
            </div>

            {/* Scrollable content */}
            <div className="overflow-auto max-h-[600px]">
              <div className="flex">
                {/* Time column */}
                <div className="w-20 shrink-0 border-r border-border/50 bg-surface/30">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="border-b border-border/20 last:border-b-0"
                      style={{ height: SLOT_HEIGHT * 2 }}
                    >
                      <div className="p-2 text-xs font-medium text-text-secondary sticky top-0">
                        {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Day columns for the selected room */}
                {selectedRoom &&
                  visibleDays.map((day, index) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayBookings = getBookingsForRoomAndDay(selectedRoom, day);
                    const isActiveDragDay =
                      dragState !== null &&
                      dragState.roomId === selectedRoom.id &&
                      dragState.dateKey === dateKey;
                    const selLo = isActiveDragDay
                      ? Math.min(dragState!.startIndex, dragState!.endIndex)
                      : 0;
                    const selHi = isActiveDragDay
                      ? Math.max(dragState!.startIndex, dragState!.endIndex)
                      : 0;
                    const isToday = isSameDay(day, new Date());
                    const isEvenColumn = index % 2 === 0;

                    return (
                      <div
                        key={dateKey}
                        ref={(el) => {
                          columnRefs.current[dateKey] = el;
                        }}
                        className={cn(
                          'flex-1 min-w-[120px] relative cursor-pointer select-none transition-colors hover:bg-surface/40',
                          isEvenColumn ? 'bg-white' : 'bg-surface/30',
                          isToday && 'bg-primary/[0.03] hover:bg-primary/[0.05]',
                          'border-r border-border/40 last:border-r-0'
                        )}
                        style={{ height: TOTAL_SLOTS * SLOT_HEIGHT }}
                        onMouseDown={(e) => {
                          // Ignore drags that originate on an existing booking
                          // (those should fall through to the booking's onClick).
                          const target = e.target as HTMLElement;
                          if (target.closest('[data-booking="true"]')) return;
                          e.preventDefault();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const slotIdx = clamp(
                            Math.floor((e.clientY - rect.top) / SLOT_HEIGHT),
                            0,
                            TOTAL_SLOTS - 1,
                          );
                          setDragState({
                            roomId: selectedRoom.id,
                            dateKey,
                            startIndex: slotIdx,
                            endIndex: slotIdx,
                          });
                        }}
                      >
                        {/* Hour grid lines (full line at :00, subtle at :30) */}
                        {HOURS.map((hour) => (
                          <div
                            key={hour}
                            className="border-b border-border/25 last:border-b-0"
                            style={{ height: SLOT_HEIGHT * 2 }}
                          >
                            <div className="border-b border-dashed border-border/15 h-1/2" />
                          </div>
                        ))}

                        {/* Bookings */}
                        {(() => {
                          // Group concurrent bookings and calculate their positions
                          type PositionedBooking = BookingWithRoom & {
                            top: number;
                            height: number;
                            groupId: number;
                            positionInGroup: number;
                          };

                          if (dayBookings.length === 0) return null;

                          // Debug logging
                          console.log(`[RoomCalendar] ${dateKey}: ${dayBookings.length} bookings`, dayBookings.map(b => ({
                            id: b.id,
                            title: b.meetings?.title,
                            start: b.start_time,
                            end: b.end_time
                          })));

                          // First, calculate positions for all bookings
                          const positionedBookings: PositionedBooking[] = dayBookings.map((booking) => {
                            const { top, height } = getBookingStyle(
                              booking.start_time,
                              booking.end_time,
                            );
                            return {
                              ...booking,
                              top,
                              height,
                              groupId: 0,
                              positionInGroup: 0,
                            };
                          });

                          // Check if two bookings overlap in time
                          const overlaps = (a: PositionedBooking, b: PositionedBooking): boolean => {
                            const aStart = a.top;
                            const aEnd = a.top + a.height;
                            const bStart = b.top;
                            const bEnd = b.top + b.height;
                            return aStart < bEnd && aEnd > bStart;
                          };

                          // Build connected components (groups of overlapping bookings)
                          const visited = new Set<string>();
                          const groups: PositionedBooking[][] = [];

                          positionedBookings.forEach((booking) => {
                            if (visited.has(booking.id)) return;

                            // BFS to find all connected bookings
                            const group: PositionedBooking[] = [];
                            const queue: PositionedBooking[] = [booking];
                            visited.add(booking.id);

                            while (queue.length > 0) {
                              const current = queue.shift()!;
                              group.push(current);

                              // Find all unvisited overlapping bookings
                              positionedBookings.forEach((other) => {
                                if (!visited.has(other.id) && overlaps(current, other)) {
                                  visited.add(other.id);
                                  queue.push(other);
                                }
                              });
                            }

                            groups.push(group);
                          });

                          // Debug: log groups
                          console.log(`[RoomCalendar] ${dateKey}: ${groups.length} groups`, groups.map((g, i) =>
                            `Group ${i}: ${g.length} bookings - ${g.map(b => b.meetings?.title || b.id).join(', ')}`
                          ));

                          // Assign group IDs and positions
                          groups.forEach((group, groupIndex) => {
                            // Sort by start time for consistent ordering
                            const sortedGroup = group.sort((a, b) =>
                              a.start_time.localeCompare(b.start_time)
                            );
                            sortedGroup.forEach((booking, position) => {
                              booking.groupId = groupIndex;
                              booking.positionInGroup = position;
                            });
                          });

                          return positionedBookings.map((booking) => {
                            const group = groups[booking.groupId];
                            const groupSize = group.length;
                            const widthPercent = 100 / groupSize;
                            const leftPercent = booking.positionInGroup * widthPercent;

                            // Calculate exact pixel values to avoid rounding issues
                            const gap = 2;
                            const leftPos = `calc(${leftPercent}% + ${gap}px)`;
                            const widthStyle = groupSize === 1
                              ? 'calc(100% - 8px)'
                              : `calc(${widthPercent}% - ${gap * 2}px)`;

                            return (
                              <div
                                key={booking.id}
                                data-booking="true"
                                className="absolute bg-primary/10 border border-primary/30 rounded-lg p-1 cursor-pointer hover:bg-primary/20 transition-colors overflow-hidden z-10"
                                style={{
                                  top: booking.top,
                                  height: Math.max(booking.height - 2, 28),
                                  left: leftPos,
                                  width: widthStyle,
                                }}
                                title={`${booking.meetings?.title || 'Meeting'} (${booking.start_time}-${booking.end_time})`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onBookingClick?.(booking);
                                }}
                              >
                                <p className="text-xs font-bold text-primary truncate">
                                  {booking.meetings?.title || 'Meeting'}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-text-secondary">
                                  <Clock className="h-3 w-3 shrink-0" />
                                  <span className="truncate">
                                    {formatTime(booking.start_time)} -{' '}
                                    {formatTime(booking.end_time)}
                                  </span>
                                </div>
                              </div>
                            );
                          });
                        })()}

                        {/* Selection overlay while dragging */}
                        {isActiveDragDay && (
                          <div
                            className="pointer-events-none absolute left-0.5 right-0.5 bg-primary/25 border border-primary/60 rounded-md z-20 flex items-start justify-center text-[10px] font-bold text-primary pt-1"
                            style={{
                              top: selLo * SLOT_HEIGHT,
                              height: (selHi - selLo + 1) * SLOT_HEIGHT,
                            }}
                          >
                            {formatTime(slotIndexToTime(selLo))} –{' '}
                            {formatTime(slotIndexToTime(selHi + 1))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
