'use client';

import { useState, useMemo, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import { X, MapPin, Clock, Calendar, AlertTriangle, Check, ChevronRight, DoorOpen, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { Room, RoomBooking, getRooms, getRoomBookings, checkRoomAvailability, bookRoom, cancelRoomBooking } from '@/lib/rooms';
import { checkConflicts, updateMeetingOccurrence, addMeetingParticipants } from '@/lib/meetings';
import { calculateEndTime } from '@/lib/recurrence';
import { createClient } from '@/utils/supabase/client';

interface EditMeetingVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: {
    id: string;
    title: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    series_id: string | null;
    buffer_minutes?: number;
  };
  currentBooking: {
    id: string;
    room_id: string;
    room_name: string;
    start_time: string;
    end_time: string;
  } | null;
  participantIds: string[];
  onVenueUpdated: () => void;
}

type EditMode = 'single' | 'series';
type Step = 'select' | 'confirm' | 'success';

interface SelectedSlot {
  roomId: string;
  roomName: string;
  roomCapacity: number;
  date: string;
  startTime: string;
  endTime: string;
}

interface SeriesPattern {
  frequency: 'weekly' | 'bi-weekly' | 'monthly';
  daysOfWeek: string[];
  startTime: string;
  durationMinutes: number;
}

interface ConflictInfo {
  userId: string;
  userName: string;
  meetingTitle: string;
}

export function EditMeetingVenueModal({
  isOpen,
  onClose,
  meeting,
  currentBooking,
  participantIds,
  onVenueUpdated,
}: EditMeetingVenueModalProps) {
  const supabase = createClient();
  const [step, setStep] = useState<Step>('select');
  const [editMode, setEditMode] = useState<EditMode>(meeting.series_id ? 'single' : 'single');
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [seriesPattern, setSeriesPattern] = useState<SeriesPattern | null>(null);
  const [seriesRoomId, setSeriesRoomId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

  // Format helpers
  const formatDateTime = (date: string, startTime: string, endTime: string) => {
    const d = parseISO(date);
    return {
      date: format(d, 'EEEE, MMMM d, yyyy'),
      time: `${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`,
    };
  };

  const getDurationMinutes = (startTime: string, endTime: string) => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    return (eh - sh) * 60 + (em - sm);
  };

  // Handle slot selection from calendar
  const handleSlotSelected = useCallback(async (slot: SelectedSlot) => {
    console.log('[MODAL] handleSlotSelected called:', slot);
    setSelectedSlot(slot);
    setIsCheckingConflicts(true);
    setConflicts([]);

    // Check for conflicts
    const result = await checkConflicts(slot.date, slot.startTime, slot.endTime, participantIds);
    setConflicts(result.conflicts.map(c => ({
      userId: c.userId,
      userName: c.userName,
      meetingTitle: c.meetingTitle,
    })));
    setIsCheckingConflicts(false);
    console.log('[MODAL] Setting step to confirm');
    setStep('confirm');
  }, [participantIds]);

  // Handle series pattern submission
  const handleSeriesPatternSubmit = useCallback(async () => {
    if (!seriesPattern || !seriesRoomId) return;
    
    const room = await getRoomById(seriesRoomId);
    if (!room) return;

    // For series, we'll show confirmation with the pattern details
    // Actual availability checking happens during submission
    setSelectedSlot({
      roomId: room.id,
      roomName: room.name,
      roomCapacity: room.capacity,
      date: meeting.date,
      startTime: seriesPattern.startTime,
      endTime: calculateEndTime(seriesPattern.startTime, seriesPattern.durationMinutes),
    });
    setStep('confirm');
  }, [seriesPattern, seriesRoomId, meeting.date]);

  // Execute the venue update
  const handleConfirm = useCallback(async () => {
    if (!selectedSlot) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (editMode === 'single') {
        // 1. Cancel existing booking if any
        if (currentBooking) {
          await cancelRoomBooking(
            currentBooking.room_id,
            meeting.id,
            meeting.date
          );
        }

        // 2. Book new room
        const bookingResult = await bookRoom({
          roomId: selectedSlot.roomId,
          meetingId: meeting.id,
          date: selectedSlot.date,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
        });

        if (!bookingResult.success) {
          throw new Error(bookingResult.error || 'Failed to book room');
        }

        // 3. Update meeting datetime
        await updateMeetingOccurrence(meeting.id, {
          date: selectedSlot.date,
          start_time: selectedSlot.startTime,
          end_time: selectedSlot.endTime,
        });

      } else {
        // Series update - TODO: implement series pattern update
        throw new Error('Series venue update not yet implemented');
      }

      setStep('success');
      onVenueUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to update venue');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedSlot, editMode, currentBooking, meeting, onVenueUpdated]);

  const handleClose = () => {
    setStep('select');
    setSelectedSlot(null);
    setSeriesPattern(null);
    setSeriesRoomId(null);
    setError(null);
    setConflicts([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/20 flex items-center justify-between bg-surface/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary font-literata">
                Edit Meeting Venue
              </h2>
              <p className="text-xs text-text-secondary">
                {meeting.title}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            className="h-8 w-8 rounded-full hover:bg-surface flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* Mode Toggle (only for recurring meetings) */}
        {meeting.series_id && (
          <div className="px-6 py-3 border-b border-border/20 bg-surface/20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-secondary uppercase">Edit Mode:</span>
              <div className="flex bg-white border border-border/30 rounded-xl p-1">
                <button
                  onClick={() => setEditMode('single')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    editMode === 'single'
                      ? "bg-primary text-white"
                      : "text-text-secondary hover:bg-surface"
                  )}
                >
                  This Occurrence
                </button>
                <button
                  onClick={() => setEditMode('series')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    editMode === 'series'
                      ? "bg-primary text-white"
                      : "text-text-secondary hover:bg-surface"
                  )}
                >
                  All Future Occurrences
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {step === 'select' && editMode === 'single' && (
            <SingleOccurrenceSelector
              meeting={meeting}
              currentBooking={currentBooking}
              onSlotSelected={handleSlotSelected}
              highlightBookingId={currentBooking?.id}
            />
          )}

          {step === 'select' && editMode === 'series' && (
            <SeriesPatternSelector
              meeting={meeting}
              onPatternSubmit={setSeriesPattern}
              onRoomSelect={setSeriesRoomId}
              selectedRoomId={seriesRoomId}
            />
          )}

          {step === 'confirm' && selectedSlot && (
            <ConfirmationStep
              original={{
                roomName: currentBooking?.room_name || null,
                ...formatDateTime(meeting.date, meeting.start_time || '00:00', meeting.end_time || '00:00'),
              }}
              new={{
                roomName: selectedSlot.roomName,
                ...formatDateTime(selectedSlot.date, selectedSlot.startTime, selectedSlot.endTime),
              }}
              conflicts={conflicts}
              isCheckingConflicts={isCheckingConflicts}
              onBack={() => setStep('select')}
              onConfirm={handleConfirm}
              isSubmitting={isSubmitting}
              error={error}
            />
          )}

          {step === 'success' && (
            <SuccessStep onClose={handleClose} />
          )}
        </div>
      </div>
    </div>
  );
}

// Helper to get room by ID
async function getRoomById(roomId: string): Promise<Room | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  return data;
}

// Single Occurrence Selector Component
interface SingleOccurrenceSelectorProps {
  meeting: EditMeetingVenueModalProps['meeting'];
  currentBooking: EditMeetingVenueModalProps['currentBooking'];
  onSlotSelected: (slot: SelectedSlot) => void;
  highlightBookingId?: string;
}

function SingleOccurrenceSelector({
  meeting,
  currentBooking,
  onSlotSelected,
  highlightBookingId,
}: SingleOccurrenceSelectorProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Record<string, (RoomBooking & { room: Room })[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => {
    // Start calendar on the week containing the meeting date
    const meetingDate = parseISO(meeting.date);
    return startOfWeek(meetingDate, { weekStartsOn: 1 });
  });
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(currentBooking?.room_id || null);

  // Load rooms and bookings
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const roomsData = await getRooms();
        setRooms(roomsData);
        
        if (!selectedRoomId && roomsData.length > 0) {
          setSelectedRoomId(roomsData[0].id);
        }

        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
        const startDate = format(days[0], 'yyyy-MM-dd');
        const endDate = format(days[6], 'yyyy-MM-dd');

        const allBookings: Record<string, (RoomBooking & { room: Room })[]> = {};
        for (const day of days) {
          allBookings[format(day, 'yyyy-MM-dd')] = [];
        }

        if (roomsData.length > 0) {
          const results = await Promise.all(
            roomsData.map((room) =>
              getRoomBookings(room.id, startDate, endDate).then((bs) => ({ room, bs }))
            )
          );

          for (const { room, bs } of results) {
            for (const booking of bs) {
              const dateKey = booking.date;
              if (!allBookings[dateKey]) allBookings[dateKey] = [];
              allBookings[dateKey].push({ ...booking, room });
            }
          }
        }

        setBookings(allBookings);
      } catch (err) {
        console.error('Error loading room schedule:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [currentDate]);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId]
  );

  // Calculate visible days
  const visibleDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [currentDate]);

  const goToPreviousWeek = () => setCurrentDate(addDays(currentDate, -7));
  const goToNextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const goToMeetingWeek = () => {
    const meetingDate = parseISO(meeting.date);
    setCurrentDate(startOfWeek(meetingDate, { weekStartsOn: 1 }));
  };

  return (
    <div className="p-6 space-y-4">
      {/* Instructions */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
        <p className="text-sm text-text-primary">
          <span className="font-bold">Select a new time slot:</span> Drag on the calendar to select a new date, time, and room for this meeting.
        </p>
      </div>

      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-text-primary font-literata">
          Room Availability
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousWeek}
            className="h-8 w-8 rounded-lg hover:bg-surface flex items-center justify-center border border-border/30"
          >
            <ChevronRight className="h-4 w-4 rotate-180 text-text-secondary" />
          </button>
          <button
            onClick={goToMeetingWeek}
            className="px-3 h-8 text-xs font-medium text-text-primary hover:bg-surface rounded-lg border border-border/30"
          >
            Meeting Week
          </button>
          <button
            onClick={goToNextWeek}
            className="h-8 w-8 rounded-lg hover:bg-surface flex items-center justify-center border border-border/30"
          >
            <ChevronRight className="h-4 w-4 text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Room Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => setSelectedRoomId(room.id)}
            className={cn(
              'shrink-0 px-4 py-2 rounded-xl border text-sm font-bold flex items-center gap-2 transition-colors',
              room.id === selectedRoomId
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-text-primary border-border/40 hover:border-primary/50'
            )}
          >
            <DoorOpen className="h-4 w-4" />
            <span className="truncate max-w-[120px]">{room.name}</span>
            <span className={cn(
              'flex items-center gap-1 text-xs font-medium',
              room.id === selectedRoomId ? 'text-white/80' : 'text-text-secondary'
            )}>
              <Users className="h-3 w-3" />
              {room.capacity}
            </span>
          </button>
        ))}
      </div>

      {/* No room selected warning */}
      {!selectedRoom && !isLoading && (
        <div className="bg-amber/10 border border-amber/30 rounded-2xl p-4 mb-4">
          <p className="text-sm text-status-amber font-medium">
            Please select a room from the tabs above to view availability and select a time slot.
          </p>
        </div>
      )}

      {/* Calendar Grid - Simplified version */}
      <div className="border border-border/30 rounded-2xl overflow-hidden">
        {/* Day Headers */}
        <div className="flex border-b border-border/30 bg-surface/50">
          <div className="w-16 shrink-0 p-3 border-r border-border/30">
            <span className="text-xs font-bold text-text-secondary">Time</span>
          </div>
          {visibleDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            const isMeetingDay = isSameDay(day, parseISO(meeting.date));
            return (
              <div
                key={format(day, 'yyyy-MM-dd')}
                className={cn(
                  'flex-1 min-w-[100px] p-2 text-center border-r border-border/30 last:border-r-0',
                  isToday && 'bg-primary/5',
                  isMeetingDay && 'bg-amber/10'
                )}
              >
                <p className="text-xs font-bold text-text-primary">{format(day, 'EEE')}</p>
                <p className={cn(
                  'text-xs',
                  isToday ? 'text-primary font-bold' : 'text-text-secondary',
                  isMeetingDay && 'text-status-amber font-bold'
                )}>
                  {format(day, 'MMM d')}
                </p>
              </div>
            );
          })}
        </div>

        {/* Calendar Body */}
        <div className="overflow-auto max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <SimpleCalendarGrid
              selectedRoom={selectedRoom}
              visibleDays={visibleDays}
              bookings={bookings}
              highlightBookingId={highlightBookingId}
              onTimeSlotSelect={(date, startTime, endTime) => {
                console.log('[PARENT] onTimeSlotSelect called:', { date, startTime, endTime, selectedRoom: selectedRoom?.id });
                if (!selectedRoom) {
                  console.log('[PARENT] No selected room, returning early');
                  return;
                }
                onSlotSelected({
                  roomId: selectedRoom.id,
                  roomName: selectedRoom.name,
                  roomCapacity: selectedRoom.capacity,
                  date: format(date, 'yyyy-MM-dd'),
                  startTime,
                  endTime,
                });
              }}
              defaultDuration={getDurationMinutes(
                meeting.start_time || '10:00',
                meeting.end_time || '11:00'
              )}
            />
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-primary/10 border border-primary/30" />
          <span className="text-text-secondary">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-blue-100 border-2 border-blue-400" />
          <span className="text-text-secondary">Current Booking</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-amber-100 border border-amber-300" />
          <span className="text-text-secondary">Meeting Date</span>
        </div>
      </div>
    </div>
  );
}

// Simple Calendar Grid Component
interface SimpleCalendarGridProps {
  selectedRoom: Room | null;
  visibleDays: Date[];
  bookings: Record<string, (RoomBooking & { room: Room; meetings?: { title: string; status: string } | null })[]>;
  highlightBookingId?: string;
  onTimeSlotSelect: (date: Date, startTime: string, endTime: string) => void;
  defaultDuration: number;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00 - 22:00
const SLOT_HEIGHT = 48;

function SimpleCalendarGrid({
  selectedRoom,
  visibleDays,
  bookings,
  highlightBookingId,
  onTimeSlotSelect,
  defaultDuration,
}: SimpleCalendarGridProps) {
  // Use refs for synchronous drag state (needed for mouseUp handler)
  const dragStartRef = useRef<{ dayIndex: number; hour: number; slot: number } | null>(null);
  const dragEndRef = useRef<{ dayIndex: number; hour: number; slot: number } | null>(null);

  // Use state for re-rendering during drag
  const [dragStart, setDragStart] = useState<{ dayIndex: number; hour: number; slot: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ dayIndex: number; hour: number; slot: number } | null>(null);

  const isDragging = dragStart !== null && dragEnd !== null;

  // Define handleMouseUp first (it reads from refs which are stable)
  const handleMouseUp = useCallback(() => {
    const start = dragStartRef.current;
    const end = dragEndRef.current;
    console.log('[DRAG] MouseUp called:', { start, end, sameDay: start && end ? start.dayIndex === end.dayIndex : false });

    // Only process if we have a valid drag start
    if (!start) {
      console.log('[DRAG] No drag start, ignoring');
      return;
    }

    if (end && start.dayIndex === end.dayIndex) {
      const day = visibleDays[start.dayIndex];
      const startMinutes = start.hour * 60 + start.slot * 30;
      const endMinutes = end.hour * 60 + end.slot * 30 + 30;

      const startTime = `${Math.floor(startMinutes / 60).toString().padStart(2, '0')}:${(startMinutes % 60).toString().padStart(2, '0')}`;
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

      console.log('[DRAG] Selection complete - calling onTimeSlotSelect:', { day: format(day, 'yyyy-MM-dd'), startTime, endTime });
      onTimeSlotSelect(day, startTime, endTime);
    } else {
      console.log('[DRAG] Selection invalid (no end or different days)');
    }

    // Clear both ref and state
    dragStartRef.current = null;
    dragEndRef.current = null;
    setDragStart(null);
    setDragEnd(null);
  }, [visibleDays, onTimeSlotSelect]);

  // Global mouse up handler - captures mouseup anywhere on window
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragStartRef.current) {
        console.log('[DRAG] Global mouseup triggered');
        handleMouseUp();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleMouseUp]);

  // Track which day column is being dragged over
  const currentDayColumnRef = useRef<{ dayIndex: number; element: HTMLElement } | null>(null);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current) return;

    // Find which day column is under the mouse
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const dayColumn = elements.find(el => el.hasAttribute('data-day-index')) as HTMLElement | undefined;

    if (dayColumn) {
      const dayIndex = parseInt(dayColumn.getAttribute('data-day-index') || '0', 10);
      currentDayColumnRef.current = { dayIndex, element: dayColumn };

      const slot = getSlotFromMouseY(e.clientY, dayColumn);
      if (slot) {
        const pos = { dayIndex, hour: slot.hour, slot: slot.slot };
        dragEndRef.current = pos;
        setDragEnd(pos);
        console.log('[DRAG] Global mousemove:', pos);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [handleGlobalMouseMove]);

  const handleMouseDown = (dayIndex: number, hour: number, slot: number) => {
    console.log('[DRAG] MouseDown:', { dayIndex, hour, slot, selectedRoom: selectedRoom?.id });
    const pos = { dayIndex, hour, slot };
    dragStartRef.current = pos;
    dragEndRef.current = pos;
    setDragStart(pos);
    setDragEnd(pos);
  };

  // Calculate slot from mouse Y position
  const getSlotFromMouseY = (clientY: number, dayColumnElement: HTMLElement): { hour: number; slot: number } | null => {
    const rect = dayColumnElement.getBoundingClientRect();
    const y = clientY - rect.top;
    const slotHeight = SLOT_HEIGHT / 2; // 24px per 30-min slot
    const slotIndex = Math.floor(y / slotHeight);
    const hour = Math.floor(slotIndex / 2) + 6; // HOURS starts at 6
    const slot = slotIndex % 2;

    console.log('[SLOT] Calculating from mouse Y:', { clientY, rectTop: rect.top, y, slotIndex, hour, slot });

    // Clamp to valid range
    if (hour < 6 || hour > 22) return null;
    return { hour, slot };
  };

  const handleMouseMove = (e: React.MouseEvent, dayIndex: number, dayColumnRef: React.RefObject<HTMLDivElement | null>) => {
    if (dragStartRef.current && dayColumnRef.current) {
      const slot = getSlotFromMouseY(e.clientY, dayColumnRef.current);
      if (slot) {
        const pos = { dayIndex, hour: slot.hour, slot: slot.slot };
        dragEndRef.current = pos;
        setDragEnd(pos);
      }
    }
  };

  const getBookingsForDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return (bookings[dateKey] || []).filter(b => b.room_id === selectedRoom?.id);
  };

  const getBookingStyle = (startTime: string, endTime: string) => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startMinutes = (sh - 6) * 60 + sm;
    const durationMinutes = (eh - sh) * 60 + (em - sm);
    return {
      top: (startMinutes / 30) * (SLOT_HEIGHT / 2),
      height: (durationMinutes / 30) * (SLOT_HEIGHT / 2),
    };
  };

  return (
    <div className="flex">
      {/* Time Column */}
      <div className="w-16 shrink-0 border-r border-border/30 bg-surface/30">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="border-b border-border/20 text-xs text-text-secondary p-1"
            style={{ height: SLOT_HEIGHT }}
          >
            {hour}:00
          </div>
        ))}
      </div>

      {/* Day Columns */}
      {visibleDays.map((day, dayIndex) => {
        const dayBookings = selectedRoom ? getBookingsForDay(day) : [];
        const isDraggingThisDay = isDragging && dragStart?.dayIndex === dayIndex;

        // Calculate selection range - use refs for immediate updates
        let selectionTop = 0;
        let selectionHeight = 0;
        if (isDraggingThisDay) {
          const start = dragStartRef.current;
          const end = dragEndRef.current;
          if (start && end && start.dayIndex === dayIndex) {
            const startSlotIndex = (start.hour - 6) * 2 + start.slot; // Offset by 6 since HOURS starts at 6
            const endSlotIndex = (end.hour - 6) * 2 + end.slot;
            const minSlot = Math.min(startSlotIndex, endSlotIndex);
            const maxSlot = Math.max(startSlotIndex, endSlotIndex);
            selectionTop = minSlot * (SLOT_HEIGHT / 2);
            selectionHeight = (maxSlot - minSlot + 1) * (SLOT_HEIGHT / 2);
            console.log('[RENDER] Selection overlay:', { dayIndex, selectionTop, selectionHeight, startSlotIndex, endSlotIndex, startHour: start.hour, endHour: end.hour });
          }
        }

        const dayColumnRef = useRef<HTMLDivElement>(null);

        return (
          <div
            ref={dayColumnRef}
            key={format(day, 'yyyy-MM-dd')}
            data-day-index={dayIndex}
            className="flex-1 min-w-[100px] relative border-r border-border/30 last:border-r-0 bg-white/50"
            style={{ height: HOURS.length * SLOT_HEIGHT }}
            onMouseUp={() => { if (selectedRoom) handleMouseUp(); }}
          >
            {/* Time slots - must be z-30 to capture events above bookings */}
            {HOURS.map((hour) => (
              <div key={hour} className="border-b border-border/10 relative z-30" style={{ height: SLOT_HEIGHT }}>
                {/* :00 slot */}
                <div
                  className={cn(
                    "border-b border-dashed border-border/10 relative block",
                    selectedRoom ? "hover:bg-primary/30 cursor-crosshair" : "cursor-not-allowed bg-gray-50"
                  )}
                  style={{ height: SLOT_HEIGHT / 2, width: '100%', display: 'block' }}
                  onMouseDown={(e) => {
                    console.log('[EVENT] slot :00 mousedown', { dayIndex, hour, hasSelectedRoom: !!selectedRoom });
                    e.stopPropagation();
                    if (selectedRoom) handleMouseDown(dayIndex, hour, 0);
                  }}
                />
                {/* :30 slot */}
                <div
                  className={cn(
                    "relative block",
                    selectedRoom ? "hover:bg-primary/30 cursor-crosshair" : "cursor-not-allowed bg-gray-50"
                  )}
                  style={{ height: SLOT_HEIGHT / 2, width: '100%', display: 'block' }}
                  onMouseDown={(e) => {
                    console.log('[EVENT] slot :30 mousedown', { dayIndex, hour, hasSelectedRoom: !!selectedRoom });
                    e.stopPropagation();
                    if (selectedRoom) handleMouseDown(dayIndex, hour, 1);
                  }}
                />
              </div>
            ))}

            {/* Bookings */}
            {dayBookings.map((booking) => {
              const { top, height } = getBookingStyle(booking.start_time, booking.end_time);
              const isCurrentBooking = booking.id === highlightBookingId;
              
              return (
                <div
                  key={booking.id}
                  className={cn(
                    "absolute left-1 right-1 rounded-md p-1 text-[10px] overflow-hidden cursor-pointer z-10",
                    isCurrentBooking
                      ? "bg-blue-100 border-2 border-blue-400 text-blue-800"
                      : "bg-primary/10 border border-primary/30 text-primary"
                  )}
                  style={{ top, height: Math.max(height - 2, 20) }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <p className="font-bold truncate">{booking.meetings?.title || 'Meeting'}</p>
                  <p className="opacity-75">{booking.start_time.slice(0, 5)}-{booking.end_time.slice(0, 5)}</p>
                </div>
              );
            })}

            {/* Selection overlay */}
            {isDraggingThisDay && (
              <div
                className="absolute left-0.5 right-0.5 bg-primary/40 border-2 border-primary shadow-lg rounded-md z-20 pointer-events-none"
                style={{ top: selectionTop, height: Math.max(selectionHeight, 24) }}
              >
                {/* Time label inside selection */}
                <div className="absolute top-0 left-1 right-1 flex justify-between items-start pt-0.5">
                  <span className="text-[9px] font-bold text-primary-foreground bg-primary/80 px-1 rounded">
                    {(dragStart && dragEnd) && (() => {
                      const startSlot = Math.min(
                        dragStart.hour * 2 + dragStart.slot,
                        dragEnd.hour * 2 + dragEnd.slot
                      );
                      const startMinutes = startSlot * 30;
                      const startH = Math.floor(startMinutes / 60);
                      const startM = startMinutes % 60;
                      return `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
                    })()}
                  </span>
                  {selectionHeight > 40 && (
                    <span className="text-[9px] font-bold text-primary-foreground bg-primary/80 px-1 rounded">
                      {(dragStart && dragEnd) && (() => {
                        const endSlot = Math.max(
                          dragStart.hour * 2 + dragStart.slot,
                          dragEnd.hour * 2 + dragEnd.slot
                        ) + 1;
                        const endMinutes = endSlot * 30;
                        const endH = Math.floor(endMinutes / 60);
                        const endM = endMinutes % 60;
                        return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
                      })()}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Global mouse up handler */}
      {isDragging && (
        <div
          className="fixed inset-0 z-50 cursor-crosshair"
          onMouseUp={handleMouseUp}
        />
      )}
    </div>
  );
}

// Series Pattern Selector Component
interface SeriesPatternSelectorProps {
  meeting: EditMeetingVenueModalProps['meeting'];
  onPatternSubmit: (pattern: SeriesPattern) => void;
  onRoomSelect: (roomId: string) => void;
  selectedRoomId: string | null;
}

function SeriesPatternSelector({
  meeting,
  onPatternSubmit,
  onRoomSelect,
  selectedRoomId,
}: SeriesPatternSelectorProps) {
  const [frequency, setFrequency] = useState<'weekly' | 'bi-weekly' | 'monthly'>('weekly');
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);
  const [startTime, setStartTime] = useState(meeting.start_time?.slice(0, 5) || '10:00');
  const [durationMinutes, setDurationMinutes] = useState(() => {
    if (meeting.start_time && meeting.end_time) {
      const [sh, sm] = meeting.start_time.split(':').map(Number);
      const [eh, em] = meeting.end_time.split(':').map(Number);
      return (eh - sh) * 60 + (em - sm);
    }
    return 60;
  });
  const [rooms, setRooms] = useState<Room[]>([]);

  useState(() => {
    getRooms().then(setRooms);
  });

  const toggleDay = (day: string) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = () => {
    onPatternSubmit({
      frequency,
      daysOfWeek,
      startTime,
      durationMinutes,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-sm text-amber-800">
          <span className="font-bold">Series Mode:</span> Configure the recurrence pattern and room for all future occurrences. The system will check room availability for each occurrence.
        </p>
      </div>

      {/* Frequency */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-text-secondary uppercase">Frequency</label>
        <div className="flex gap-2">
          {(['weekly', 'bi-weekly', 'monthly'] as const).map((freq) => (
            <button
              key={freq}
              onClick={() => setFrequency(freq)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold border transition-all",
                frequency === freq
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-text-primary border-border/40 hover:border-primary/50"
              )}
            >
              {freq === 'weekly' ? 'Weekly' : freq === 'bi-weekly' ? 'Bi-Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      {/* Days of Week */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-text-secondary uppercase">Repeat On</label>
        <div className="flex gap-2">
          {['M', 'T', 'W', 'Th', 'F'].map((day) => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-all border",
                daysOfWeek.includes(day)
                  ? "bg-primary text-white border-primary"
                  : "bg-status-grey-bg text-text-primary border-transparent hover:bg-cream"
              )}
            >
              {day === 'Th' ? 'T' : day}
            </button>
          ))}
        </div>
      </div>

      {/* Time and Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-text-secondary uppercase">Start Time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-4 py-3 bg-surface border border-border/50 rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-text-secondary uppercase">Duration (minutes)</label>
          <input
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
            min={15}
            max={480}
            step={15}
            className="w-full px-4 py-3 bg-surface border border-border/50 rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Room Selection */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-text-secondary uppercase">Select Room</label>
        <div className="grid grid-cols-2 gap-2">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => onRoomSelect(room.id)}
              className={cn(
                "p-4 rounded-xl border text-left transition-all",
                selectedRoomId === room.id
                  ? "bg-primary/5 border-primary"
                  : "bg-white border-border/40 hover:border-primary/30"
              )}
            >
              <div className="flex items-center gap-2">
                <DoorOpen className={cn(
                  "h-4 w-4",
                  selectedRoomId === room.id ? "text-primary" : "text-text-secondary"
                )} />
                <span className={cn(
                  "font-bold text-sm",
                  selectedRoomId === room.id ? "text-primary" : "text-text-primary"
                )}>
                  {room.name}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Capacity: {room.capacity}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Confirmation Step Component
interface ConfirmationStepProps {
  original: {
    roomName: string | null;
    date: string;
    time: string;
  };
  new: {
    roomName: string;
    date: string;
    time: string;
  };
  conflicts: ConflictInfo[];
  isCheckingConflicts: boolean;
  onBack: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  error: string | null;
}

function ConfirmationStep({
  original,
  new: newVenue,
  conflicts,
  isCheckingConflicts,
  onBack,
  onConfirm,
  isSubmitting,
  error,
}: ConfirmationStepProps) {
  return (
    <div className="p-6 space-y-6">
      <h3 className="text-lg font-bold text-text-primary font-literata">
        Confirm Changes
      </h3>

      {/* Change Summary */}
      <div className="grid grid-cols-2 gap-4">
        {/* Before */}
        <div className="bg-surface/50 border border-border/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 bg-text-tertiary/20 text-text-tertiary rounded text-[10px] font-bold uppercase">
              Before
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <DoorOpen className="h-4 w-4 text-text-secondary" />
              <span className="text-text-secondary">
                {original.roomName || 'No room assigned'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-text-secondary" />
              <span className="text-text-secondary">{original.date}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-text-secondary" />
              <span className="text-text-secondary">{original.time}</span>
            </div>
          </div>
        </div>

        {/* After */}
        <div className="bg-primary/5 border border-primary/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 bg-primary text-white rounded text-[10px] font-bold uppercase">
              After
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <DoorOpen className="h-4 w-4 text-primary" />
              <span className="font-bold text-text-primary">{newVenue.roomName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-bold text-text-primary">{newVenue.date}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-bold text-text-primary">{newVenue.time}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Conflict Warning */}
      {isCheckingConflicts ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="h-5 w-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-amber-800">Checking for conflicts...</p>
        </div>
      ) : conflicts.length > 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 mb-2">
                Scheduling Conflicts Detected
              </p>
              <p className="text-xs text-amber-700 mb-2">
                The following participants have conflicting meetings:
              </p>
              <ul className="space-y-1">
                {conflicts.map((c, i) => (
                  <li key={i} className="text-xs text-amber-700">
                    • {c.userName}: {c.meetingTitle}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-amber-600 mt-2">
                You can proceed, but these participants may not be able to attend.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-mint border border-status-green rounded-2xl p-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-status-green" />
          <p className="text-sm text-status-green font-medium">
            No scheduling conflicts detected
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-coral-bg border border-coral-text/20 rounded-2xl p-4">
          <p className="text-sm text-coral-text">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/20">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="px-5 py-2.5 text-sm font-bold text-text-secondary hover:bg-surface rounded-xl transition-colors"
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={isSubmitting || isCheckingConflicts}
          className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-md transition-all hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Confirm Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Success Step Component
function SuccessStep({ onClose }: { onClose: () => void }) {
  return (
    <div className="p-12 text-center space-y-4">
      <div className="h-16 w-16 rounded-full bg-mint flex items-center justify-center mx-auto">
        <Check className="h-8 w-8 text-status-green" />
      </div>
      <h3 className="text-xl font-bold text-text-primary font-literata">
        Venue Updated Successfully
      </h3>
      <p className="text-sm text-text-secondary">
        The meeting venue and schedule have been updated.
      </p>
      <button
        onClick={onClose}
        className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-md transition-all hover:bg-primary/90"
      >
        Done
      </button>
    </div>
  );
}

// Helper function for duration calculation
function getDurationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh - sh) * 60 + (em - sm);
}
