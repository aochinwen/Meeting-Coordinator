import Link from 'next/link';
import { Bell } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { SignOutButton } from '@/components/SignOutButton';

function getInitials(email: string | undefined): string {
  if (!email) return '?';
  // Use first two chars of the local part of the email
  const local = email.split('@')[0];
  return local.slice(0, 2).toUpperCase();
}

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const initials = getInitials(user?.email);

  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-board border-b border-border/50 flex items-center justify-between px-6 z-50">
      <div className="flex items-center">
        <Link href="/" className="font-['Literata',serif] font-bold text-xl text-primary">
          The Organizer
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <button
          id="notifications-btn"
          className="p-2 rounded-full hover:bg-surface transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-text-secondary" />
        </button>

        {user ? (
          <SignOutButton initials={initials} />
        ) : (
          <Link
            href="/login"
            className="h-8 w-8 rounded-full border border-border bg-primary flex items-center justify-center"
          >
            <span className="text-white text-xs font-semibold">?</span>
          </Link>
        )}
      </div>
    </div>
  );
}
