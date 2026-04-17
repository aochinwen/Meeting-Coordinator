'use client';

import { useState } from 'react';
import { Plus, Search, MoreHorizontal, ChevronDown, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Database } from '@/types/supabase';
import { createClient } from '@/utils/supabase/client';
import { AddUserModal } from './AddUserModal';

type User = Database['public']['Tables']['profiles']['Row'];

interface DirectoryClientProps {
  initialUsers: User[];
  activeTeamsCount: number;
}

export function DirectoryClient({ initialUsers, activeTeamsCount }: DirectoryClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState('All Organizations');
  const [rankFilter, setRankFilter] = useState('Filter by Rank');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const supabase = createClient();

  const ITEMS_PER_PAGE = 4;

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                          (u.division && u.division.toLowerCase().includes(search.toLowerCase()));
    const matchesRank = rankFilter === 'Filter by Rank' || u.rank === rankFilter;
    return matchesSearch && matchesRank;
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const formatEmail = (name: string) => {
    return `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`;
  };

  const getRankBadgeProps = (rank: string | null | undefined) => {
    if (!rank) return { bg: 'bg-gray-100', text: 'text-gray-800' };
    const lowerRank = rank.toLowerCase();
    if (lowerRank.includes('exec')) return { bg: 'bg-amber', text: 'text-status-amber' };
    if (lowerRank.includes('manager')) return { bg: 'bg-warm', text: 'text-text-primary' };
    if (lowerRank.includes('assoc')) return { bg: 'bg-mint', text: 'text-status-green' };
    return { bg: 'bg-gray-100', text: 'text-gray-800' };
  };

  const getAvatarProps = (name: string) => {
    const bgs = ['bg-warm', 'bg-mint', 'bg-amber', 'bg-taupe'];
    const textColors = ['text-text-primary', 'text-text-primary', 'text-text-primary', 'text-text-primary'];
    const idx = Math.abs(name.charCodeAt(0) % bgs.length);
    return { bg: bgs[idx], textColor: textColors[idx] };
  };

  // Mock organizations for presentation
  const getOrganization = (id: string) => {
    const orgs = ['Green Earth Initiative', 'Terra Foundations', 'Rooted Logistics'];
    const idx = parseInt(id.replace(/\D/g, '') || '0', 10) % orgs.length;
    return orgs[idx];
  };

  const handleAddUser = async (newUser: { name: string; division: string; rank: string }) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          id: crypto.randomUUID(), // Mock ID, real implementation uses auth triggers
          name: newUser.name,
          division: newUser.division,
          rank: newUser.rank,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Failed to add user', error);
      throw error;
    }

    if (data) {
      setUsers([...users, data].sort((a, b) => a.name.localeCompare(b.name)));
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto pb-24 h-full flex flex-col pt-8 space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between shrink-0">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary font-literata">
            People Directory
          </h1>
          <p className="text-base font-light text-text-secondary">
            Manage organization members, divisional roles, and access ranks.
          </p>
        </div>
        
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-base font-bold shadow-md transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        <div className="col-span-2 relative">
          <div className="bg-white rounded-[24px] shadow-sm flex items-center px-4 py-3 border border-transparent focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Search className="h-4 w-4 text-gray-500 shrink-0" />
            <input 
              type="text" 
              placeholder="Search by name, email, or organization..." 
              className="w-full bg-transparent border-none outline-none pl-3 text-text-primary placeholder-gray-500 font-light text-base"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>
        <div className="col-span-1">
          <div className="bg-white rounded-[24px] shadow-sm flex items-center justify-between px-4 py-3 cursor-pointer">
            <span className="text-base text-text-primary font-light">{organizationFilter}</span>
            <ChevronDown className="h-4 w-4 text-text-primary" />
          </div>
        </div>
        <div className="col-span-1">
          <div className="bg-white rounded-[24px] shadow-sm flex items-center justify-between px-4 py-3 cursor-pointer">
            <span className="text-base text-text-primary font-light">{rankFilter}</span>
            <ChevronDown className="h-4 w-4 text-text-primary" />
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-[24px] shadow-sm overflow-hidden flex-1 flex flex-col min-h-0 border border-border/20">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-surface border-b border-border/30 text-xs tracking-[0.6px] uppercase text-text-secondary font-bold shrink-0">
          <div className="col-span-3">Name</div>
          <div className="col-span-3">Organization</div>
          <div className="col-span-3">Division</div>
          <div className="col-span-1">Rank</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/20 overflow-y-auto">
          {paginatedUsers.length > 0 ? paginatedUsers.map((user) => {
            const avatar = getAvatarProps(user.name);
            const rankBadge = getRankBadgeProps(user.rank);
            const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2);
            
            return (
              <div key={user.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-board/30 transition-colors group">
                <div className="col-span-3 flex items-center gap-3">
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0", avatar.bg, avatar.textColor)}>
                    {initials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h4 className="text-base font-bold text-text-primary truncate">{user.name}</h4>
                    <p className="text-sm font-light text-text-secondary truncate">{formatEmail(user.name)}</p>
                  </div>
                </div>
                
                <div className="col-span-3 flex items-center">
                  <span className="text-base text-text-primary font-medium">{getOrganization(user.id)}</span>
                </div>
                
                <div className="col-span-3 flex items-center">
                  <span className="text-base text-text-secondary font-light">{user.division}</span>
                </div>
                
                <div className="col-span-1 flex items-center">
                  <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-bold", rankBadge.bg, rankBadge.text)}>
                    {user.rank}
                  </span>
                </div>
                
                <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 text-text-secondary hover:bg-surface rounded-lg transition-colors">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-text-secondary hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          }) : (
             <div className="p-12 text-center text-text-tertiary font-light">
               No people found.
             </div>
          )}
        </div>

        {/* Pagination bar */}
        <div className="bg-surface border-t border-border/30 px-6 py-4 flex items-center justify-between shrink-0">
          <span className="text-sm font-light text-text-secondary">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} people
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-transparent border border-border/50 rounded-2xl text-sm font-bold text-text-primary hover:bg-white transition-colors disabled:opacity-50"
            >
              Previous
            </button>
            
            {Array.from({ length: totalPages }).map((_, i) => (
              <button 
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={cn("h-9 w-9 flex items-center justify-center rounded-2xl text-sm font-bold transition-colors",
                  currentPage === i + 1 
                    ? "bg-primary text-white shadow-sm" 
                    : "bg-transparent text-text-primary hover:bg-white"
                )}
              >
                {i + 1}
              </button>
            ))}

            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-transparent border border-border/50 rounded-2xl text-sm font-bold text-text-primary hover:bg-white transition-colors disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Stats OVERLAY CARDS */}
      <div className="grid grid-cols-3 gap-6 shrink-0 mt-6">
        <div className="bg-sage/20 border border-primary/10 rounded-[24px] p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm tracking-widest uppercase text-text-secondary font-light">Total Members</h3>
              <p className="text-3xl font-bold text-primary font-literata">{initialUsers.length}</p>
            </div>
            <UsersIcon className="h-6 w-6 text-status-green" />
          </div>
          <p className="text-xs text-status-green font-medium">+12% from last quarter</p>
        </div>
        
        <div className="bg-amber/20 border border-status-amber/10 rounded-[24px] p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm tracking-widest uppercase text-text-secondary font-light">Active Teams</h3>
              <p className="text-3xl font-bold text-status-amber font-literata">{activeTeamsCount}</p>
            </div>
            <ActivityIcon className="h-6 w-6 text-status-amber" />
          </div>
          <p className="text-xs text-status-amber font-medium">Distributed across 6 continents</p>
        </div>
        
        <div className="bg-warm border border-text-secondary/10 rounded-[24px] p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm tracking-widest uppercase text-text-secondary font-light">Pending Invites</h3>
              <p className="text-3xl font-bold text-text-primary font-literata">18</p>
            </div>
            <InviteIcon className="h-6 w-6 text-text-secondary" />
          </div>
          <p className="text-xs text-text-secondary font-medium">Avg. acceptance time: 4 hours</p>
        </div>
      </div>

      <AddUserModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddUser} 
      />
    </div>
  );
}

// Temporary icons until proper import
function UsersIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ActivityIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="m19 14-3-1" />
      <circle cx="20" cy="15" r="2" />
      <path d="m19 10-3 1" />
      <circle cx="20" cy="9" r="2" />
      <path d="m5 14 3-1" />
      <circle cx="4" cy="15" r="2" />
      <path d="m5 10 3 1" />
      <circle cx="4" cy="9" r="2" />
    </svg>
  );
}

function InviteIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
