'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DoorOpen, Plus, Settings, Calendar as CalendarIcon } from 'lucide-react';
import { RoomCalendar } from '@/components/RoomCalendar';
import { RoomManagerModal } from '@/components/RoomManagerModal';
import { Room, RoomBooking } from '@/lib/rooms';

export function RoomsClient() {
  const router = useRouter();
  const [showRoomManager, setShowRoomManager] = useState(false);

  const handleTimeSlotClick = (room: Room, date: Date, startTime: string, endTime: string) => {
    // Navigate to schedule page with pre-filled room, date, and selected range.
    // Use local date parts so the user's selected day isn't shifted by UTC.
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const params = new URLSearchParams({
      room: room.id,
      date: dateStr,
      time: startTime,
      endTime,
    });
    router.push(`/schedule?${params.toString()}`);
  };

  const handleBookingClick = (booking: RoomBooking & { room: Room }) => {
    // Navigate to meeting details page
    if (booking.meeting_id) {
      router.push(`/meetings/${booking.meeting_id}`);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto pb-24 pt-8 space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between shrink-0">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold tracking-tight text-text-primary font-literata">
              Meeting Rooms
            </h1>
            <p className="text-base font-light text-text-secondary">
              View room schedules, manage rooms, and book time slots.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRoomManager(true)}
              className="px-4 py-2.5 bg-white border border-border/50 text-text-primary rounded-xl text-sm font-bold flex items-center gap-2 hover:border-primary/50 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Manage Rooms
            </button>
            <button
              onClick={() => router.push('/schedule')}
              className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Book Room
            </button>
          </div>
        </div>
      </div>

      {/* Room Calendar */}
      <div className="bg-white border border-border/20 rounded-[24px] p-6 shadow-sm">
        <RoomCalendar
          onTimeSlotClick={handleTimeSlotClick}
          onBookingClick={handleBookingClick}
        />
      </div>

      {/* Instructions */}
      <div className="bg-surface border border-border/30 rounded-[24px] p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <CalendarIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary mb-1">
              How to Book a Room
            </h3>
            <ul className="space-y-2 text-sm text-text-secondary font-light">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                <span>Select a room tab, then click and drag across empty time slots to pick a range. Release to start booking.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                <span>Or use the "Book Room" button to schedule a meeting with room selection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                <span>Click on an existing booking to view the meeting details</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">4.</span>
                <span>Use "Manage Rooms" to add, edit, or delete rooms</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Room Manager Modal */}
      <RoomManagerModal
        isOpen={showRoomManager}
        onClose={() => setShowRoomManager(false)}
      />
    </div>
  );
}
