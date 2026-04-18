'use client';

import { useState, useEffect, useCallback } from 'react';
import { DoorOpen, AlertCircle, Check, ChevronDown, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Room, checkRoomAvailability, getAvailableRooms, AlternativeSlot } from '@/lib/rooms';

interface RoomSelectorProps {
  date: string;
  startTime: string;
  endTime: string;
  selectedRoomId: string | null;
  onRoomSelect: (roomId: string | null) => void;
  minCapacity?: number;
}

export function RoomSelector({
  date,
  startTime,
  endTime,
  selectedRoomId,
  onRoomSelect,
  minCapacity = 2,
}: RoomSelectorProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, boolean>>({});
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [alternatives, setAlternatives] = useState<AlternativeSlot[]>([]);
  const [selectedRoomName, setSelectedRoomName] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fetch rooms and check availability
  const fetchRoomsAndCheckAvailability = useCallback(async () => {
    if (!date || !startTime || !endTime) return;
    
    setIsLoading(true);
    try {
      // Get available rooms for the time slot
      const availableRooms = await getAvailableRooms(date, startTime, endTime, minCapacity);
      setRooms(availableRooms);
      
      // Create availability map
      const availMap: Record<string, boolean> = {};
      availableRooms.forEach(room => {
        availMap[room.id] = true;
      });
      setAvailabilityMap(availMap);
      
      // If selected room is no longer available, deselect it
      if (selectedRoomId && !availMap[selectedRoomId]) {
        onRoomSelect(null);
        setSelectedRoomName('');
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setIsLoading(false);
    }
  }, [date, startTime, endTime, minCapacity, selectedRoomId, onRoomSelect]);

  useEffect(() => {
    fetchRoomsAndCheckAvailability();
  }, [fetchRoomsAndCheckAvailability]);

  // Keep the displayed room name in sync with `selectedRoomId`. Needed when
  // the parent prefills `selectedRoomId` from URL params (Room Calendar drag
  // flow) — `handleRoomSelect` never runs in that case, so the name label
  // would otherwise stay blank until the rooms list loads and matches.
  useEffect(() => {
    if (!selectedRoomId) {
      setSelectedRoomName('');
      return;
    }
    const match = rooms.find((r) => r.id === selectedRoomId);
    if (match) setSelectedRoomName(match.name);
  }, [selectedRoomId, rooms]);

  // Check specific room availability when selected
  const checkSpecificRoom = async (roomId: string) => {
    try {
      const result = await checkRoomAvailability(roomId, date, startTime, endTime);
      return result.isAvailable;
    } catch {
      return false;
    }
  };

  const handleRoomSelect = async (room: Room) => {
    const isAvailable = await checkSpecificRoom(room.id);
    
    if (!isAvailable) {
      // Room became unavailable, refresh the list
      await fetchRoomsAndCheckAvailability();
      return;
    }
    
    onRoomSelect(room.id);
    setSelectedRoomName(room.name);
    setIsDropdownOpen(false);
  };

  const handleClearRoom = () => {
    onRoomSelect(null);
    setSelectedRoomName('');
    setIsDropdownOpen(false);
  };

  const availableCount = rooms.length;
  const hasSelection = selectedRoomId !== null;

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
                    {rooms.find(r => r.id === selectedRoomId)?.capacity} people capacity
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
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border/30 rounded-2xl shadow-lg z-50 max-h-64 overflow-y-auto">
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
            {rooms.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <AlertCircle className="h-8 w-8 text-coral-text mx-auto mb-2" />
                <p className="text-sm text-text-secondary font-light">
                  No rooms available for this time slot
                </p>
                <p className="text-xs text-text-tertiary mt-1">
                  Try selecting a different time
                </p>
              </div>
            ) : (
              <div className="py-2">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => handleRoomSelect(room)}
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-surface transition-colors flex items-center gap-3",
                      selectedRoomId === room.id && "bg-primary/5"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                      selectedRoomId === room.id ? "bg-primary" : "bg-status-grey-bg"
                    )}>
                      {selectedRoomId === room.id ? (
                        <Check className="h-4 w-4 text-white" />
                      ) : (
                        <DoorOpen className="h-4 w-4 text-text-secondary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium text-sm truncate",
                        selectedRoomId === room.id ? "text-primary" : "text-text-primary"
                      )}>
                        {room.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <Users className="h-3 w-3" />
                        <span>Capacity: {room.capacity}</span>
                      </div>
                    </div>
                    {selectedRoomId === room.id && (
                      <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Availability Summary */}
      {date && startTime && endTime && !isLoading && (
        <div className="flex items-center gap-2 text-xs">
          {availableCount > 0 ? (
            <>
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-text-secondary">
                {availableCount} room{availableCount !== 1 ? 's' : ''} available
              </span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-coral-text" />
              <span className="text-coral-text">
                No rooms available at this time
              </span>
            </>
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
