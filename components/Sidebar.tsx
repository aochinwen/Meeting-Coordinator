'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { 
  Menu,
  X,
  LayoutDashboard, 
  FileText, 
  CalendarDays, 
  Users, 
  Monitor,
  BarChart2, 
  Settings, 
  HelpCircle,
  DoorOpen,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';

export function Sidebar() {
  const pathname = usePathname() ?? '/';
  const [user, setUser] = useState<User | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthLoaded(true);
    });
  }, []);

  const isAdmin = user?.email === 'chinwen.ao@gmail.com';

  const mainRoutes = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/', active: pathname === '/' },
    { label: 'Templates', icon: FileText, href: '/templates', active: pathname?.startsWith('/templates') },
    { label: 'Schedule', icon: CalendarDays, href: '/schedule', active: pathname?.startsWith('/schedule') },
    { label: 'Demo', icon: Monitor, href: '/demo', active: pathname?.startsWith('/demo') },
    { label: 'Rooms', icon: DoorOpen, href: '/rooms', active: pathname?.startsWith('/rooms') },
    { label: 'Directory', icon: Users, href: '/directory', active: pathname?.startsWith('/directory') },
    { label: 'Reports', icon: BarChart2, href: '/reports', active: pathname?.startsWith('/reports') },
    // Admin-only route
    ...(authLoaded && isAdmin ? [{ label: 'User Approvals', icon: ShieldCheck, href: '/admin/approvals', active: pathname?.startsWith('/admin/approvals') }] : []),
  ];

  const bottomRoutes = [
    { label: 'Settings', icon: Settings, href: '/settings', active: pathname?.startsWith('/settings') },
    { label: 'Help', icon: HelpCircle, href: '/help', active: pathname?.startsWith('/help') },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen((prev) => !prev)}
        className="lg:hidden fixed left-4 top-20 z-50 h-10 w-10 rounded-xl border border-border bg-white/95 backdrop-blur flex items-center justify-center shadow-sm"
        aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
      >
        {mobileOpen ? <X className="h-5 w-5 text-text-primary" /> : <Menu className="h-5 w-5 text-text-primary" />}
      </button>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="lg:hidden fixed inset-0 top-16 z-30 bg-black/20"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'bg-board border-r border-border fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 flex flex-col justify-between py-4 px-4 z-40 transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0'
        )}
      >
        <div className="flex flex-col gap-8 w-full">
          <div className="flex items-center gap-3 px-2 w-full">
            <div className="bg-primary rounded-2xl w-10 h-10 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg leading-none">O</span>
            </div>
            <div className="flex flex-col">
              <h2 className="font-['Literata',serif] text-lg leading-tight text-primary">The Organizer</h2>
              <p className="font-light text-xs text-text-tertiary leading-tight">Management Suite</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1 w-full">
            {mainRoutes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-full text-sm font-light transition-all w-full',
                  route.active 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-text-secondary hover:bg-surface'
                )}
              >
                <route.icon className={cn("w-4 h-4 shrink-0", route.active ? "text-white" : "text-text-secondary")} />
                {route.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-border pt-4 w-full flex flex-col gap-1">
          {bottomRoutes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-full text-sm font-light transition-all w-full',
                route.active 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-text-secondary hover:bg-surface'
              )}
            >
              <route.icon className={cn("w-4 h-4 shrink-0", route.active ? "text-white" : "text-text-secondary")} />
              {route.label}
            </Link>
          ))}
        </div>
      </aside>
    </>
  );
}
