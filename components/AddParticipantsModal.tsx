'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Search, UserPlus, Check } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface Person {
  id: string;
  name: string;
  division: string | null;
  rank: string | null;
}

interface AddParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (userIds: string[]) => Promise<void>;
  existingParticipantIds: string[];
}

export function AddParticipantsModal({ 
  isOpen, 
  onClose, 
  onAdd, 
  existingParticipantIds 
}: AddParticipantsModalProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPeople();
    }
  }, [isOpen]);

  async function fetchPeople() {
    setIsFetching(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('people')
      .select('id, name, division, rank')
      .order('name');

    if (error) {
      console.error('Error fetching people:', error);
    } else {
      setPeople(data || []);
    }
    setIsFetching(false);
  }

  const availablePeople = useMemo(() => {
    return people.filter(
      p => !existingParticipantIds.includes(p.id)
    );
  }, [people, existingParticipantIds]);

  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return availablePeople;
    const query = searchQuery.toLowerCase();
    return availablePeople.filter(
      p => 
        p.name.toLowerCase().includes(query) ||
        (p.division?.toLowerCase().includes(query) ?? false) ||
        (p.rank?.toLowerCase().includes(query) ?? false)
    );
  }, [availablePeople, searchQuery]);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;

    setIsLoading(true);
    try {
      await onAdd(Array.from(selectedIds));
      setSelectedIds(new Set());
      setSearchQuery('');
      onClose();
    } catch (error) {
      console.error('Error adding participants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div 
        className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-6 border-b border-border/30 flex items-center justify-between bg-surface">
          <div>
            <h2 className="text-2xl font-bold text-text-primary font-literata">
              Add Participants
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select people to add to this meeting'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-secondary hover:bg-black/5 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 border-b border-border/20">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, division, or rank..."
              className="w-full pl-10 pr-4 py-3 bg-surface border border-border/50 rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-light"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isFetching ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : filteredPeople.length === 0 ? (
            <div className="text-center py-12 text-text-tertiary">
              {searchQuery.trim() ? 'No matching people found' : 'No available people to add'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPeople.map((person) => {
                const isSelected = selectedIds.has(person.id);
                return (
                  <button
                    key={person.id}
                    onClick={() => toggleSelection(person.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left ${
                      isSelected 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'bg-surface border border-transparent hover:border-border/30'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      isSelected ? 'bg-primary text-white' : 'bg-sage text-white'
                    }`}>
                      {isSelected ? <Check className="h-5 w-5" /> : getInitials(person.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">
                        {person.name}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {person.rank || 'No rank'} · {person.division || 'No division'}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border/20 bg-surface flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl text-base font-bold text-text-secondary hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || selectedIds.size === 0}
            className="px-8 py-3 bg-primary text-white rounded-2xl text-base font-bold shadow-md hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
