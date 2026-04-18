'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Database } from '@/types/supabase';
import { RankCombobox } from '@/components/ui/RankCombobox';

type User = Database['public']['Tables']['people']['Row'];

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  existingRanks: string[];
  onSave: (userId: string, updates: { name: string; email: string; division: string; rank: string }) => Promise<void>;
}

export function EditUserModal({ isOpen, onClose, user, existingRanks, onSave }: EditUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [division, setDivision] = useState('');
  const [rank, setRank] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email ?? '');
      setDivision(user.division ?? '');
      setRank(user.rank ?? '');
      setSubmitted(false);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!name || !division || !rank) return;

    setIsLoading(true);
    try {
      await onSave(user.id, { name, email, division, rank });
      onClose();
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-6 border-b border-border/30 flex items-center justify-between bg-surface">
          <h2 className="text-2xl font-bold text-text-primary font-literata">
            Edit Member
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:bg-black/5 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-name" className="block text-sm font-bold text-text-primary mb-2 uppercase tracking-wide">
                Full Name
              </label>
              <input
                id="edit-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className={`w-full px-4 py-3 bg-surface border rounded-2xl text-text-primary focus:outline-none focus:ring-2 transition-all font-light ${
                  submitted && !name
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-border/50 focus:ring-primary/20'
                }`}
              />
              {submitted && !name && (
                <p className="mt-1 text-xs text-red-500 px-1">Full name is required.</p>
              )}
            </div>

            <div>
              <label htmlFor="edit-email" className="block text-sm font-bold text-text-primary mb-2 uppercase tracking-wide">
                Email <span className="text-text-secondary normal-case font-normal tracking-normal">(optional)</span>
              </label>
              <input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. jane.doe@company.com"
                className="w-full px-4 py-3 bg-surface border border-border/50 rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-light"
              />
            </div>

            <div>
              <label htmlFor="edit-division" className="block text-sm font-bold text-text-primary mb-2 uppercase tracking-wide">
                Division
              </label>
              <input
                id="edit-division"
                type="text"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                placeholder="e.g. Engineering"
                className={`w-full px-4 py-3 bg-surface border rounded-2xl text-text-primary focus:outline-none focus:ring-2 transition-all font-light ${
                  submitted && !division
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-border/50 focus:ring-primary/20'
                }`}
              />
              {submitted && !division && (
                <p className="mt-1 text-xs text-red-500 px-1">Division is required.</p>
              )}
            </div>

            <div>
              <label htmlFor="edit-rank" className="block text-sm font-bold text-text-primary mb-2 uppercase tracking-wide">
                Rank / Role
              </label>
              <RankCombobox
                id="edit-rank"
                value={rank}
                onChange={setRank}
                seedRanks={existingRanks}
                hasError={submitted && !rank}
              />
              {submitted && !rank && (
                <p className="mt-1 text-xs text-red-500 px-1">Rank / Role is required.</p>
              )}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-2xl text-base font-bold text-text-secondary hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-primary text-white rounded-2xl text-base font-bold shadow-md hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
