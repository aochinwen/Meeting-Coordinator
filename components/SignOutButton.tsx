'use client';

import { logout } from '@/app/actions/auth';
import { LogOut } from 'lucide-react';
import { useState, useTransition } from 'react';

export function SignOutButton({ initials }: { initials: string }) {
  const [pending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        id="user-avatar-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8 rounded-full border border-[rgba(196,200,188,0.5)] bg-primary flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer"
        aria-label="Account menu"
        aria-expanded={isOpen}
      >
        <span className="text-white text-xs font-semibold">{initials}</span>
      </button>

      {/* Dropdown - using click instead of hover to avoid gap issues */}
      {isOpen && (
        <div className="absolute right-0 top-full pt-2 z-50">
          <div className="w-44 bg-white rounded-2xl shadow-lg shadow-black/10 border border-[rgba(196,200,188,0.3)] overflow-hidden">
            <form
              action={() => startTransition(() => logout())}
            >
              <button
                id="signout-btn"
                type="submit"
                disabled={pending}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[#4a4e4a] hover:bg-[#f5f1ea] transition-colors disabled:opacity-60 text-left"
              >
                <LogOut className="w-4 h-4" />
                {pending ? 'Signing out…' : 'Sign Out'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
