'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (user: { name: string; division: string; rank: string }) => Promise<void>;
}

export function AddUserModal({ isOpen, onClose, onAdd }: AddUserModalProps) {
  const [name, setName] = useState('');
  const [division, setDivision] = useState('');
  const [rank, setRank] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !division || !rank) return;
    
    setIsLoading(true);
    try {
      await onAdd({ name, division, rank });
      setName('');
      setDivision('');
      setRank('');
      onClose();
    } catch (error) {
      console.error('Error adding user:', error);
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
            Add New Member
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
              <label htmlFor="name" className="block text-sm font-bold text-text-primary mb-2 uppercase tracking-wide">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full px-4 py-3 bg-surface border border-border/50 rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-light"
                required
              />
            </div>

            <div>
              <label htmlFor="division" className="block text-sm font-bold text-text-primary mb-2 uppercase tracking-wide">
                Division
              </label>
              <input
                id="division"
                type="text"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                placeholder="e.g. Engineering"
                className="w-full px-4 py-3 bg-surface border border-border/50 rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-light"
                required
              />
            </div>

            <div>
              <label htmlFor="rank" className="block text-sm font-bold text-text-primary mb-2 uppercase tracking-wide">
                Rank / Role
              </label>
              <select
                id="rank"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-border/50 rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-light appearance-none"
                required
              >
                <option value="" disabled>Select a rank</option>
                <option value="Executive">Executive</option>
                <option value="Manager">Manager</option>
                <option value="Associate">Associate</option>
                <option value="Director">Director</option>
                <option value="Analyst">Analyst</option>
                <option value="Staff">Staff</option>
              </select>
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
              disabled={isLoading || !name || !division || !rank}
              className="px-8 py-3 bg-primary text-white rounded-2xl text-base font-bold shadow-md hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
