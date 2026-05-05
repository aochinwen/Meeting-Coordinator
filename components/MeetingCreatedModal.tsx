'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, Calendar, Mail, Plus, ArrowRight, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useConfetti } from '@/lib/useConfetti';

interface MeetingCreatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: {
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    isRecurring: boolean;
    occurrencesCount?: number;
  } | null;
  onCreateAnother: () => void;
}

export function MeetingCreatedModal({
  isOpen,
  onClose,
  meeting,
  onCreateAnother,
}: MeetingCreatedModalProps) {
  const [copied, setCopied] = useState(false);
  const [sendingInvites, setSendingInvites] = useState(false);
  const fireConfetti = useConfetti();

  // Fire confetti as soon as the modal becomes visible
  useEffect(() => {
    if (isOpen && meeting) {
      fireConfetti();
    }
  }, [isOpen, meeting]);

  if (!isOpen || !meeting) return null;

  const meetingUrl = `${window.location.origin}/meetings/${meeting.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(meetingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSendInvitations = async () => {
    setSendingInvites(true);
    // Simulate sending invitations
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSendingInvites(false);
    // Show success toast or notification here
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden relative">
        {/* Success Header */}
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-mint/30 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-status-green" />
          </div>
          
          <h2 className="text-2xl font-bold text-text-primary font-literata mb-2">
            Meeting Created!
          </h2>
          <p className="text-text-secondary">
            {meeting.isRecurring 
              ? `Your recurring meeting series has been scheduled with ${meeting.occurrencesCount || 'multiple'} occurrences.`
              : 'Your meeting has been successfully scheduled.'
            }
          </p>
        </div>

        {/* Meeting Details Card */}
        <div className="mx-8 p-5 bg-surface rounded-2xl border border-border/50">
          <h3 className="font-bold text-text-primary mb-3 line-clamp-1">{meeting.title}</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3 text-text-secondary">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{meeting.date}</span>
            </div>
            <div className="flex items-center gap-3 text-text-secondary">
              <div className="h-4 w-4 rounded-full border-2 border-primary/30" />
              <span>{meeting.startTime} — {meeting.endTime}</span>
            </div>
          </div>

          {/* Copy Link */}
          <div className="mt-4 pt-4 border-t border-border/30">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={meetingUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-white border border-border rounded-xl text-sm text-text-secondary focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
                  copied
                    ? "bg-mint text-status-green"
                    : "bg-primary text-white hover:bg-primary/90"
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-8 space-y-3">
          <button
            onClick={handleSendInvitations}
            disabled={sendingInvites}
            className="w-full py-3.5 bg-primary text-white rounded-2xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Mail className="h-5 w-5" />
            {sendingInvites ? 'Sending...' : 'Send Invitations'}
          </button>

          <Link href={`/meetings/${meeting.id}`} className="block">
            <button className="w-full py-3.5 bg-surface border border-border text-text-primary rounded-2xl font-medium hover:bg-board transition-colors flex items-center justify-center gap-2">
              <ArrowRight className="h-5 w-5" />
              View Meeting Details
            </button>
          </Link>

          <button
            onClick={onCreateAnother}
            className="w-full py-3.5 text-text-secondary rounded-2xl font-medium hover:text-text-primary hover:bg-surface transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Create Another Meeting
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-board rounded-full transition-colors"
        >
          <X className="h-5 w-5 text-text-secondary" />
        </button>
      </div>
    </div>
  );
}
