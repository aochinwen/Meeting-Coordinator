'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, DoorOpen, Users, Save, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Room, getRooms, createRoom, updateRoom, deleteRoom } from '@/lib/rooms';

interface RoomManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoomManagerModal({ isOpen, onClose }: RoomManagerModalProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state for adding/editing
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [roomCapacity, setRoomCapacity] = useState(4);
  const [showAddForm, setShowAddForm] = useState(false);

  // Load rooms on mount
  useEffect(() => {
    if (isOpen) {
      loadRooms();
    }
  }, [isOpen]);

  const loadRooms = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRooms();
      setRooms(data);
    } catch (err) {
      setError('Failed to load rooms');
      console.error('Error loading rooms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRoom = async () => {
    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }
    
    if (roomCapacity < 1) {
      setError('Capacity must be at least 1');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      await createRoom({
        name: roomName.trim(),
        capacity: roomCapacity,
      });
      
      // Reset form and reload
      setRoomName('');
      setRoomCapacity(4);
      setShowAddForm(false);
      await loadRooms();
    } catch (err) {
      setError('Failed to create room');
      console.error('Error creating room:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateRoom = async () => {
    if (!editingRoomId) return;
    
    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }
    
    if (roomCapacity < 1) {
      setError('Capacity must be at least 1');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      await updateRoom(editingRoomId, {
        name: roomName.trim(),
        capacity: roomCapacity,
      });
      
      // Reset form and reload
      setEditingRoomId(null);
      setRoomName('');
      setRoomCapacity(4);
      await loadRooms();
    } catch (err) {
      setError('Failed to update room');
      console.error('Error updating room:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room? This will also cancel any existing bookings for this room.')) {
      return;
    }
    
    setIsSaving(true);
    try {
      await deleteRoom(roomId);
      await loadRooms();
    } catch (err) {
      setError('Failed to delete room');
      console.error('Error deleting room:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (room: Room) => {
    setEditingRoomId(room.id);
    setRoomName(room.name);
    setRoomCapacity(room.capacity);
    setShowAddForm(false);
    setError(null);
  };

  const startAdding = () => {
    setEditingRoomId(null);
    setRoomName('');
    setRoomCapacity(4);
    setShowAddForm(true);
    setError(null);
  };

  const cancelForm = () => {
    setEditingRoomId(null);
    setRoomName('');
    setRoomCapacity(4);
    setShowAddForm(false);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <DoorOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary font-literata">
                Manage Rooms
              </h2>
              <p className="text-sm text-text-secondary font-light">
                Add, edit, or delete meeting rooms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full hover:bg-surface flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 bg-coral-bg border border-coral-text/20 rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-coral-text shrink-0" />
            <p className="text-sm text-coral-text">{error}</p>
          </div>
        )}

        {/* Room List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12">
              <DoorOpen className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary font-light mb-1">No rooms yet</p>
              <p className="text-sm text-text-tertiary">
                Add your first meeting room to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                    editingRoomId === room.id 
                      ? "border-primary bg-primary/5" 
                      : "border-border/30 bg-surface/50 hover:border-primary/20"
                  )}
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <DoorOpen className="h-6 w-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-text-primary truncate">
                      {room.name}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-text-secondary">
                      <Users className="h-3.5 w-3.5" />
                      <span>Capacity: {room.capacity}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditing(room)}
                      disabled={isSaving}
                      className="h-9 w-9 rounded-xl hover:bg-white flex items-center justify-center transition-colors disabled:opacity-50"
                      title="Edit room"
                    >
                      <Edit2 className="h-4 w-4 text-text-secondary" />
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      disabled={isSaving}
                      className="h-9 w-9 rounded-xl hover:bg-coral-bg flex items-center justify-center transition-colors disabled:opacity-50"
                      title="Delete room"
                    >
                      <Trash2 className="h-4 w-4 text-coral-text" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingRoomId) && (
          <div className="border-t border-border/20 p-6 bg-surface/30">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">
              {editingRoomId ? 'Edit Room' : 'Add New Room'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">
                  Room Name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g., Conference Room A"
                  className="w-full px-4 py-3 bg-white border border-border/50 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  disabled={isSaving}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">
                  Capacity
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={roomCapacity}
                    onChange={(e) => setRoomCapacity(parseInt(e.target.value) || 1)}
                    className="w-24 px-4 py-3 bg-white border border-border/50 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm text-center"
                    disabled={isSaving}
                  />
                  <span className="text-sm text-text-secondary">people</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={editingRoomId ? handleUpdateRoom : handleAddRoom}
                disabled={isSaving || !roomName.trim()}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {editingRoomId ? 'Update Room' : 'Add Room'}
                  </>
                )}
              </button>
              <button
                onClick={cancelForm}
                disabled={isSaving}
                className="px-4 py-2.5 border border-border/50 text-text-secondary rounded-xl text-sm font-medium hover:bg-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add Room Button (when not showing form) */}
        {!showAddForm && !editingRoomId && (
          <div className="border-t border-border/20 p-6">
            <button
              onClick={startAdding}
              disabled={isSaving}
              className="w-full px-4 py-3 border-2 border-dashed border-primary/30 text-primary rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add New Room
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
