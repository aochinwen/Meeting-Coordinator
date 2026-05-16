'use client';

import { useState } from 'react';
import { X, Calendar, Repeat, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  cancelMeetingOccurrence, 
  cancelSeriesFromDate, 
  cancelMeetingSeries 
} from '@/lib/meetings';
import { User } from '@supabase/supabase-js';

interface CancelMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  seriesId: string | null;
  meetingDate: string;
  meetingTitle: string;
  currentUser?: User;
  onSuccess?: () => void;
}

type CancelScope = 'single' | 'series' | 'following';

export function CancelMeetingModal({
  isOpen,
  onClose,
  meetingId,
  seriesId,
  meetingDate,
  meetingTitle,
  currentUser,
  onSuccess,
}: CancelMeetingModalProps) {
  const [selectedScope, setSelectedScope] = useState<CancelScope>('single');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  if (!isOpen) return null;

  const isRecurring = !!seriesId;
  const confirmRequired = selectedScope === 'series' || selectedScope === 'following';
  const canCancel = !confirmRequired || confirmText === meetingTitle;

  const handleCancel = async () => {
    if (!canCancel) return;
    
    setIsSubmitting(true);
    
    try {
      if (selectedScope === 'single') {
        // Cancel only this occurrence
        await cancelMeetingOccurrence(meetingId, currentUser?.id);
      } else if (selectedScope === 'series' && seriesId) {
        // Cancel entire series
        await cancelMeetingSeries(seriesId, currentUser?.id);
      } else if (selectedScope === 'following' && seriesId) {
        // Cancel from this date forward
        await cancelSeriesFromDate(seriesId, new Date(meetingDate), currentUser?.id);
      }
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error cancelling meeting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-amber/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber/20 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-status-amber" />
            </div>
            <h2 className="text-xl font-bold text-text-primary font-literata">
              Cancel Meeting
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-board rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* Cancel Scope Selection (only for recurring meetings) */}
        {isRecurring && (
          <div className="p-6 border-b border-border/30">
            <p className="text-sm font-medium text-text-secondary mb-4">
              This meeting is part of a recurring series. What would you like to cancel?
            </p>
            
            <div className="flex flex-col gap-3">
              <label
                className={cn(
                  "flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                  selectedScope === 'single'
                    ? "border-status-amber bg-amber/10"
                    : "border-border/50 hover:border-status-amber/30"
                )}
              >
                <input
                  type="radio"
                  name="cancelScope"
                  value="single"
                  checked={selectedScope === 'single'}
                  onChange={() => {
                    setSelectedScope('single');
                    setConfirmText('');
                  }}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-status-amber" />
                    <span className="font-bold text-text-primary">This occurrence only</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Only the meeting on {new Date(meetingDate).toLocaleDateString()} will be cancelled. 
                    Future meetings will remain scheduled.
                  </p>
                </div>
              </label>

              <label
                className={cn(
                  "flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                  selectedScope === 'following'
                    ? "border-status-amber bg-amber/10"
                    : "border-border/50 hover:border-status-amber/30"
                )}
              >
                <input
                  type="radio"
                  name="cancelScope"
                  value="following"
                  checked={selectedScope === 'following'}
                  onChange={() => {
                    setSelectedScope('following');
                    setConfirmText('');
                  }}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Repeat className="h-4 w-4 text-status-amber" />
                    <span className="font-bold text-text-primary">This and following</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    This meeting and all future occurrences will be cancelled. 
                    Past meetings will remain.
                  </p>
                </div>
              </label>

              <label
                className={cn(
                  "flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                  selectedScope === 'series'
                    ? "border-status-amber bg-amber/10"
                    : "border-border/50 hover:border-status-amber/30"
                )}
              >
                <input
                  type="radio"
                  name="cancelScope"
                  value="series"
                  checked={selectedScope === 'series'}
                  onChange={() => {
                    setSelectedScope('series');
                    setConfirmText('');
                  }}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-status-amber" />
                    <span className="font-bold text-text-primary">All occurrences</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    The entire meeting series will be cancelled.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Confirmation for bulk cancel */}
        {confirmRequired && (
          <div className="p-6 bg-amber/10 border-b border-border/30">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="h-5 w-5 text-status-amber shrink-0 mt-0.5" />
              <p className="text-sm text-text-primary">
                To confirm cancelling multiple meetings, please type <strong className="font-bold">{meetingTitle}</strong> below:
              </p>
            </div>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type meeting name to confirm"
              className="w-full px-4 py-3 bg-white border border-status-amber/30 rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-status-amber/20 text-sm"
            />
          </div>
        )}

        {/* Warning for single occurrence */}
        {!isRecurring && (
          <div className="p-6 border-b border-border/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-status-amber shrink-0 mt-0.5" />
              <p className="text-sm text-text-primary">
                Are you sure you want to cancel <strong className="font-bold">{meetingTitle}</strong>? 
                The room booking will be released.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface/30 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-border text-text-primary rounded-2xl text-sm font-bold hover:bg-board transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={handleCancel}
            disabled={isSubmitting || !canCancel}
            className="px-6 py-2.5 bg-status-amber text-white rounded-2xl text-sm font-bold hover:bg-status-amber/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <XCircle className="h-4 w-4" />
            {isSubmitting ? 'Cancelling...' : 'Cancel Meeting'}
          </button>
        </div>
      </div>
    </div>
  );
}
