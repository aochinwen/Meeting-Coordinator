'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface User {
  id: string;
  name: string;
  division: string | null;
}

export function UserTaggingInput({ 
  value, 
  onChange, 
  onEnter 
}: { 
  value: string; 
  onChange: (v: string) => void; 
  onEnter: () => void; 
}) {
  const supabase = createClient();
  const [cursorPos, setCursorPos] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch users from Supabase
  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, division')
        .order('name');
      
      if (error) {
        console.error('Error fetching users:', error);
      } else {
        setUsers(data || []);
      }
    }
    
    fetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { showDropdown, searchQuery } = useMemo(() => {
    if (cursorPos === null) return { showDropdown: false, searchQuery: '' };
    
    // Look backwards from cursor to find an '@' symbol
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        return { showDropdown: true, searchQuery: textAfterAt };
      }
    }
    return { showDropdown: false, searchQuery: '' };
  }, [value, cursorPos]);

  const handleSelectUser = (user: User) => {
    if (cursorPos === null) return;
    
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    // Replace the '@query' with '@UserName '
    const newText = 
      value.substring(0, lastAtIndex) + 
      `@${user.name} ` + 
      value.substring(cursorPos);
      
    onChange(newText);
    
    // Refocus input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative flex-1">
      <input 
        ref={inputRef}
        type="text" 
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setCursorPos(e.target.selectionStart);
        }}
        onClick={(e) => setCursorPos(e.currentTarget.selectionStart)}
        onKeyUp={(e) => setCursorPos(e.currentTarget.selectionStart)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !showDropdown) {
            onEnter();
          }
        }}
        className="w-full px-4 py-3 border border-border rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-light text-text-primary placeholder:text-text-tertiary"
        placeholder="Add a new checklist task... (Use @ to tag people)"
      />
      
      {showDropdown && filteredUsers.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-border rounded-2xl shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-border/30 bg-surface flex items-center gap-2 text-xs text-text-tertiary font-medium">
            <Search className="h-3 w-3" />
            Members matching &quot;{searchQuery}&quot;
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filteredUsers.map((user) => (
              <li 
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className="px-3 py-2 hover:bg-surface cursor-pointer flex flex-col transition-colors border-l-2 border-transparent hover:border-primary"
              >
                <span className="text-sm font-medium text-text-primary">{user.name}</span>
                <span className="text-xs text-text-tertiary">{user.division}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
