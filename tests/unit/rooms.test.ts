/**
 * Unit Tests for Room Management Functions (lib/rooms.ts)
 *
 * These tests validate the CRUD operations and booking functions
 * that developers must implement in lib/rooms.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  checkRoomAvailability,
  getAvailableRooms,
  bookRoom,
  bookRoomForRecurrentMeetings,
  cancelRoomBooking,
  getRoomBookings,
  getAllRoomBookingsForDate,
  suggestAlternativeSlots,
  updateRoomBooking,
  type CreateRoomInput,
  type UpdateRoomInput,
  type BookRoomInput,
  type Room,
  type RoomBooking,
} from '../../lib/rooms';

// Mock the Supabase client
vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

const mockSupabaseClient = {
  from: vi.fn(() => mockQueryBuilder),
  rpc: vi.fn(() => mockQueryBuilder),
};

const mockQueryBuilder = {
  select: vi.fn(() => mockQueryBuilder),
  insert: vi.fn(() => mockQueryBuilder),
  update: vi.fn(() => mockQueryBuilder),
  delete: vi.fn(() => mockQueryBuilder),
  eq: vi.fn(() => mockQueryBuilder),
  in: vi.fn(() => mockQueryBuilder),
  order: vi.fn(() => mockQueryBuilder),
  single: vi.fn(() => Promise.resolve({ data: { id: 'booking-1' }, error: null })),
  match: vi.fn(() => mockQueryBuilder),
  limit: vi.fn(() => mockQueryBuilder),
  gte: vi.fn(() => mockQueryBuilder),
  lte: vi.fn(() => mockQueryBuilder),
  gt: vi.fn(() => mockQueryBuilder),
  lt: vi.fn(() => mockQueryBuilder),
  then: vi.fn((cb: any) => cb({ data: [], error: null })),
};


describe('Room CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRooms', () => {
    it('should fetch all rooms ordered by name', async () => {
      const mockRooms: Room[] = [
        { id: 'room-1', name: 'Conference Room A', capacity: 10, created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 'room-2', name: 'Meeting Room B', capacity: 6, created_at: '2024-01-01', updated_at: '2024-01-01' },
      ];

      mockQueryBuilder.order.mockReturnValueOnce({
        then: (cb: any) => cb({ data: mockRooms, error: null }),
      });

      const result = await getRooms();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('rooms');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('name');
      expect(result).toEqual(mockRooms);
    });

    it('should return empty array when no rooms exist', async () => {
      mockQueryBuilder.order.mockReturnValueOnce({
        then: (cb: any) => cb({ data: [], error: null }),
      });

      const result = await getRooms();

      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockQueryBuilder.order.mockReturnValueOnce({
        then: (cb: any) => cb({ data: null, error: new Error('Database error') }),
      });

      await expect(getRooms()).rejects.toThrow('Database error');
    });
  });

  describe('getRoom', () => {
    it('should fetch a single room by ID', async () => {
      const mockRoom: Room = {
        id: 'room-1',
        name: 'Conference Room A',
        capacity: 10,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      mockQueryBuilder.single.mockResolvedValueOnce({ data: mockRoom, error: null });

      const result = await getRoom('room-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('rooms');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'room-1');
      expect(result).toEqual(mockRoom);
    });

    it('should return null for non-existent room', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await getRoom('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createRoom', () => {
    it('should create a room with trimmed name', async () => {
      const input: CreateRoomInput = { name: '  Conference Room A  ', capacity: 10 };
      const mockResult = { id: 'new-room-id' };

      mockQueryBuilder.single.mockResolvedValueOnce({ data: mockResult, error: null });

      const result = await createRoom(input);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('rooms');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        name: 'Conference Room A',
        capacity: 10,
      });
      expect(result).toBe('new-room-id');
    });

    it('should throw error on creation failure', async () => {
      const input: CreateRoomInput = { name: 'Room A', capacity: 10 };

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Duplicate name'),
      });

      await expect(createRoom(input)).rejects.toThrow('Duplicate name');
    });
  });

  describe('updateRoom', () => {
    it('should update room with trimmed name', async () => {
      const input: UpdateRoomInput = { name: '  Updated Room  ', capacity: 15 };

      mockQueryBuilder.then.mockImplementationOnce((cb: any) => cb({ error: null }));

      await updateRoom('room-1', input);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('rooms');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Room',
          capacity: 15,
          updated_at: expect.any(String),
        })
      );
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'room-1');
    });

    it('should only update provided fields', async () => {
      const input: UpdateRoomInput = { capacity: 20 };

      mockQueryBuilder.then.mockImplementationOnce((cb: any) => cb({ error: null }));

      await updateRoom('room-1', input);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          capacity: 20,
          updated_at: expect.any(String),
        })
      );
    });
  });

  describe('deleteRoom', () => {
    it('should delete room by ID', async () => {
      mockQueryBuilder.then.mockImplementationOnce((cb: any) => cb({ error: null }));

      await deleteRoom('room-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('rooms');
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'room-1');
    });

    it('should throw error on deletion failure', async () => {
      mockQueryBuilder.then.mockImplementationOnce((cb: any) =>
        cb({ error: new Error('Foreign key constraint') })
      );

      await expect(deleteRoom('room-1')).rejects.toThrow('Foreign key constraint');
    });
  });
});

describe('Room Availability Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkRoomAvailability', () => {
    it('should return available=true when room is free', async () => {
      mockQueryBuilder.then.mockImplementationOnce((cb: any) => cb({ data: true, error: null }));

      const result = await checkRoomAvailability('room-1', '2024-01-15', '10:00', '11:00');

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('check_room_availability', {
        p_room_id: 'room-1',
        p_date: '2024-01-15',
        p_start_time: '10:00',
        p_end_time: '11:00',
        p_exclude_meeting_id: undefined,
      });
      expect(result.isAvailable).toBe(true);
    });

    it('should return available=false with conflicting meetings when room is busy', async () => {
      mockQueryBuilder.then
        .mockImplementationOnce((cb: any) => cb({ data: false, error: null }))
        .mockImplementationOnce((cb: any) =>
          cb({
            data: [
              {
                meeting_id: 'meeting-1',
                start_time: '10:00',
                end_time: '11:00',
                meetings: { title: 'Team Standup' },
              },
            ],
            error: null,
          })
        );

      const result = await checkRoomAvailability('room-1', '2024-01-15', '10:00', '11:00');

      expect(result.isAvailable).toBe(false);
      expect(result.conflictingMeetings).toHaveLength(1);
      expect(result.conflictingMeetings?.[0].meetingTitle).toBe('Team Standup');
    });

    it('should accept optional excludeMeetingId parameter', async () => {
      mockQueryBuilder.then.mockImplementationOnce((cb: any) => cb({ data: true, error: null }));

      await checkRoomAvailability('room-1', '2024-01-15', '10:00', '11:00', 'current-meeting');

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'check_room_availability',
        expect.objectContaining({
          p_exclude_meeting_id: 'current-meeting',
        })
      );
    });
  });

  describe('getAvailableRooms', () => {
    it('should fetch available rooms for time slot', async () => {
      const mockAvailableRooms = [
        { room_id: 'room-1', room_name: 'Conference Room A', room_capacity: 10 },
        { room_id: 'room-2', room_name: 'Meeting Room B', room_capacity: 6 },
      ];

      mockQueryBuilder.then.mockImplementationOnce((cb: any) =>
        cb({ data: mockAvailableRooms, error: null })
      );

      const result = await getAvailableRooms('2024-01-15', '10:00', '11:00');

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_available_rooms', {
        p_date: '2024-01-15',
        p_start_time: '10:00',
        p_end_time: '11:00',
        p_capacity: undefined,
        p_exclude_meeting_id: undefined,
      });
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Conference Room A');
    });

    it('should filter by capacity when provided', async () => {
      mockQueryBuilder.then.mockImplementationOnce((cb: any) => cb({ data: [], error: null }));

      await getAvailableRooms('2024-01-15', '10:00', '11:00', 8);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'get_available_rooms',
        expect.objectContaining({
          p_capacity: 8,
        })
      );
    });
  });

  describe('suggestAlternativeSlots', () => {
    it('should return alternative time slots from RPC function', async () => {
      const mockSlots = [
        { suggested_date: '2024-01-15', suggested_start_time: '11:00', suggested_end_time: '12:00' },
        { suggested_date: '2024-01-15', suggested_start_time: '14:00', suggested_end_time: '15:00' },
      ];

      mockQueryBuilder.then.mockImplementationOnce((cb: any) =>
        cb({ data: mockSlots, error: null })
      );

      const result = await suggestAlternativeSlots('room-1', '2024-01-15', '10:00', 60);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('suggest_alternative_slots', {
        p_room_id: 'room-1',
        p_date: '2024-01-15',
        p_start_time: '10:00',
        p_duration_minutes: 60,
        p_search_range_hours: 4,
      });
      expect(result).toHaveLength(2);
      expect(result[0].startTime).toBe('11:00');
    });
  });
});

describe('Room Booking Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('bookRoom', () => {
    it('should successfully book an available room', async () => {
      // Mock availability check - available
      mockQueryBuilder.then
        .mockImplementationOnce((cb: any) => cb({ data: true, error: null }));
      
      // Mock insert - booking created  
      mockQueryBuilder.single.mockResolvedValueOnce({ data: { id: 'booking-1' }, error: null });
      
      // Mock update meeting
      mockQueryBuilder.then.mockImplementationOnce((cb: any) => cb({ error: null }));

      const input: BookRoomInput = {
        roomId: 'room-1',
        meetingId: 'meeting-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '11:00',
      };

      const result = await bookRoom(input);

      expect(result.success).toBe(true);
      expect(result.bookingId).toBe('booking-1');
    });

    it('should return failure with suggestions when room is unavailable', async () => {
      const mockSuggestions = [
        { suggested_date: '2024-01-15', suggested_start_time: '11:00', suggested_end_time: '12:00' },
      ];

      // Mock: 1) availability check (unavailable), 2) conflicts query, 3) suggestions
      let thenCallCount = 0;
      mockQueryBuilder.then.mockImplementation((cb: any) => {
        thenCallCount++;
        if (thenCallCount === 1) return cb({ data: false, error: null }); // Check availability - not available
        if (thenCallCount === 2) return cb({ data: [], error: null }); // Get conflicting meetings
        if (thenCallCount === 3) return cb({ data: mockSuggestions, error: null }); // Get suggestions
        return cb({ data: [], error: null });
      });

      // This mock shouldn't be called since room is unavailable, but set it up anyway
      mockQueryBuilder.single.mockImplementation(() => Promise.resolve({ data: null, error: null }));

      const input: BookRoomInput = {
        roomId: 'room-1',
        meetingId: 'meeting-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '11:00',
      };

      const result = await bookRoom(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
      expect(result.suggestions).toHaveLength(1);
    });

    it('should handle unique constraint violation (concurrent booking)', async () => {
      const mockSuggestions = [
        { suggested_date: '2024-01-15', suggested_start_time: '11:00', suggested_end_time: '12:00' },
      ];

      // Mock single() to return error for insert
      mockQueryBuilder.single.mockImplementation(() => 
        Promise.resolve({ data: null, error: { code: '23505', message: 'Duplicate booking' } })
      );

      // Mock in sequence: availability check (available), suggestions for recovery
      let thenCallCount = 0;
      mockQueryBuilder.then.mockImplementation((cb: any) => {
        thenCallCount++;
        if (thenCallCount === 1) return cb({ data: true, error: null }); // Check availability - available
        if (thenCallCount === 2) return cb({ data: mockSuggestions, error: null }); // Suggestions
        return cb({ data: [], error: null });
      });

      const input: BookRoomInput = {
        roomId: 'room-1',
        meetingId: 'meeting-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '11:00',
      };

      const result = await bookRoom(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('just booked');
    });
  });

  describe('bookRoomForRecurrentMeetings', () => {
    it('should book all occurrences when room is available', async () => {
      // All availability checks pass, all bookings succeed
      mockQueryBuilder.then.mockImplementation((cb: any) => {
        return cb({ data: true, error: null });
      });

      mockQueryBuilder.insert.mockReturnValueOnce({
        then: (cb: any) => cb({ error: null }),
      });

      const meetings = [
        { meetingId: 'm1', date: '2024-01-15', startTime: '10:00', endTime: '11:00' },
        { meetingId: 'm2', date: '2024-01-22', startTime: '10:00', endTime: '11:00' },
      ];

      const result = await bookRoomForRecurrentMeetings('room-1', meetings);

      expect(result.success).toBe(true);
      expect(result.totalOccurrences).toBe(2);
      expect(result.failedDates).toHaveLength(0);
    });

    it('should report failures for unavailable slots without stopping', async () => {
      // Mock multiple calls in sequence
      // Check 1: available, Insert 1: success, Check 2: unavailable, Suggestions: empty
      let callCount = 0;
      mockQueryBuilder.then.mockImplementation((cb: any) => {
        callCount++;
        if (callCount === 1) return cb({ data: true, error: null }); // Check 1 - available
        if (callCount === 2) return cb({ error: null }); // Insert 1 - success
        if (callCount === 3) return cb({ data: true, error: null }); // Update meeting 1
        if (callCount === 4) return cb({ data: false, error: null }); // Check 2 - unavailable
        if (callCount === 5) return cb({ data: [], error: null }); // Suggestions - empty
        return cb({ data: [], error: null });
      });

      const meetings = [
        { meetingId: 'm1', date: '2024-01-15', startTime: '10:00', endTime: '11:00' },
        { meetingId: 'm2', date: '2024-01-22', startTime: '10:00', endTime: '11:00' },
      ];

      const result = await bookRoomForRecurrentMeetings('room-1', meetings);

      expect(result.success).toBe(false);
      expect(result.bookedCount).toBe(1);
      expect(result.failedDates).toHaveLength(1);
      expect(result.failedDates[0].date).toBe('2024-01-22');
    });
  });

  describe('cancelRoomBooking', () => {
    it('should cancel booking and remove room_id from meeting', async () => {
      mockQueryBuilder.then.mockImplementation((cb: any) => cb({ error: null }));

      await cancelRoomBooking('room-1', 'meeting-1', '2024-01-15');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('room_bookings');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ status: 'cancelled' });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('room_id', 'room-1');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('meeting_id', 'meeting-1');
    });
  });

  describe('getRoomBookings', () => {
    it('should fetch confirmed bookings for room in date range', async () => {
      const mockBookings: (RoomBooking & { meetings?: { title: string; status: string } })[] = [
        {
          id: 'booking-1',
          room_id: 'room-1',
          meeting_id: 'meeting-1',
          date: '2024-01-15',
          start_time: '10:00',
          end_time: '11:00',
          status: 'confirmed',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          meetings: { title: 'Team Standup', status: 'scheduled' },
        },
      ];

      mockQueryBuilder.then.mockImplementationOnce((cb: any) =>
        cb({ data: mockBookings, error: null })
      );

      const result = await getRoomBookings('room-1', '2024-01-01', '2024-01-31');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('room_bookings');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('room_id', 'room-1');
      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('date', '2024-01-01');
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('date', '2024-01-31');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'confirmed');
      expect(result).toHaveLength(1);
    });
  });

  describe('getAllRoomBookingsForDate', () => {
    it('should fetch all bookings for a specific date with room info', async () => {
      const mockBookings = [
        {
          id: 'booking-1',
          room_id: 'room-1',
          meeting_id: 'meeting-1',
          date: '2024-01-15',
          start_time: '10:00',
          end_time: '11:00',
          status: 'confirmed',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          room: { id: 'room-1', name: 'Room A', capacity: 10, created_at: '', updated_at: '' },
          meetings: { title: 'Team Standup' },
        },
      ];

      mockQueryBuilder.then.mockImplementationOnce((cb: any) =>
        cb({ data: mockBookings, error: null })
      );

      const result = await getAllRoomBookingsForDate('2024-01-15');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('room_bookings');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('date', '2024-01-15');
      expect(result[0].meeting_title).toBe('Team Standup');
    });
  });

  describe('updateRoomBooking', () => {
    it('should update booking time', async () => {
      mockQueryBuilder.then.mockImplementationOnce((cb: any) => cb({ error: null }));

      await updateRoomBooking('booking-1', {
        startTime: '11:00',
        endTime: '12:00',
        status: 'confirmed',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('room_bookings');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          start_time: '11:00',
          end_time: '12:00',
          status: 'confirmed',
          updated_at: expect.any(String),
        })
      );
    });
  });
});
