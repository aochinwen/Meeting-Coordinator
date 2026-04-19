/**
 * Tests for RoomSelector Component
 *
 * The selector now uses a single batched availability lookup
 * (`getRoomAvailabilityForDates`) so it can evaluate every occurrence
 * of a recurring meeting up front. Tests cover both single-date and
 * multi-date (recurring) flows.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { RoomSelector } from '../../components/RoomSelector';

vi.mock('../../lib/rooms', () => ({
  __esModule: true,
  getRoomAvailabilityForDates: vi.fn(),
}));

import {
  getRoomAvailabilityForDates,
  Room,
  RoomAvailabilityForDates,
} from '../../lib/rooms';

const mockGetAvailability = vi.mocked(getRoomAvailabilityForDates);

function makeRoom(id: string, name: string, capacity: number): Room {
  return { id, name, capacity, created_at: '', updated_at: '' };
}

function fullyAvailable(
  room: Room,
  dates: string[],
): RoomAvailabilityForDates {
  return {
    room,
    perDate: dates.map((d) => ({ date: d, available: true, conflict: null })),
    availableCount: dates.length,
    totalCount: dates.length,
  };
}

describe('RoomSelector', () => {
  const roomA = makeRoom('room-1', 'Conference Room A', 10);
  const roomB = makeRoom('room-2', 'Meeting Room B', 6);
  const roomC = makeRoom('room-3', 'Boardroom C', 20);

  const defaultProps = {
    date: '2024-01-15',
    startTime: '10:00',
    endTime: '11:00',
    selectedRoomId: null,
    onRoomSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAvailability.mockResolvedValue([
      fullyAvailable(roomA, ['2024-01-15']),
      fullyAvailable(roomB, ['2024-01-15']),
      fullyAvailable(roomC, ['2024-01-15']),
    ]);
  });

  it('renders placeholder when no room selected', async () => {
    render(<RoomSelector {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Select a room (optional)')).toBeInTheDocument();
    });
  });

  it('fetches availability for the single date on mount', async () => {
    render(<RoomSelector {...defaultProps} />);
    await waitFor(() => {
      expect(mockGetAvailability).toHaveBeenCalledWith(
        ['2024-01-15'],
        '10:00',
        '11:00',
        2, // default minCapacity
      );
    });
  });

  it('displays available room count for a one-off meeting', async () => {
    render(<RoomSelector {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('3 rooms available')).toBeInTheDocument();
    });
  });

  it('shows empty state when no rooms meet capacity', async () => {
    mockGetAvailability.mockResolvedValueOnce([]);
    render(<RoomSelector {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('No rooms meet the capacity requirement')).toBeInTheDocument();
    });
  });

  it('opens dropdown when clicked', async () => {
    render(<RoomSelector {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Select a room (optional)')).toBeInTheDocument();
    });
    const dropdown = screen.getByText('Select a room (optional)').closest('button');
    if (dropdown) await userEvent.click(dropdown);
    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
      expect(screen.getByText('Meeting Room B')).toBeInTheDocument();
    });
  });

  it('shows capacity for each room in dropdown', async () => {
    render(<RoomSelector {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Select a room (optional)')).toBeInTheDocument();
    });
    const dropdown = screen.getByText('Select a room (optional)').closest('button');
    if (dropdown) await userEvent.click(dropdown);
    await waitFor(() => {
      expect(screen.getByText('Capacity: 10')).toBeInTheDocument();
      expect(screen.getByText('Capacity: 6')).toBeInTheDocument();
    });
  });

  it('calls onRoomSelect when a fully-available room is clicked', async () => {
    render(<RoomSelector {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Select a room (optional)')).toBeInTheDocument();
    });
    const dropdown = screen.getByText('Select a room (optional)').closest('button');
    if (dropdown) await userEvent.click(dropdown);
    await waitFor(() => expect(screen.getByText('Conference Room A')).toBeInTheDocument());
    const roomOption = screen.getByText('Conference Room A').closest('button');
    if (roomOption) await userEvent.click(roomOption);
    await waitFor(() => {
      expect(defaultProps.onRoomSelect).toHaveBeenCalledWith('room-1');
    });
  });

  it('shows selected room with capacity subtitle', async () => {
    render(<RoomSelector {...defaultProps} selectedRoomId="room-1" />);
    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
      expect(screen.getByText('10 people capacity')).toBeInTheDocument();
    });
  });

  it('allows clearing room selection', async () => {
    render(<RoomSelector {...defaultProps} selectedRoomId="room-1" />);
    await waitFor(() => expect(screen.getByText('Conference Room A')).toBeInTheDocument());
    const dropdown = screen.getByText('Conference Room A').closest('button');
    if (dropdown) await userEvent.click(dropdown);
    await waitFor(() => expect(screen.getByText('No room needed')).toBeInTheDocument());
    await userEvent.click(screen.getByText('No room needed'));
    await waitFor(() => {
      expect(defaultProps.onRoomSelect).toHaveBeenCalledWith(null);
    });
  });

  it('deselects room when availability refetch returns zero free dates for it', async () => {
    const onRoomSelect = vi.fn();

    const { rerender } = render(
      <RoomSelector {...defaultProps} selectedRoomId="room-1" onRoomSelect={onRoomSelect} />,
    );

    // After time change, room-1 has zero free dates → should be deselected.
    mockGetAvailability.mockResolvedValueOnce([
      {
        room: roomA,
        perDate: [{ date: '2024-01-15', available: false, conflict: { meetingId: 'm', meetingTitle: 'Standup', startTime: '10:00', endTime: '11:00' } }],
        availableCount: 0,
        totalCount: 1,
      },
      fullyAvailable(roomB, ['2024-01-15']),
    ]);

    rerender(
      <RoomSelector
        {...defaultProps}
        selectedRoomId="room-1"
        onRoomSelect={onRoomSelect}
        startTime="11:00"
        endTime="12:00"
      />,
    );

    await waitFor(() => {
      expect(onRoomSelect).toHaveBeenCalledWith(null);
    });
  });

  it('shows loading state while fetching', () => {
    mockGetAvailability.mockImplementationOnce(() => new Promise(() => {}));
    render(<RoomSelector {...defaultProps} />);
    expect(screen.getByText('Checking availability...')).toBeInTheDocument();
  });

  it('does not fetch when date is missing and no occurrenceDates provided', () => {
    render(<RoomSelector {...defaultProps} date="" />);
    expect(mockGetAvailability).not.toHaveBeenCalled();
  });

  it('closes dropdown when the outside-click overlay is clicked', async () => {
    const { container } = render(<RoomSelector {...defaultProps} />);
    await waitFor(() => expect(screen.getByText('Select a room (optional)')).toBeInTheDocument());
    const dropdown = screen.getByText('Select a room (optional)').closest('button');
    if (dropdown) await userEvent.click(dropdown);
    await waitFor(() => expect(screen.getByText('Conference Room A')).toBeInTheDocument());

    // The overlay is a fixed-position div rendered only while the dropdown is open.
    const overlay = container.querySelector('div.fixed.inset-0.z-40') as HTMLElement | null;
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay!);

    await waitFor(() => {
      expect(screen.queryByText('Conference Room A')).not.toBeInTheDocument();
    });
  });

  // --- Recurring-meeting behavior -----------------------------------------

  describe('recurring meetings', () => {
    const dates = ['2024-01-15', '2024-01-22', '2024-01-29'];

    it('passes all occurrence dates to the availability helper', async () => {
      mockGetAvailability.mockResolvedValueOnce([fullyAvailable(roomA, dates)]);
      render(<RoomSelector {...defaultProps} occurrenceDates={dates} />);
      await waitFor(() => {
        expect(mockGetAvailability).toHaveBeenCalledWith(dates, '10:00', '11:00', 2);
      });
    });

    it('shows "N of M rooms free on all X dates" summary when any are fully free', async () => {
      mockGetAvailability.mockResolvedValueOnce([
        fullyAvailable(roomA, dates),
        {
          room: roomB,
          perDate: [
            { date: dates[0], available: true, conflict: null },
            { date: dates[1], available: false, conflict: { meetingId: 'm', meetingTitle: 'Design Review', startTime: '10:00', endTime: '11:00' } },
            { date: dates[2], available: true, conflict: null },
          ],
          availableCount: 2,
          totalCount: 3,
        },
      ]);
      render(<RoomSelector {...defaultProps} occurrenceDates={dates} />);
      await waitFor(() => {
        expect(screen.getByText('1 of 2 rooms free on all 3 dates')).toBeInTheDocument();
      });
    });

    it('shows a red summary when no room is free on all dates', async () => {
      mockGetAvailability.mockResolvedValueOnce([
        {
          room: roomA,
          perDate: [
            { date: dates[0], available: true, conflict: null },
            { date: dates[1], available: false, conflict: { meetingId: 'x', meetingTitle: 'X', startTime: '10:00', endTime: '11:00' } },
            { date: dates[2], available: true, conflict: null },
          ],
          availableCount: 2,
          totalCount: 3,
        },
      ]);
      render(<RoomSelector {...defaultProps} occurrenceDates={dates} />);
      await waitFor(() => {
        expect(screen.getByText('No room is free on all 3 dates')).toBeInTheDocument();
      });
    });

    it('renders a full per-date list with the conflicting meeting title when a partially-conflicting room is selected', async () => {
      mockGetAvailability.mockResolvedValue([
        {
          room: roomA,
          perDate: [
            { date: dates[0], available: true, conflict: null },
            { date: dates[1], available: false, conflict: { meetingId: 'x', meetingTitle: 'Design Review', startTime: '10:00', endTime: '11:00' } },
            { date: dates[2], available: true, conflict: null },
          ],
          availableCount: 2,
          totalCount: 3,
        },
      ]);
      render(
        <RoomSelector
          {...defaultProps}
          selectedRoomId="room-1"
          occurrenceDates={dates}
        />,
      );
      await waitFor(() => {
        // Header shows free count
        expect(screen.getByText('2/3 free')).toBeInTheDocument();
        // Conflict dates display the blocking meeting title
        expect(screen.getByText(/Design Review/)).toBeInTheDocument();
        // Warning footer is present for partial conflict
        expect(
          screen.getByText(/Conflicting dates will be skipped/i),
        ).toBeInTheDocument();
      });
    });

    it('disables selection for rooms with zero free dates', async () => {
      mockGetAvailability.mockResolvedValue([
        {
          room: roomA,
          perDate: dates.map((d) => ({
            date: d,
            available: false,
            conflict: { meetingId: 'x', meetingTitle: 'Blocker', startTime: '10:00', endTime: '11:00' },
          })),
          availableCount: 0,
          totalCount: 3,
        },
      ]);
      const onRoomSelect = vi.fn();
      render(
        <RoomSelector {...defaultProps} occurrenceDates={dates} onRoomSelect={onRoomSelect} />,
      );
      await waitFor(() => expect(screen.getByText('Select a room (optional)')).toBeInTheDocument());
      const dropdown = screen.getByText('Select a room (optional)').closest('button');
      if (dropdown) await userEvent.click(dropdown);
      await waitFor(() => expect(screen.getByText('Conference Room A')).toBeInTheDocument());
      const option = screen.getByText('Conference Room A').closest('button');
      expect(option).toBeDisabled();
    });
  });
});
