'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  CalendarDays, 
  Users, 
  BarChart2, 
  Settings, 
  HelpCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();

  const mainRoutes = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/', active: pathname === '/' },
    { label: 'Templates', icon: FileText, href: '/templates', active: pathname?.startsWith('/templates') },
    { label: 'Schedule', icon: CalendarDays, href: '/schedule', active: pathname?.startsWith('/schedule') },
    { label: 'Directory', icon: Users, href: '/directory', active: pathname?.startsWith('/directory') },
    { label: 'Reports', icon: BarChart2, href: '/reports', active: pathname?.startsWith('/reports') },
  ];

  const bottomRoutes = [
    { label: 'Settings', icon: Settings, href: '/settings', active: pathname?.startsWith('/settings') },
    { label: 'Help', icon: HelpCircle, href: '/help', active: pathname?.startsWith('/help') },
  ];

  return (
    <aside className="bg-board border-r border-border h-full fixed left-0 top-16 w-64 flex flex-col justify-between py-4 px-4 z-40">
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
  );
}
