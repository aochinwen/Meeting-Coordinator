'use client';

import { useState } from 'react';
import { X, Calendar, Repeat, AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  deleteMeetingOccurrence, 
  deleteMeetingSeries, 
  deleteSeriesFromDate 
} from '@/lib/meetings';

interface DeleteMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  seriesId: string | null;
  meetingDate: string;
  meetingTitle: string;
  onSuccess?: () => void;
}

type DeleteScope = 'single' | 'series' | 'following';

export function DeleteMeetingModal({
  isOpen,
  onClose,
  meetingId,
  seriesId,
  meetingDate,
  meetingTitle,
  onSuccess,
}: DeleteMeetingModalProps) {
  const [selectedScope, setSelectedScope] = useState<DeleteScope>('single');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  if (!isOpen) return null;

  const isRecurring = !!seriesId;
  const confirmRequired = selectedScope === 'series' || selectedScope === 'following';
  const canDelete = !confirmRequired || confirmText === meetingTitle;

  const handleDelete = async () => {
    if (!canDelete) return;
    
    setIsSubmitting(true);
    
    try {
      if (selectedScope === 'single') {
        // Delete only this occurrence
        await deleteMeetingOccurrence(meetingId);
      } else if (selectedScope === 'series' && seriesId) {
        // Delete entire series
        await deleteMeetingSeries(seriesId);
      } else if (selectedScope === 'following' && seriesId) {
        // Delete from this date forward
        await deleteSeriesFromDate(seriesId, new Date(meetingDate));
      }
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error deleting meeting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-coral-bg/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-coral-text/20 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-coral-text" />
            </div>
            <h2 className="text-xl font-bold text-text-primary font-literata">
              Delete Meeting
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-board rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* Delete Scope Selection (only for recurring meetings) */}
        {isRecurring && (
          <div className="p-6 border-b border-border/30">
            <p className="text-sm font-medium text-text-secondary mb-4">
              This meeting is part of a recurring series. What would you like to delete?
            </p>
            
            <div className="flex flex-col gap-3">
              <label
                className={cn(
                  "flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                  selectedScope === 'single'
                    ? "border-coral-text bg-coral-bg/30"
                    : "border-border/50 hover:border-coral-text/30"
                )}
              >
                <input
                  type="radio"
                  name="deleteScope"
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
                    <Calendar className="h-4 w-4 text-coral-text" />
                    <span className="font-bold text-text-primary">This occurrence only</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Only the meeting on {new Date(meetingDate).toLocaleDateString()} will be removed. 
                    Future meetings will continue as scheduled.
                  </p>
                </div>
              </label>

              <label
                className={cn(
                  "flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                  selectedScope === 'following'
                    ? "border-coral-text bg-coral-bg/30"
                    : "border-border/50 hover:border-coral-text/30"
                )}
              >
                <input
                  type="radio"
                  name="deleteScope"
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
                    <Repeat className="h-4 w-4 text-coral-text" />
                    <span className="font-bold text-text-primary">This and following</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    This meeting and all future occurrences will be removed. 
                    Past meetings will remain in the series.
                  </p>
                </div>
              </label>

              <label
                className={cn(
                  "flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                  selectedScope === 'series'
                    ? "border-coral-text bg-coral-bg/30"
                    : "border-border/50 hover:border-coral-text/30"
                )}
              >
                <input
                  type="radio"
                  name="deleteScope"
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
                    <AlertTriangle className="h-4 w-4 text-coral-text" />
                    <span className="font-bold text-text-primary">All occurrences</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    The entire meeting series will be permanently deleted. 
                    This action cannot be undone.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Confirmation for bulk delete */}
        {confirmRequired && (
          <div className="p-6 bg-coral-bg/20 border-b border-border/30">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="h-5 w-5 text-coral-text shrink-0 mt-0.5" />
              <p className="text-sm text-text-primary">
                To confirm deletion, please type <strong className="font-bold">{meetingTitle}</strong> below:
              </p>
            </div>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type meeting name to confirm"
              className="w-full px-4 py-3 bg-white border border-coral-text/30 rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-coral-text/20 text-sm"
            />
          </div>
        )}

        {/* Warning for single occurrence */}
        {!isRecurring && (
          <div className="p-6 border-b border-border/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-coral-text shrink-0 mt-0.5" />
              <p className="text-sm text-text-primary">
                Are you sure you want to delete <strong className="font-bold">{meetingTitle}</strong>? 
                This action cannot be undone.
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
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isSubmitting || !canDelete}
            className="px-6 py-2.5 bg-coral-text text-white rounded-2xl text-sm font-bold hover:bg-coral-text/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isSubmitting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
