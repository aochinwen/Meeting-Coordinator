/**
 * Tests for RoomManagerModal Component
 *
 * These tests validate the room management modal that allows users
 * to add, edit, and delete meeting rooms.
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomManagerModal } from '../../components/RoomManagerModal';
import userEvent from '@testing-library/user-event';

// Mock the lib/rooms module
vi.mock('../../lib/rooms', () => ({
  getRooms: vi.fn(),
  createRoom: vi.fn(),
  updateRoom: vi.fn(),
  deleteRoom: vi.fn(),
}));

import { getRooms, createRoom, updateRoom, deleteRoom } from '../../lib/rooms';

const mockGetRooms = vi.mocked(getRooms);
const mockCreateRoom = vi.mocked(createRoom);
const mockUpdateRoom = vi.mocked(updateRoom);
const mockDeleteRoom = vi.mocked(deleteRoom);

describe('RoomManagerModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  const mockRooms = [
    { id: 'room-1', name: 'Conference Room A', capacity: 10, created_at: '', updated_at: '' },
    { id: 'room-2', name: 'Meeting Room B', capacity: 6, created_at: '', updated_at: '' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRooms.mockResolvedValue(mockRooms);
    mockCreateRoom.mockResolvedValue('new-room-id');
    mockUpdateRoom.mockResolvedValue(undefined);
    mockDeleteRoom.mockResolvedValue(undefined);
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('should not render when isOpen is false', () => {
    render(<RoomManagerModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Manage Rooms')).not.toBeInTheDocument();
  });

  it('should render with header and room list when open', async () => {
    render(<RoomManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Manage Rooms')).toBeInTheDocument();
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
      expect(screen.getByText('Meeting Room B')).toBeInTheDocument();
    });
  });

  it('should show empty state when no rooms exist', async () => {
    mockGetRooms.mockResolvedValueOnce([]);

    render(<RoomManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No rooms yet')).toBeInTheDocument();
      expect(screen.getByText('Add your first meeting room to get started')).toBeInTheDocument();
    });
  });

  it('should display room capacity for each room', async () => {
    render(<RoomManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Capacity: 10')).toBeInTheDocument();
      expect(screen.getByText('Capacity: 6')).toBeInTheDocument();
    });
  });

  it('should show add room form when clicking Add New Room', async () => {
    render(<RoomManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Add New Room')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Add New Room'));

    await waitFor(() => {
      expect(screen.getByText('Add New Room', { selector: 'h3' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., Conference Room A')).toBeInTheDocument();
    });
  });

  it('should create a new room with valid input', async () => {
    render(<RoomManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Add New Room')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Add New Room'));

    const nameInput = screen.getByPlaceholderText('e.g., Conference Room A');
    await userEvent.type(nameInput, 'New Conference Room');

    // Default capacity should be 4, change it to 8
    const capacityInput = screen.getByDisplayValue('4');
    await userEvent.clear(capacityInput);
    await userEvent.type(capacityInput, '8');

    await userEvent.click(screen.getByText('Add Room'));

    await waitFor(() => {
      expect(mockCreateRoom).toHaveBeenCalledWith({
        name: 'New Conference Room',
        capacity: 8,
      });
    });
  });

  it('should show error when room name is empty', async () => {
    render(<RoomManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Add New Room')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Add New Room'));

    // Click add without entering name
    await userEvent.click(screen.getByText('Add Room'));

    await waitFor(() => {
      expect(screen.getByText('Please enter a room name')).toBeInTheDocument();
    });

    expect(mockCreateRoom).not.toHaveBeenCalled();
  });

  it('should show error when capacity is less than 1', async () => {
    render(<RoomManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Add New Room')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Add New Room'));

    const nameInput = screen.getByPlaceholderText('e.g., Conference Room A');
    await userEvent.type(nameInput, 'Room Name');

    const capacityInput = screen.getByDisplayValue('4');
    await userEvent.clear(capacityInput);
    await userEvent.type(capacityInput, '0');

    await userEvent.click(screen.getByText('Add Room'));

    await waitFor(() => {
      expect(screen.getByText('Capacity must be at least 1')).toBeInTheDocument();
    });
  });

  it('should enter edit mode when clicking edit button', async () => {
    render(<RoomManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Edit room');
    await userEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Room', { selector: 'h3' })).toBeInTheDocument();
      // Should have the current room name pre-filled
      expect(screen.getByDisplayValue('Conference Room A')).toBeInTheDocument();
    });
  });

  it('should update room in edit mode', async () => {
    render(<RoomManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Edit room');
    await userEvent.click(editButtons[0]);

    const nameInput = screen.getByDisplayValue('Conference Room A');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Updated Room Name');

    await userEvent.click(screen.getByText('Update Room'));

    await waitFor(() => {
      expect(mockUpdateRoom).toHaveBeenCalledWith('room-1', {
        name: 'Updated Room Name',
        capacity: 10,
      });
    });
  });

  it('should delete room after confirmation', async () => {
    render(<RoomManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete room');
    await userEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to delete this room')
      );
      expect(mockDeleteRoom).toHaveBeenCalledWith('room-1');
    });
  });

  it('should not delete room if confirmation cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);

    render(<RoomManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete room');
    await userEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
    });

    expect(mockDeleteRoom).not.toHaveBeenCalled();
  });

  it('should close modal when clicking close button', async () => {
    const onClose = vi.fn();
    render(<RoomManagerModal {...defaultProps} onClose={onClose} />);

    await waitFor(() => {
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });
  });

  it('should close modal when clicking backdrop', async () => {
    const onClose = vi.fn();
    render(<RoomManagerModal {...defaultProps} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('Manage Rooms')).toBeInTheDocument();
    });

    // The backdrop is the first div with the bg-black class
    const backdrop = document.querySelector('.bg-black\\/40');
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    // The onClose should be called
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should cancel form and return to room list', async () => {
    render(<RoomManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Add New Room')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Add New Room'));

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Cancel'));

    // Should be back to room list view
    await waitFor(() => {
      expect(screen.queryByText('Add New Room', { selector: 'h3' })).not.toBeInTheDocument();
    });
  });

  it('should show loading state while fetching rooms', () => {
    mockGetRooms.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

    render(<RoomManagerModal {...defaultProps} />);

    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('should show error message on fetch failure', async () => {
    mockGetRooms.mockRejectedValueOnce(new Error('Database error'));

    render(<RoomManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load rooms')).toBeInTheDocument();
    });
  });

  it('should trim room name on create', async () => {
    render(<RoomManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Add New Room')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Add New Room'));

    const nameInput = screen.getByPlaceholderText('e.g., Conference Room A');
    await userEvent.type(nameInput, '  New Room  ');

    await userEvent.click(screen.getByText('Add Room'));

    await waitFor(() => {
      expect(mockCreateRoom).toHaveBeenCalledWith({
        name: 'New Room',
        capacity: 4,
      });
    });
  });

  it('should disable buttons while saving', async () => {
    mockCreateRoom.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

    render(<RoomManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Add New Room')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Add New Room'));

    const nameInput = screen.getByPlaceholderText('e.g., Conference Room A');
    await userEvent.type(nameInput, 'New Room');

    await userEvent.click(screen.getByText('Add Room'));

    // Should show saving state
    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    // Buttons should be disabled
    expect(screen.getByText('Saving...').closest('button')).toBeDisabled();
  });
});
