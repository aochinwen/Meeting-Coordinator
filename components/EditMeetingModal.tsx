'use client';

import { useState } from 'react';
import { X, Calendar, Repeat, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateMeetingOccurrence, updateSeriesPattern } from '@/lib/meetings';

interface EditMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  seriesId: string | null;
  meetingDate: string;
  currentValues: {
    title: string;
    description?: string;
    start_time?: string;
    end_time?: string;
  };
  onSuccess?: () => void;
}

type EditScope = 'single' | 'series' | 'following';

export function EditMeetingModal({
  isOpen,
  onClose,
  meetingId,
  seriesId,
  meetingDate,
  currentValues,
  onSuccess,
}: EditMeetingModalProps) {
  const [selectedScope, setSelectedScope] = useState<EditScope>('single');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(currentValues);

  if (!isOpen) return null;

  const isRecurring = !!seriesId;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      if (selectedScope === 'single') {
        // Update only this occurrence
        await updateMeetingOccurrence(meetingId, formData, true);
      } else if (selectedScope === 'series' && seriesId) {
        // Update entire series pattern
        await updateSeriesPattern(seriesId, {
          title: formData.title,
          description: formData.description,
          start_time: formData.start_time,
          end_time: formData.end_time,
        });
      } else if (selectedScope === 'following' && seriesId) {
        // Update series from this date forward
        await updateSeriesPattern(
          seriesId,
          {
            title: formData.title,
            description: formData.description,
            start_time: formData.start_time,
            end_time: formData.end_time,
          },
          new Date(meetingDate)
        );
      }
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error updating meeting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/30">
          <h2 className="text-xl font-bold text-text-primary font-literata">
            Edit Meeting
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-board rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* Edit Scope Selection (only for recurring meetings) */}
        {isRecurring && (
          <div className="p-6 border-b border-border/30">
            <p className="text-sm font-medium text-text-secondary mb-4">
              This meeting is part of a recurring series. What would you like to edit?
            </p>
            
            <div className="flex flex-col gap-3">
              <label
                className={cn(
                  "flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                  selectedScope === 'single'
                    ? "border-primary bg-surface/50"
                    : "border-border/50 hover:border-primary/30"
                )}
              >
                <input
                  type="radio"
                  name="editScope"
                  value="single"
                  checked={selectedScope === 'single'}
                  onChange={() => setSelectedScope('single')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-bold text-text-primary">This occurrence only</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Changes will apply only to the meeting on {new Date(meetingDate).toLocaleDateString()}
                  </p>
                </div>
              </label>

              <label
                className={cn(
                  "flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                  selectedScope === 'series'
                    ? "border-primary bg-surface/50"
                    : "border-border/50 hover:border-primary/30"
                )}
              >
                <input
                  type="radio"
                  name="editScope"
                  value="series"
                  checked={selectedScope === 'series'}
                  onChange={() => setSelectedScope('series')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Repeat className="h-4 w-4 text-primary" />
                    <span className="font-bold text-text-primary">All occurrences</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Changes will apply to all meetings in this series
                  </p>
                </div>
              </label>

              <label
                className={cn(
                  "flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                  selectedScope === 'following'
                    ? "border-primary bg-surface/50"
                    : "border-border/50 hover:border-primary/30"
                )}
              >
                <input
                  type="radio"
                  name="editScope"
                  value="following"
                  checked={selectedScope === 'following'}
                  onChange={() => setSelectedScope('following')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowRight className="h-4 w-4 text-primary" />
                    <span className="font-bold text-text-primary">This and following</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Changes will apply to this and all future meetings
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Edit Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-text-primary mb-2">
              Meeting Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-text-primary mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-text-primary mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={formData.start_time || ''}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-text-primary mb-2">
                End Time
              </label>
              <input
                type="time"
                value={formData.end_time || ''}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface/30 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-border text-text-primary rounded-2xl text-sm font-bold hover:bg-board transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.title.trim()}
            className="px-6 py-2.5 bg-primary text-white rounded-2xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
