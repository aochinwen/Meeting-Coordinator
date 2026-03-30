'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface User {
  id: string;
  name: string;
  division: string;
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
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cursorPos, setCursorPos] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch users from Supabase
  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
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

  useEffect(() => {
    if (cursorPos === null) return;
    
    // Look backwards from cursor to find an '@' symbol
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Check if there's a space after the '@' before the cursor
      // If there's a space, we stop the search (usually tags don't have spaces inside)
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setSearchQuery(textAfterAt);
        setShowDropdown(true);
        return;
      }
    }
    setShowDropdown(false);
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
    setShowDropdown(false);
    
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
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        placeholder="Add a new checklist task... (Use @ to tag people)"
      />
      
      {showDropdown && filteredUsers.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2 text-xs text-gray-500 font-medium">
            <Search className="h-3 w-3" />
            Members matching "{searchQuery}"
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filteredUsers.map((user) => (
              <li 
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex flex-col transition-colors border-l-2 border-transparent hover:border-primary"
              >
                <span className="text-sm font-medium text-gray-900">{user.name}</span>
                <span className="text-xs text-gray-500">{user.division}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
