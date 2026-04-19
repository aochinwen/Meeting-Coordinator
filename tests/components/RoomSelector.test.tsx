/**
 * Tests for RoomSelector Component
 *
 * These tests validate the RoomSelector component that allows users
 * to select meeting rooms during meeting scheduling.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomSelector } from '../../components/RoomSelector';
import userEvent from '@testing-library/user-event';

// Mock the lib/rooms module
vi.mock('../../lib/rooms', () => ({
  __esModule: true,
  getAvailableRooms: vi.fn(),
  checkRoomAvailability: vi.fn(),
}));

import { getAvailableRooms, checkRoomAvailability, Room } from '../../lib/rooms';

const mockGetAvailableRooms = vi.mocked(getAvailableRooms);
const mockCheckRoomAvailability = vi.mocked(checkRoomAvailability);

describe('RoomSelector', () => {
  const mockRooms: Room[] = [
    { id: 'room-1', name: 'Conference Room A', capacity: 10, created_at: '', updated_at: '' },
    { id: 'room-2', name: 'Meeting Room B', capacity: 6, created_at: '', updated_at: '' },
    { id: 'room-3', name: 'Small Room C', capacity: 4, created_at: '', updated_at: '' },
  ];

  const defaultProps = {
    date: '2024-01-15',
    startTime: '10:00',
    endTime: '11:00',
    selectedRoomId: null as string | null,
    onRoomSelect: vi.fn(),
    minCapacity: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAvailableRooms.mockResolvedValue(mockRooms);
    mockCheckRoomAvailability.mockResolvedValue({ isAvailable: true });
  });

  it('should render with placeholder text when no room selected', async () => {
    render(<RoomSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Select a room (optional)')).toBeInTheDocument();
    });
  });

  it('should fetch available rooms on mount when date/time provided', async () => {
    render(<RoomSelector {...defaultProps} />);

    await waitFor(() => {
      expect(mockGetAvailableRooms).toHaveBeenCalledWith(
        '2024-01-15',
        '10:00',
        '11:00',
        2
      );
    });
  });

  it('should display available room count', async () => {
    render(<RoomSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('3 rooms available')).toBeInTheDocument();
    });
  });

  it('should show "No rooms available" when list is empty', async () => {
    mockGetAvailableRooms.mockResolvedValueOnce([]);

    render(<RoomSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No rooms available at this time')).toBeInTheDocument();
    });
  });

  it('should open dropdown when clicked', async () => {
    render(<RoomSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Select a room (optional)')).toBeInTheDocument();
    });

    const dropdown = screen.getByText('Select a room (optional)').closest('button');
    if (dropdown) await userEvent.click(dropdown);

    // Wait for dropdown to open and show rooms
    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
      expect(screen.getByText('Meeting Room B')).toBeInTheDocument();
    });
  });

  it('should display room capacity in dropdown', async () => {
    render(<RoomSelector {...defaultProps} />);

    await waitFor(() => {
      const dropdown = screen.getByText('Select a room (optional)').closest('button');
      if (dropdown) userEvent.click(dropdown);
    });

    await waitFor(() => {
      expect(screen.getByText('Capacity: 10')).toBeInTheDocument();
      expect(screen.getByText('Capacity: 6')).toBeInTheDocument();
    });
  });

  it('should call onRoomSelect when room clicked and available', async () => {
    render(<RoomSelector {...defaultProps} />);

    await waitFor(() => {
      const dropdown = screen.getByText('Select a room (optional)').closest('button');
      if (dropdown) userEvent.click(dropdown);
    });

    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    });

    const roomOption = screen.getByText('Conference Room A').closest('button');
    if (roomOption) await userEvent.click(roomOption);

    await waitFor(() => {
      expect(mockCheckRoomAvailability).toHaveBeenCalledWith('room-1', '2024-01-15', '10:00', '11:00');
      expect(defaultProps.onRoomSelect).toHaveBeenCalledWith('room-1');
    });
  });

  it('should refresh list and not select if room became unavailable', async () => {
    mockCheckRoomAvailability.mockResolvedValueOnce({ isAvailable: false });

    render(<RoomSelector {...defaultProps} />);

    await waitFor(() => {
      const dropdown = screen.getByText('Select a room (optional)').closest('button');
      if (dropdown) userEvent.click(dropdown);
    });

    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    });

    const roomOption = screen.getByText('Conference Room A').closest('button');
    if (roomOption) await userEvent.click(roomOption);

    await waitFor(() => {
      // Should refresh the list
      expect(mockGetAvailableRooms).toHaveBeenCalledTimes(2);
      // Should NOT select the room
      expect(defaultProps.onRoomSelect).not.toHaveBeenCalled();
    });
  });

  it('should show selected room with checkmark', async () => {
    render(<RoomSelector {...defaultProps} selectedRoomId="room-1" />);

    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    });
  });

  it('should allow clearing room selection', async () => {
    render(<RoomSelector {...defaultProps} selectedRoomId="room-1" />);

    await waitFor(() => {
      const dropdown = screen.getByText('Conference Room A').closest('button');
      if (dropdown) userEvent.click(dropdown);
    });

    await waitFor(() => {
      expect(screen.getByText('No room needed')).toBeInTheDocument();
    });

    const clearButton = screen.getByText('No room needed');
    await userEvent.click(clearButton);

    expect(defaultProps.onRoomSelect).toHaveBeenCalledWith(null);
  });

  it('should deselect room if it becomes unavailable after time change', async () => {
    const onRoomSelect = vi.fn();

    const { rerender } = render(
      <RoomSelector {...defaultProps} selectedRoomId="room-1" onRoomSelect={onRoomSelect} />
    );

    // Simulate time change that makes selected room unavailable
    mockGetAvailableRooms.mockResolvedValueOnce([
      { id: 'room-2', name: 'Meeting Room B', capacity: 6, created_at: '', updated_at: '' },
    ]);

    rerender(
      <RoomSelector
        {...defaultProps}
        selectedRoomId="room-1"
        onRoomSelect={onRoomSelect}
        startTime="14:00"
        endTime="15:00"
      />
    );

    await waitFor(() => {
      expect(onRoomSelect).toHaveBeenCalledWith(null);
    });
  });

  it('should show loading state while fetching', async () => {
    mockGetAvailableRooms.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

    render(<RoomSelector {...defaultProps} />);

    expect(screen.getByText('Checking availability...')).toBeInTheDocument();
  });

  it('should not fetch rooms when date or time is missing', () => {
    render(<RoomSelector {...defaultProps} date="" />);

    expect(mockGetAvailableRooms).not.toHaveBeenCalled();
  });

  it('should close dropdown when clicking outside', async () => {
    render(
      <>
        <div data-testid="outside">Outside</div>
        <RoomSelector {...defaultProps} />
      </>
    );

    await waitFor(() => {
      const dropdown = screen.getByText('Select a room (optional)').closest('button');
      if (dropdown) userEvent.click(dropdown);
    });

    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    });

    // Click outside
    const outside = screen.getByTestId('outside');
    fireEvent.click(outside);

    // Dropdown should be closed (room list not in document)
    await waitFor(() => {
      expect(screen.queryByText('Conference Room A')).not.toBeInTheDocument();
    });
  });
});
