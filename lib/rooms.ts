/**
 * Room Management and Booking Operations
 *
 * Provides functions for managing meeting rooms, checking availability,
 * booking rooms for meetings, and handling recurrent bookings.
 */

import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/types/supabase';

export type Room = Database['public']['Tables']['rooms']['Row'];
export type RoomBooking = Database['public']['Tables']['room_bookings']['Row'];

export interface CreateRoomInput {
  name: string;
  capacity: number;
}

export interface UpdateRoomInput {
  name?: string;
  capacity?: number;
}

export interface BookRoomInput {
  roomId: string;
  meetingId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface RoomAvailabilityResult {
  isAvailable: boolean;
  conflictingMeetings?: Array<{
    meetingId: string;
    meetingTitle: string;
    startTime: string;
    endTime: string;
  }>;
}

export interface AlternativeSlot {
  date: string;
  startTime: string;
  endTime: string;
}

export interface BookingResult {
  success: boolean;
  bookingId?: string;
  error?: string;
  suggestions?: AlternativeSlot[];
}

export interface RecurrentBookingResult {
  success: boolean;
  bookedCount: number;
  failedDates: Array<{
    date: string;
    startTime: string;
    error: string;
    suggestions?: AlternativeSlot[];
  }>;
  totalOccurrences: number;
}

/**
 * Get all rooms
 */
export async function getRooms(): Promise<Room[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching rooms:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get a single room by ID
 */
export async function getRoom(roomId: string): Promise<Room | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  
  if (error) {
    console.error('Error fetching room:', error);
    return null;
  }
  
  return data;
}

/**
 * Create a new room
 */
export async function createRoom(input: CreateRoomInput): Promise<string> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      name: input.name.trim(),
      capacity: input.capacity,
    })
    .select('id')
    .single();
  
  if (error) {
    console.error('Error creating room:', error);
    throw error;
  }
  
  return data.id;
}

/**
 * Update a room
 */
export async function updateRoom(roomId: string, input: UpdateRoomInput): Promise<void> {
  const supabase = createClient();
  
  const updateData: Partial<Room> = {
    updated_at: new Date().toISOString(),
  };
  
  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.capacity !== undefined) updateData.capacity = input.capacity;
  
  const { error } = await supabase
    .from('rooms')
    .update(updateData)
    .eq('id', roomId);
  
  if (error) {
    console.error('Error updating room:', error);
    throw error;
  }
}

/**
 * Delete a room
 */
export async function deleteRoom(roomId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', roomId);
  
  if (error) {
    console.error('Error deleting room:', error);
    throw error;
  }
}

/**
 * Check if a room is available for a specific time slot
 */
export async function checkRoomAvailability(
  roomId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeMeetingId?: string
): Promise<RoomAvailabilityResult> {
  const supabase = createClient();
  
  // Use the database function for availability check
  const { data, error } = await supabase
    .rpc('check_room_availability', {
      p_room_id: roomId,
      p_date: date,
      p_start_time: startTime,
      p_end_time: endTime,
      p_exclude_meeting_id: excludeMeetingId,
    });
  
  if (error) {
    console.error('Error checking room availability:', error);
    throw error;
  }
  
  // If not available, get conflicting meetings
  if (!data) {
    const { data: conflicts } = await supabase
      .from('room_bookings')
      .select(`
        meeting_id,
        start_time,
        end_time,
        meetings:meeting_id(title)
      `)
      .eq('room_id', roomId)
      .eq('date', date)
      .eq('status', 'confirmed')
      .lt('start_time', endTime)
      .gt('end_time', startTime);
    
    return {
      isAvailable: false,
      conflictingMeetings: (conflicts || []).map((c: any) => ({
        meetingId: c.meeting_id,
        meetingTitle: c.meetings?.title || 'Unknown Meeting',
        startTime: c.start_time,
        endTime: c.end_time,
      })),
    };
  }
  
  return { isAvailable: true };
}

/**
 * Get available rooms for a specific time slot
 */
export async function getAvailableRooms(
  date: string,
  startTime: string,
  endTime: string,
  capacity?: number,
  excludeMeetingId?: string
): Promise<Room[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .rpc('get_available_rooms', {
      p_date: date,
      p_start_time: startTime,
      p_end_time: endTime,
      p_capacity: capacity || undefined,
      p_exclude_meeting_id: excludeMeetingId || undefined,
    });
  
  if (error) {
    console.error('Error fetching available rooms:', error);
    throw error;
  }
  
  return (data || []).map((r: any) => ({
    id: r.room_id,
    name: r.room_name,
    capacity: r.room_capacity,
    created_at: new Date().toISOString() as unknown as string,
    updated_at: new Date().toISOString() as unknown as string,
  })) as Room[];
}

/**
 * Per-date availability info for a room.
 * `conflict` is non-null when the room is already booked in the requested window.
 */
export interface RoomDateAvailability {
  date: string;
  available: boolean;
  conflict: {
    meetingId: string;
    meetingTitle: string;
    startTime: string;
    endTime: string;
  } | null;
}

export interface RoomAvailabilityForDates {
  room: Room;
  perDate: RoomDateAvailability[];
  availableCount: number;
  totalCount: number;
}

/**
 * Get availability for every capacity-matching room across a set of dates,
 * using a single batched query over `room_bookings`. Used by the Schedule
 * page to evaluate recurring meetings up-front (pre-submit).
 */
export async function getRoomAvailabilityForDates(
  dates: string[],
  startTime: string,
  endTime: string,
  minCapacity?: number,
  excludeMeetingId?: string
): Promise<RoomAvailabilityForDates[]> {
  const supabase = createClient();

  if (dates.length === 0) return [];

  // 1. Fetch candidate rooms (capacity filter).
  let roomQuery = supabase.from('rooms').select('*').order('name');
  if (minCapacity && minCapacity > 0) {
    roomQuery = roomQuery.gte('capacity', minCapacity);
  }
  const { data: roomRows, error: roomErr } = await roomQuery;
  if (roomErr) {
    console.error('Error fetching rooms for availability:', roomErr);
    throw roomErr;
  }
  const rooms = (roomRows || []) as Room[];
  if (rooms.length === 0) return [];

  // 2. Fetch all overlapping confirmed bookings for the requested dates in
  //    one round-trip. Overlap test: existing.start < requested.end AND
  //    existing.end > requested.start.
  const uniqueDates = Array.from(new Set(dates));
  let bookingQuery = supabase
    .from('room_bookings')
    .select(`
      room_id,
      meeting_id,
      date,
      start_time,
      end_time,
      meetings:meeting_id(title)
    `)
    .in('date', uniqueDates)
    .eq('status', 'confirmed')
    .lt('start_time', endTime)
    .gt('end_time', startTime);
  if (excludeMeetingId) {
    bookingQuery = bookingQuery.neq('meeting_id', excludeMeetingId);
  }
  const { data: bookings, error: bookingErr } = await bookingQuery;
  if (bookingErr) {
    console.error('Error fetching bookings for availability:', bookingErr);
    throw bookingErr;
  }

  // 3. Index conflicts by roomId -> date.
  const conflictMap = new Map<string, Map<string, RoomDateAvailability['conflict']>>();
  for (const b of (bookings || []) as any[]) {
    if (!conflictMap.has(b.room_id)) conflictMap.set(b.room_id, new Map());
    conflictMap.get(b.room_id)!.set(b.date, {
      meetingId: b.meeting_id,
      meetingTitle: b.meetings?.title || 'Another meeting',
      startTime: b.start_time,
      endTime: b.end_time,
    });
  }

  // 4. Build per-room result, preserving the caller-provided date order.
  return rooms.map((room) => {
    const perRoomConflicts = conflictMap.get(room.id);
    const perDate: RoomDateAvailability[] = dates.map((d) => {
      const conflict = perRoomConflicts?.get(d) || null;
      return { date: d, available: !conflict, conflict };
    });
    const availableCount = perDate.filter((p) => p.available).length;
    return {
      room,
      perDate,
      availableCount,
      totalCount: perDate.length,
    };
  });
}

/**
 * Suggest alternative time slots for a room
 */
export async function suggestAlternativeSlots(
  roomId: string,
  date: string,
  startTime: string,
  durationMinutes: number,
  searchRangeHours: number = 4
): Promise<AlternativeSlot[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .rpc('suggest_alternative_slots', {
      p_room_id: roomId,
      p_date: date,
      p_start_time: startTime,
      p_duration_minutes: durationMinutes,
      p_search_range_hours: searchRangeHours,
    });
  
  if (error) {
    console.error('Error suggesting alternative slots:', error);
    throw error;
  }
  
  return (data || []).map((s: any) => ({
    date: s.suggested_date,
    startTime: s.suggested_start_time,
    endTime: s.suggested_end_time,
  }));
}

/**
 * Book a room for a meeting
 */
export async function bookRoom(input: BookRoomInput): Promise<BookingResult> {
  const supabase = createClient();
  
  // Check availability first
  const availability = await checkRoomAvailability(
    input.roomId,
    input.date,
    input.startTime,
    input.endTime,
    input.meetingId
  );
  
  if (!availability.isAvailable) {
    // Get suggestions
    const duration = calculateDurationMinutes(input.startTime, input.endTime);
    const suggestions = await suggestAlternativeSlots(
      input.roomId,
      input.date,
      input.startTime,
      duration
    );
    
    return {
      success: false,
      error: 'Room is not available for the selected time slot',
      suggestions,
    };
  }
  
  // Create the booking
  const { data, error } = await supabase
    .from('room_bookings')
    .insert({
      room_id: input.roomId,
      meeting_id: input.meetingId,
      date: input.date,
      start_time: input.startTime,
      end_time: input.endTime,
      status: 'confirmed',
    })
    .select('id')
    .single();
  
  if (error) {
    console.error('Error booking room:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      const duration = calculateDurationMinutes(input.startTime, input.endTime);
      const suggestions = await suggestAlternativeSlots(
        input.roomId,
        input.date,
        input.startTime,
        duration
      );
      
      return {
        success: false,
        error: 'Room was just booked by someone else. Please select a different time.',
        suggestions,
      };
    }
    
    throw error;
  }
  
  // Update meeting with room_id
  const { error: updateError } = await supabase
    .from('meetings')
    .update({ room_id: input.roomId })
    .eq('id', input.meetingId);
  
  if (updateError) {
    console.error('Error updating meeting with room:', updateError);
    // Don't throw here, booking is still successful
  }
  
  return {
    success: true,
    bookingId: data.id,
  };
}

/**
 * Book a room for multiple meeting occurrences (recurrent meetings)
 * Attempts to book all occurrences, skips unavailable ones, reports errors
 */
export async function bookRoomForRecurrentMeetings(
  roomId: string,
  meetings: Array<{
    meetingId: string;
    date: string;
    startTime: string;
    endTime: string;
  }>
): Promise<RecurrentBookingResult> {
  const supabase = createClient();
  
  const results: RecurrentBookingResult = {
    success: true,
    bookedCount: 0,
    failedDates: [],
    totalOccurrences: meetings.length,
  };
  
  // Process each meeting
  for (const meeting of meetings) {
    try {
      // Check availability
      const availability = await checkRoomAvailability(
        roomId,
        meeting.date,
        meeting.startTime,
        meeting.endTime,
        meeting.meetingId
      );
      
      if (!availability.isAvailable) {
        // Get suggestions for this slot
        const duration = calculateDurationMinutes(meeting.startTime, meeting.endTime);
        const suggestions = await suggestAlternativeSlots(
          roomId,
          meeting.date,
          meeting.startTime,
          duration
        );
        
        results.failedDates.push({
          date: meeting.date,
          startTime: meeting.startTime,
          error: 'Room not available',
          suggestions,
        });
        continue;
      }
      
      // Book the room
      const { error: bookingError } = await supabase
        .from('room_bookings')
        .insert({
          room_id: roomId,
          meeting_id: meeting.meetingId,
          date: meeting.date,
          start_time: meeting.startTime,
          end_time: meeting.endTime,
          status: 'confirmed',
        });
      
      if (bookingError) {
        if (bookingError.code === '23505') {
          const duration = calculateDurationMinutes(meeting.startTime, meeting.endTime);
          const suggestions = await suggestAlternativeSlots(
            roomId,
            meeting.date,
            meeting.startTime,
            duration
          );
          
          results.failedDates.push({
            date: meeting.date,
            startTime: meeting.startTime,
            error: 'Room was just booked by someone else',
            suggestions,
          });
        } else {
          results.failedDates.push({
            date: meeting.date,
            startTime: meeting.startTime,
            error: bookingError.message,
          });
        }
        continue;
      }
      
      // Update meeting with room_id
      const { error: updateError } = await supabase
        .from('meetings')
        .update({ room_id: roomId })
        .eq('id', meeting.meetingId);
      
      if (updateError) {
        console.error('Error updating meeting with room:', updateError);
      }
      
      results.bookedCount++;
      
    } catch (err: any) {
      results.failedDates.push({
        date: meeting.date,
        startTime: meeting.startTime,
        error: err.message || 'Unknown error',
      });
    }
  }
  
  results.success = results.failedDates.length === 0;
  return results;
}

/**
 * Cancel a room booking
 */
export async function cancelRoomBooking(
  roomId: string,
  meetingId: string,
  date: string
): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('room_bookings')
    .update({ status: 'cancelled' })
    .eq('room_id', roomId)
    .eq('meeting_id', meetingId)
    .eq('date', date);
  
  if (error) {
    console.error('Error cancelling room booking:', error);
    throw error;
  }
  
  // Remove room_id from meeting
  const { error: updateError } = await supabase
    .from('meetings')
    .update({ room_id: null })
    .eq('id', meetingId);
  
  if (updateError) {
    console.error('Error removing room from meeting:', updateError);
  }
}

/**
 * Get room bookings for a specific date range
 */
export async function getRoomBookings(
  roomId: string,
  startDate: string,
  endDate: string
): Promise<Array<RoomBooking & { meetings?: { title: string; status: string; series_id: string | null } | null }>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('room_bookings')
    .select(`
      *,
      meetings:meeting_id(title, status, series_id)
    `)
    .eq('room_id', roomId)
    .gte('date', startDate)
    .lte('date', endDate)
    .eq('status', 'confirmed')
    .order('date')
    .order('start_time');

  if (error) {
    console.error('Error fetching room bookings:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get all room bookings for a date (for calendar view)
 */
export async function getAllRoomBookingsForDate(
  date: string
): Promise<Array<RoomBooking & { room: Room; meeting_title?: string }>> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('room_bookings')
    .select(`
      *,
      room:room_id(*),
      meetings:meeting_id(title)
    `)
    .eq('date', date)
    .eq('status', 'confirmed')
    .order('start_time');
  
  if (error) {
    console.error('Error fetching room bookings:', error);
    throw error;
  }
  
  return (data || []).map((b: any) => ({
    ...b,
    meeting_title: b.meetings?.title,
  }));
}

/**
 * Helper function to calculate duration in minutes between two times
 */
function calculateDurationMinutes(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;
  
  return endTotal - startTotal;
}

/**
 * Update a room booking (e.g., change time)
 */
export async function updateRoomBooking(
  bookingId: string,
  updates: {
    startTime?: string;
    endTime?: string;
    status?: 'confirmed' | 'cancelled' | 'tentative';
  }
): Promise<void> {
  const supabase = createClient();
  
  const updateData: Partial<RoomBooking> = {
    updated_at: new Date().toISOString(),
  };
  
  if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
  if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
  if (updates.status !== undefined) updateData.status = updates.status;
  
  const { error } = await supabase
    .from('room_bookings')
    .update(updateData)
    .eq('id', bookingId);
  
  if (error) {
    console.error('Error updating room booking:', error);
    throw error;
  }
}
