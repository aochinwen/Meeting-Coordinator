'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Settings, Calendar as CalendarIcon, ArrowRight, X } from 'lucide-react';
import { RoomCalendar, PendingSlot } from '@/components/RoomCalendar';
import { RoomManagerModal } from '@/components/RoomManagerModal';
import { Room, RoomBooking } from '@/lib/rooms';
import { format } from 'date-fns';

export function RoomsClient() {
  const router = useRouter();
  const [showRoomManager, setShowRoomManager] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<PendingSlot | null>(null);

  const formatTime = (time: string) => {
    const [hour, min] = time.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
  };

  const handleProceed = () => {
    if (!pendingSlot) return;
    const { room, day, startTime, endTime } = pendingSlot;
    setPendingSlot(null);
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const params = new URLSearchParams({ room: room.id, date: dateStr, time: startTime, endTime });
    router.push(`/schedule?${params.toString()}`);
  };

  const handleClearPending = () => {
    setPendingSlot(null);
  };

  const handleBookingClick = (booking: RoomBooking & { room: Room }) => {
    if (booking.meeting_id) {
      router.push(`/meetings/${booking.meeting_id}`);
    }
  };

  return (
    <>
      <div className="max-w-[1280px] mx-auto pb-24 pt-8 space-y-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:gap-6 sm:flex-row sm:items-end sm:justify-between shrink-0">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary font-literata">
                Meeting Rooms
              </h1>
              <p className="text-base font-light text-text-secondary">
                View room schedules, manage rooms, and book time slots.
              </p>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowRoomManager(true)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 bg-white border border-border/50 text-text-primary rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:border-primary/50 transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Manage Rooms</span>
                <span className="sm:hidden">Manage</span>
              </button>
              <button
                onClick={() => router.push('/schedule')}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Book Room</span>
                <span className="sm:hidden">Book</span>
              </button>
            </div>
          </div>
        </div>

        {/* Room Calendar */}
        <div className="bg-white border border-border/20 rounded-[24px] p-4 sm:p-6 shadow-sm">
          <RoomCalendar
            pendingSlot={pendingSlot}
            onPendingSlotChange={setPendingSlot}
            onBookingClick={handleBookingClick}
          />
        </div>

        {/* Action bar — shown below the calendar when a slot is selected */}
        {pendingSlot && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white border border-emerald-200 rounded-2xl px-5 py-4 shadow-md transition-all animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start sm:items-center gap-3 flex-1">
              <div className="h-3 w-3 rounded-full bg-emerald-500 shrink-0 mt-1 sm:mt-0" />
              <p className="text-base font-medium text-text-primary leading-relaxed">
                <span className="font-bold text-lg">{pendingSlot.room.name}</span>
                <span className="mx-2 text-text-tertiary">·</span>
                {format(pendingSlot.day, 'EEEE, MMM d')}
                <span className="mx-2 text-text-tertiary">·</span>
                <span className="text-primary font-semibold">{formatTime(pendingSlot.startTime)} – {formatTime(pendingSlot.endTime)}</span>
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-border/10">
              <button
                onClick={handleClearPending}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border/50 text-sm font-bold text-text-secondary hover:text-text-primary hover:border-border transition-colors bg-white"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
              <button
                onClick={handleProceed}
                className="flex-[2] sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-surface border border-border/30 rounded-[24px] p-5 sm:p-6">
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
                  <span>Select a room tab, then click and drag across empty time slots. Release to confirm the selection, then tap <strong>Next</strong> to proceed or <strong>Clear</strong> to cancel.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  <span>Or use the &quot;Book Room&quot; button to schedule a meeting with room selection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  <span>Click on an existing booking to view the meeting details</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">4.</span>
                  <span>Use &quot;Manage Rooms&quot; to add, edit, or delete rooms</span>
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
    </>
  );
}
