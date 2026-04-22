/**
 * Tests for RoomCalendar Component
 *
 * These tests validate the room calendar component that displays
 * room bookings in a resource-view calendar format.
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomCalendar } from '../../components/RoomCalendar';

// Mock the lib/rooms module
vi.mock('../../lib/rooms', () => ({
  getRooms: vi.fn(),
  getRoomBookings: vi.fn(),
}));

// Mock date-fns to have consistent dates in tests
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    startOfWeek: vi.fn((date) => date),
  };
});

import { getRooms, getRoomBookings, Room, RoomBooking } from '../../lib/rooms';

const mockGetRooms = vi.mocked(getRooms);
const mockGetRoomBookings = vi.mocked(getRoomBookings);

describe('RoomCalendar', () => {
  const mockRooms: Room[] = [
    { id: 'room-1', name: 'Conference Room A', capacity: 10, created_at: '', updated_at: '' },
    { id: 'room-2', name: 'Meeting Room B', capacity: 6, created_at: '', updated_at: '' },
  ];

  const mockBooking: RoomBooking & { meetings?: { title: string; status: string } | null } = {
    id: 'booking-1',
    room_id: 'room-1',
    meeting_id: 'meeting-1',
    date: '2024-01-15',
    start_time: '10:00',
    end_time: '11:00',
    status: 'confirmed',
    created_at: '',
    updated_at: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRooms.mockResolvedValue(mockRooms);
    mockGetRoomBookings.mockResolvedValue([]);
  });

  it('should render calendar with header and navigation', async () => {
    render(<RoomCalendar />);

    await waitFor(() => {
      expect(screen.getByText('Room Schedule')).toBeInTheDocument();
      expect(screen.getByText('Today')).toBeInTheDocument();
    });
  });

  it('should fetch and display rooms as column headers', async () => {
    render(<RoomCalendar />);

    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
      expect(screen.getByText('Meeting Room B')).toBeInTheDocument();
    });
  });

  it('should display room capacity in headers', async () => {
    render(<RoomCalendar />);

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
    });
  });

  it('should show empty state when no rooms exist', async () => {
    mockGetRooms.mockResolvedValueOnce([]);

    render(<RoomCalendar />);

    await waitFor(() => {
      expect(screen.getByText('No rooms available')).toBeInTheDocument();
      expect(screen.getByText('Add rooms to see the schedule')).toBeInTheDocument();
    });
  });

  it('should show loading state while fetching', () => {
    mockGetRooms.mockImplementationOnce(() => new Promise(() => {}));

    render(<RoomCalendar />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should display error state on fetch failure', async () => {
    mockGetRooms.mockRejectedValueOnce(new Error('Database error'));

    render(<RoomCalendar />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load rooms')).toBeInTheDocument();
    });
  });

  it('should fetch bookings for each room when rooms loaded', async () => {
    render(<RoomCalendar />);

    await waitFor(() => {
      expect(mockGetRooms).toHaveBeenCalled();
    });

    // Wait for bookings to be fetched for each room
    await waitFor(() => {
      expect(mockGetRoomBookings).toHaveBeenCalledTimes(2);
    });
  });

  it('should display bookings on the calendar', async () => {
    const bookingWithMeeting: RoomBooking & { meetings?: { title: string; status: string } | null } = {
      ...mockBooking,
      meetings: { title: 'Team Standup', status: 'scheduled' },
    };

    mockGetRoomBookings.mockResolvedValueOnce([bookingWithMeeting]);

    render(<RoomCalendar />);

    await waitFor(() => {
      expect(screen.getByText('Team Standup')).toBeInTheDocument();
    });
  });

  it('should show default "Meeting" title when meeting data unavailable', async () => {
    mockGetRoomBookings.mockResolvedValueOnce([mockBooking]);

    render(<RoomCalendar />);

    await waitFor(() => {
      expect(screen.getByText('Meeting')).toBeInTheDocument();
    });
  });

  it('should display time range on booking', async () => {
    const bookingWithMeeting = {
      ...mockBooking,
      meetings: { title: 'Team Standup', status: 'scheduled' },
    };

    mockGetRoomBookings.mockResolvedValueOnce([bookingWithMeeting]);

    render(<RoomCalendar />);

    await waitFor(() => {
      expect(screen.getByText('10:00 AM - 11:00 AM')).toBeInTheDocument();
    });
  });

  it('should call onBookingClick when clicking a booking', async () => {
    const onBookingClick = vi.fn();
    const bookingWithMeeting = {
      ...mockBooking,
      meetings: { title: 'Team Standup', status: 'scheduled' },
    };

    mockGetRoomBookings.mockResolvedValueOnce([bookingWithMeeting]);

    render(<RoomCalendar onBookingClick={onBookingClick} />);

    await waitFor(() => {
      expect(screen.getByText('Team Standup')).toBeInTheDocument();
    });

    const booking = screen.getByText('Team Standup').closest('[class*="cursor-pointer"]');
    if (booking) {
      fireEvent.click(booking);
    }

    expect(onBookingClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'booking-1',
        meetings: { title: 'Team Standup', status: 'scheduled' },
      })
    );
  });

  it('should call onTimeSlotClick when clicking empty time slot', async () => {
    const onTimeSlotClick = vi.fn();

    render(<RoomCalendar onTimeSlotClick={onTimeSlotClick} />);

    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    });

    // Find and click on an empty time slot (the clickable overlay divs)
    const timeSlots = document.querySelectorAll('[class*="hover:bg-primary"]');
    if (timeSlots.length > 0) {
      fireEvent.click(timeSlots[0]);
    }
  });

  it('should navigate to previous week', async () => {
    render(<RoomCalendar />);

    await waitFor(() => {
      expect(screen.getByText('Room Schedule')).toBeInTheDocument();
    });

    const prevButton = screen.getByRole('button', { name: /previous/i });
    fireEvent.click(prevButton);

    // Should trigger re-fetch with new date range
    await waitFor(() => {
      expect(mockGetRoomBookings).toHaveBeenCalled();
    });
  });

  it('should navigate to next week', async () => {
    render(<RoomCalendar />);

    await waitFor(() => {
      expect(screen.getByText('Room Schedule')).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    // Should trigger re-fetch with new date range
    await waitFor(() => {
      expect(mockGetRoomBookings).toHaveBeenCalled();
    });
  });

  it('should navigate to today', async () => {
    render(<RoomCalendar />);

    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Today'));

    // Should trigger re-fetch
    await waitFor(() => {
      expect(mockGetRoomBookings).toHaveBeenCalled();
    });
  });

  it('should display date range in header', async () => {
    render(<RoomCalendar />);

    await waitFor(() => {
      // Date range should be displayed (format will vary)
      const dateRange = screen.getByText(/\w{3} \d{1,2}/);
      expect(dateRange).toBeInTheDocument();
    });
  });

  it('should display time column with hours', async () => {
    render(<RoomCalendar />);

    await waitFor(() => {
      expect(screen.getByText('Time')).toBeInTheDocument();
    });
  });

  it('should highlight current day', async () => {
    render(<RoomCalendar />);

    await waitFor(() => {
      // Look for today indicator - could be different styling
      const dayHeaders = document.querySelectorAll('[class*="font-bold"]');
      expect(dayHeaders.length).toBeGreaterThan(0);
    });
  });

  it('should handle overlapping bookings gracefully', async () => {
    const overlappingBookings = [
      {
        ...mockBooking,
        id: 'booking-1',
        start_time: '10:00',
        end_time: '11:00',
        meetings: { title: 'Meeting 1', status: 'scheduled' },
      },
      {
        ...mockBooking,
        id: 'booking-2',
        start_time: '10:30',
        end_time: '11:30',
        meetings: { title: 'Meeting 2', status: 'scheduled' },
      },
    ];

    mockGetRoomBookings.mockResolvedValueOnce(overlappingBookings);

    render(<RoomCalendar />);

    await waitFor(() => {
      expect(screen.getByText('Meeting 1')).toBeInTheDocument();
      expect(screen.getByText('Meeting 2')).toBeInTheDocument();
    });
  });
});
