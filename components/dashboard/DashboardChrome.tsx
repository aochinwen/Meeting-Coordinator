import Link from 'next/link';
import { Plus, Search, CalendarCheck2, Clock, Users } from 'lucide-react';
import { FilterDropdown, SortDropdown } from '@/components/DropdownFilter';
import { ViewToggle } from './ViewToggle';
import { TypeFilter, type SelectedTypes } from './TypeFilter';
import { PersonFilter, type PersonFilterOption } from './PersonFilter';
import type { DashboardParams } from './url';

export type ChromeStats = {
  thisWeekMeetings: number;
  thisMonthMeetings: number;
  activeTeamMembers: number;
};

export function DashboardChrome({
  current,
  params,
  selectedTypes,
  view,
  stats,
  people,
  selectedPersonId,
  showDateFilter = true,
  showSort = true,
  children,
}: {
  current: DashboardParams;
  params: {
    search: string;
    filter: string;
    sortBy: string;
    sortOrder: string;
    view: 'list' | 'calendar';
    calView: string;
    anchor: string;
    types: string;
    person: string;
  };
  selectedTypes: SelectedTypes;
  view: 'list' | 'calendar';
  stats: ChromeStats;
  people: PersonFilterOption[];
  selectedPersonId: string | null;
  showDateFilter?: boolean;
  showSort?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-[1280px] mx-auto space-y-8 pb-12 pt-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary font-literata">
            Control Center
          </h1>
          <p className="text-base font-light text-text-secondary">
            Welcome back. Here is what needs your attention today.
          </p>
        </div>
        <Link href="/schedule" className="sm:self-auto self-start">
          <button className="flex items-center gap-2 px-5 sm:px-6 py-3 bg-primary text-white rounded-full text-sm sm:text-base font-light shadow-md transition-all active:scale-95">
            <Plus className="h-4 w-4" />
            New Meeting
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <StatCard
          icon={<CalendarCheck2 className="h-5 w-5 text-primary" />}
          iconBg="bg-status-green-bg/30"
          badge="This week"
          badgeBg="bg-status-green-bg/30"
          badgeText="text-primary"
          label="Meetings This Week"
          value={stats.thisWeekMeetings}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-status-amber" />}
          iconBg="bg-amber/30"
          badge="This month"
          badgeBg="bg-amber/30"
          badgeText="text-status-amber"
          label="Meetings This Month"
          value={stats.thisMonthMeetings}
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-text-secondary" />}
          iconBg="bg-board border border-border/20"
          badge=""
          badgeBg=""
          badgeText=""
          label="Active Team Members"
          value={stats.activeTeamMembers}
        />
      </div>

      <div className="bg-status-grey-bg rounded-3xl p-4 flex flex-col gap-3 shrink-0">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
          <form
            className="flex-1 bg-board rounded-2xl flex items-center px-4 py-3 relative overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all"
            action="/"
            method="GET"
          >
            <Search className="h-5 w-5 text-gray-500 shrink-0" />
            <input
              type="text"
              name="search"
              defaultValue={params.search}
              placeholder="Search meetings, attendees, or topics..."
              className="w-full bg-transparent border-none outline-none pl-3 text-text-secondary placeholder-gray-500 font-light text-base"
            />
            {/* Preserve other params on search submit */}
            <input type="hidden" name="filter" value={params.filter} />
            <input type="hidden" name="sortBy" value={params.sortBy} />
            <input type="hidden" name="sortOrder" value={params.sortOrder} />
            <input type="hidden" name="view" value={params.view} />
            {params.calView && <input type="hidden" name="calView" value={params.calView} />}
            {params.anchor && <input type="hidden" name="anchor" value={params.anchor} />}
            {params.types && <input type="hidden" name="types" value={params.types} />}
            {params.person && <input type="hidden" name="person" value={params.person} />}
          </form>
          <div className="grid grid-cols-2 sm:flex gap-2 shrink-0 w-full sm:w-auto">
            <ViewToggle current={current} view={view} />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2 shrink-0 w-full sm:w-auto sm:self-end">
          <TypeFilter current={current} selected={selectedTypes} />
          <PersonFilter current={current} people={people} selectedId={selectedPersonId} />
          {showDateFilter && (
            <FilterDropdown
              search={params.search}
              filter={params.filter}
              sortBy={params.sortBy}
              sortOrder={params.sortOrder}
              view={params.view}
              calView={params.calView}
              anchor={params.anchor}
              types={params.types}
            />
          )}
          {showSort && (
            <SortDropdown
              search={params.search}
              filter={params.filter}
              sortBy={params.sortBy}
              sortOrder={params.sortOrder}
              view={params.view}
              calView={params.calView}
              anchor={params.anchor}
              types={params.types}
            />
          )}
        </div>
      </div>

      {children}
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  badge,
  badgeBg,
  badgeText,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-surface border border-border/30 rounded-3xl p-6 flex flex-col justify-between h-[178px]">
      <div className="flex items-start justify-between">
        <div className={`h-11 w-11 rounded-full flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        {badge && (
          <div className={`${badgeBg} px-3 py-1 rounded-full`}>
            <span className={`text-xs ${badgeText} font-light`}>{badge}</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm tracking-wide text-text-tertiary uppercase font-light">{label}</h3>
        <p className="text-4xl font-bold text-text-primary leading-none font-literata">{value}</p>
      </div>
    </div>
  );
}
