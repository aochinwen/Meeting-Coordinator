'use client';

import { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { Database } from '@/types/supabase';

type User = Database['public']['Tables']['people']['Row'];

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onDelete: (userId: string) => Promise<void>;
}

export function DeleteUserModal({ isOpen, onClose, user, onDelete }: DeleteUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await onDelete(user.id);
      onClose();
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-6 border-b border-border/30 flex items-center justify-between bg-surface">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary font-literata">
              Remove Member
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:bg-black/5 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8">
          <div className="flex items-start gap-3 mb-6">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-base text-text-primary font-light">
              Are you sure you want to remove{' '}
              <strong className="font-bold">{user.name}</strong> from the directory?
              This action cannot be undone.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-2xl text-base font-bold text-text-secondary hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="px-8 py-3 bg-red-600 text-white rounded-2xl text-base font-bold shadow-md hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isSubmitting ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
