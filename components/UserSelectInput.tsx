'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Search, Plus, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface User {
  id: string;
  name: string;
  division?: string | null;
}

interface UserSelectInputProps {
  value: string;
  onChange: (value: string, isNew: boolean) => void;
  placeholder?: string;
  allowCreate?: boolean;
}

export function UserSelectInput({ 
  value, 
  onChange, 
  placeholder = "Select user...",
  allowCreate = true 
}: UserSelectInputProps) {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  // Fetch users from Supabase
  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      const { data, error } = await supabase
        .from('people')
        .select('id, name, division')
        .order('name');
      
      if (error) {
        console.error('Error fetching users:', error);
      } else {
        setUsers(data || []);
      }
      setLoading(false);
    }
    
    fetchUsers();
  }, []);

  // Find selected user when value changes
  useEffect(() => {
    if (value) {
      const found = users.find(u => u.name === value || u.id === value);
      if (found && found.id !== selectedUser?.id) {
          setSelectedUser(found);
      } else if (!found && selectedUser !== null) {
          setSelectedUser(null);
      }
    } else if (selectedUser !== null) {
      setSelectedUser(null);
    }
  }, [value, users, selectedUser]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.division && u.division.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelect = (user: User) => {
    onChange(user.name, false);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    if (searchQuery.trim() && allowCreate) {
      onChange(searchQuery.trim(), true);
      setSearchQuery('');
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange('', false);
    setSearchQuery('');
    setSelectedUser(null);
  };

  const showCreateOption = allowCreate && 
    searchQuery.trim() && 
    !filteredUsers.some(u => u.name.toLowerCase() === searchQuery.toLowerCase());

  return (
    <div ref={inputRef} className="relative">
      {/* Input Field */}
      <div 
        onClick={() => setIsOpen(true)}
        className={cn(
          "w-full px-5 py-3 border rounded-2xl bg-white text-text-primary font-light text-base cursor-pointer flex items-center justify-between transition-all",
          isOpen 
            ? "border-primary ring-2 ring-primary/20" 
            : "border-border hover:border-primary/50"
        )}
      >
        {selectedUser ? (
          <div className="flex items-center gap-2 flex-1">
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
              {selectedUser.name.charAt(0)}
            </div>
            <span className="text-text-primary">
              {selectedUser.name}
              {selectedUser.division && (
                <span className="text-text-tertiary text-sm ml-1">({selectedUser.division})</span>
              )}
            </span>
          </div>
        ) : (
          <span className="text-text-tertiary">{placeholder}</span>
        )}
        
        <div className="flex items-center gap-2">
          {selectedUser && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 hover:bg-board rounded-full transition-colors"
            >
              <X className="h-4 w-4 text-text-tertiary" />
            </button>
          )}
          <Search className="h-4 w-4 text-text-tertiary" />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-2xl shadow-lg z-50 max-h-64 overflow-y-auto">
          {/* Search input inside dropdown */}
          <div className="p-3 border-b border-border/50">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full px-3 py-2 bg-surface border border-border/50 rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>

          {/* User list */}
          <div className="py-2">
            {loading ? (
              <div className="px-4 py-3 text-sm text-text-tertiary">Loading...</div>
            ) : filteredUsers.length === 0 && !showCreateOption ? (
              <div className="px-4 py-3 text-sm text-text-tertiary">
                No users found
              </div>
            ) : (
              <>
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelect(user)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface transition-colors text-left"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">{user.name}</p>
                      {user.division && (
                        <p className="text-xs text-text-tertiary">{user.division}</p>
                      )}
                    </div>
                  </button>
                ))}
                
                {/* Create new option */}
                {showCreateOption && (
                  <button
                    onClick={handleCreateNew}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-mint/30 transition-colors text-left border-t border-border/30"
                  >
                    <div className="h-8 w-8 rounded-full bg-mint flex items-center justify-center">
                      <Plus className="h-4 w-4 text-status-green" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        Create &quot;{searchQuery.trim()}&quot;
                      </p>
                      <p className="text-xs text-text-tertiary">Add as new user</p>
                    </div>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
