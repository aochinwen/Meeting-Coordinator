import { createClient } from '@/utils/supabase/server';
import { Suspense } from 'react';
import { ChevronRight, Plus, Search, Video, Target, User, Users, CalendarCheck2, Clock, CheckCircle2, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { DashboardSkeleton } from '@/components/ui/loading-skeleton';
import { FilterDropdown, SortDropdown } from '@/components/DropdownFilter';

interface MeetingWithRelations {
  id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  series_id: string | null;
  meeting_participants: { user_id: string }[];
  meeting_checklist_tasks: { id: string; is_completed: boolean }[];
}

interface Profile {
  id: string;
  name: string;
}

export const revalidate = 60; // Revalidate every 60 seconds

// Component that fetches and displays data
const PAGE_SIZE = 10;

async function DashboardContent({
  page,
  search,
  filter,
  sortBy,
  sortOrder,
}: {
  page: number;
  search: string;
  filter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}) {
  const supabase = await createClient();

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Calculate default date range (today to 3 months from today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threeMonthsFromToday = new Date(today);
  threeMonthsFromToday.setMonth(threeMonthsFromToday.getMonth() + 3);

  // Calculate this week range (Sunday to Saturday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  // Calculate this month range
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const defaultStartDate = today.toISOString().split('T')[0];
  const defaultEndDate = threeMonthsFromToday.toISOString().split('T')[0];

  // Parse filter param
  let dateRangeStart = defaultStartDate;
  let dateRangeEnd = defaultEndDate;
  if (filter === 'all') {
    dateRangeStart = '1900-01-01';
    dateRangeEnd = '2099-12-31';
  } else if (filter === 'today') {
    dateRangeStart = defaultStartDate;
    dateRangeEnd = defaultStartDate;
  } else if (filter === 'week') {
    const oneWeekFromToday = new Date(today);
    oneWeekFromToday.setDate(oneWeekFromToday.getDate() + 7);
    dateRangeStart = defaultStartDate;
    dateRangeEnd = oneWeekFromToday.toISOString().split('T')[0];
  } else if (filter === 'month') {
    // Default 3 month range already set
  }

  // Build the query
  let meetingsQuery = supabase
    .from('meetings')
    .select(`
      *,
      meeting_participants(user_id),
      meeting_checklist_tasks(id, is_completed),
      series_id
    `, { count: 'exact' })
    .gte('date', dateRangeStart)
    .lte('date', dateRangeEnd);

  // Apply search filter
  if (search) {
    meetingsQuery = meetingsQuery.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  // Apply sorting
  const validSortColumns = ['date', 'title', 'status'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'date';
  meetingsQuery = meetingsQuery.order(sortColumn, { ascending: sortOrder === 'asc' });

  // Fetch all data in parallel for better performance
  const [
    { data: meetingsData, count: meetingsCount },
    { data: profiles },
    { count: usersCount },
    { count: thisWeekMeetingsCount },
    { count: thisMonthMeetingsCount }
  ] = await Promise.all([
    meetingsQuery.range(from, to),
    // Fetch all users for attendee names
    supabase
      .from('people')
      .select('id, name')
      .order('name', { ascending: true }),
    // Fetch active team members count
    supabase
      .from('people')
      .select('*', { count: 'exact', head: true }),
    // Fetch meetings this week count
    supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .gte('date', startOfWeek.toISOString().split('T')[0])
      .lte('date', endOfWeek.toISOString().split('T')[0]),
    // Fetch meetings this month count
    supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .gte('date', startOfMonth.toISOString().split('T')[0])
      .lte('date', endOfMonth.toISOString().split('T')[0])
  ]);

  const totalMeetings = meetingsCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalMeetings / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  // Create a profile map for quick lookup
  const profileMap = new Map<string, string>();
  profiles?.forEach(p => profileMap.set(p.id, p.name));

  const activeTeamMembers = usersCount || 0;

  const meetings = (meetingsData as unknown as MeetingWithRelations[]) || [];

  const rangeStart = totalMeetings === 0 ? 0 : from + 1;
  const rangeEnd = from + meetings.length;

  // Pre-format meeting data for rendering
  const formattedMeetings = meetings.map((meeting) => {
    const isLive = meeting.status === 'scheduled' && meeting.date === new Date().toISOString().split('T')[0];
    const totalTasks = meeting.meeting_checklist_tasks?.length || 0;
    const completedTasks = meeting.meeting_checklist_tasks?.filter(t => t.is_completed).length || 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const participantIds = meeting.meeting_participants?.map(p => p.user_id) || [];
    const attendees = participantIds.slice(0, 3).map(id => {
      const name = profileMap.get(id) || '?';
      return {
        name,
        initials: name.charAt(0).toUpperCase()
      };
    });
    const remainingCount = Math.max(0, participantIds.length - 3);

    const icons = [Video, Target, User];
    const bgs = ['bg-status-green-bg/30', 'bg-amber/30', 'bg-status-grey-bg/50'];
    const colors = ['text-primary', 'text-status-amber', 'text-text-secondary'];
    const randomIdx = Math.abs(meeting.id.charCodeAt(0) % 3);

    return {
      id: meeting.id,
      title: meeting.title,
      description: meeting.description || 'No description provided',
      date: new Date(meeting.date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
      timeLabel: `${meeting.start_time?.slice(0, 5) || 'TBD'} — ${meeting.end_time?.slice(0, 5) || 'TBD'}`,
      status: isLive ? 'Live' : 'Upcoming',
      icon: icons[randomIdx],
      iconBg: bgs[randomIdx],
      iconColor: colors[randomIdx],
      attendees,
      remainingCount,
      progress,
      totalTasks,
      completedTasks,
      isRecurring: !!meeting.series_id
    };
  });

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
        <div className="bg-surface border border-border/30 rounded-3xl p-6 flex flex-col justify-between h-[178px]">
          <div className="flex items-start justify-between">
            <div className="h-11 w-11 rounded-full bg-status-green-bg/30 flex items-center justify-center">
              <CalendarCheck2 className="h-5 w-5 text-primary" />
            </div>
            <div className="bg-status-green-bg/30 px-3 py-1 rounded-full">
              <span className="text-xs text-primary font-light">This week</span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm tracking-wide text-text-tertiary uppercase font-light">Meetings This Week</h3>
            <p className="text-4xl font-bold text-text-primary leading-none font-literata">{thisWeekMeetingsCount}</p>
          </div>
        </div>

        <div className="bg-surface border border-border/30 rounded-3xl p-6 flex flex-col justify-between h-[178px]">
          <div className="flex items-start justify-between">
            <div className="h-11 w-11 rounded-full bg-amber/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-status-amber" />
            </div>
            <div className="bg-amber/30 px-3 py-1 rounded-full">
              <span className="text-xs text-status-amber font-light">This month</span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm tracking-wide text-text-tertiary uppercase font-light">Meetings This Month</h3>
            <p className="text-4xl font-bold text-text-primary leading-none font-literata">{thisMonthMeetingsCount || 0}</p>
          </div>
        </div>

        <div className="bg-surface border border-border/30 rounded-3xl p-6 flex flex-col justify-between h-[178px]">
          <div className="flex items-start justify-between">
            <div className="h-11 w-11 rounded-full bg-board flex items-center justify-center border border-border/20">
              <Users className="h-5 w-5 text-text-secondary" />
            </div>
            <div className="flex -space-x-2">
              {activeTeamMembers > 0 && (
                <div className="h-8 w-8 rounded-full border-2 border-surface bg-cream flex items-center justify-center text-[10px] text-text-primary">
                  {activeTeamMembers}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm tracking-wide text-text-tertiary uppercase font-light">Active Team Members</h3>
            <p className="text-4xl font-bold text-text-primary leading-none font-literata">{activeTeamMembers}</p>
          </div>
        </div>
      </div>

      <div className="bg-status-grey-bg rounded-3xl p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center shrink-0">
        <form className="flex-1 bg-board rounded-2xl flex items-center px-4 py-3 relative overflow-hidden group focus-within:ring-2 focus-within:ring-primary/20 transition-all" action="/" method="GET">
          <Search className="h-5 w-5 text-gray-500 shrink-0" />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search meetings, attendees, or topics..."
            className="w-full bg-transparent border-none outline-none pl-3 text-text-secondary placeholder-gray-500 font-light text-base"
          />
          <input type="hidden" name="filter" value={filter} />
          <input type="hidden" name="sortBy" value={sortBy} />
          <input type="hidden" name="sortOrder" value={sortOrder} />
        </form>
        <div className="grid grid-cols-2 sm:flex gap-2 shrink-0 w-full sm:w-auto">
          <FilterDropdown search={search} filter={filter} sortBy={sortBy} sortOrder={sortOrder} />
          <SortDropdown search={search} filter={filter} sortBy={sortBy} sortOrder={sortOrder} />
        </div>
      </div>

      <div className="bg-white rounded-[24px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] border border-[rgba(196,200,188,0.2)] overflow-hidden hidden md:block">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-[rgba(234,230,222,0.5)] border-b border-[rgba(196,200,188,0.2)] text-xs tracking-[1.2px] uppercase text-text-secondary font-light shrink-0">
          <div className="col-span-4">Meeting Details</div>
          <div className="col-span-2">Date & Time</div>
          <div className="col-span-2">Attendees</div>
          <div className="col-span-2">Progress</div>
          <div className="col-span-2 text-right">Status</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[rgba(196,200,188,0.1)]">
          {formattedMeetings.length > 0 ? formattedMeetings.map((meeting) => (
            <Link 
              key={meeting.id} 
              href={`/meetings/${meeting.id}`}
              className="grid grid-cols-12 gap-4 px-6 py-6 items-center hover:bg-board/50 transition-colors group cursor-pointer"
            >
              <div className="col-span-4 flex items-center gap-4">
                <div className={cn("h-12 w-12 rounded-full flex items-center justify-center shrink-0", meeting.iconBg)}>
                  <meeting.icon className={cn("h-5 w-5", meeting.iconColor)} />
                </div>
                <div className="flex flex-col pr-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-bold text-text-primary leading-tight font-literata">{meeting.title}</h4>
                    {meeting.isRecurring && (
                      <span className="inline-flex items-center text-text-secondary" title="Recurring meeting">
                        <Repeat className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-light text-text-tertiary truncate leading-relaxed">{meeting.description}</p>
                </div>
              </div>
              
              <div className="col-span-2 flex flex-col gap-1">
                <span className="text-sm text-text-primary font-light">{meeting.date}</span>
                <span className="text-xs text-text-tertiary font-light">{meeting.timeLabel}</span>
              </div>
              
              <div className="col-span-2 flex items-center -space-x-2">
                {meeting.attendees.length > 0 ? (
                  <>
                    {meeting.attendees.map((attendee, i) => (
                      <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-sage flex items-center justify-center text-[10px] text-white">
                        {attendee.initials}
                      </div>
                    ))}
                    {meeting.remainingCount > 0 && (
                      <div className="h-8 w-8 rounded-full border-2 border-white bg-cream flex items-center justify-center text-[10px] text-text-primary">
                        +{meeting.remainingCount}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-text-tertiary">No attendees</span>
                )}
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                {meeting.totalTasks > 0 ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-status-grey-bg rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            meeting.progress === 100 ? "bg-primary" : 
                            meeting.progress >= 75 ? "bg-status-green" :
                            meeting.progress >= 50 ? "bg-blue-500" :
                            meeting.progress >= 25 ? "bg-status-amber" : "bg-coral-text"
                          )}
                          style={{ width: `${meeting.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-secondary font-medium w-8 text-right">{meeting.progress}%</span>
                    </div>
                    <span className="text-xs text-text-tertiary">
                      {meeting.completedTasks}/{meeting.totalTasks} tasks
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-text-tertiary">No tasks</span>
                )}
              </div>
              
              <div className="col-span-2 flex justify-end">
                {meeting.status === 'Live' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-status-green-bg text-status-green text-xs font-light">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                    Live
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-status-grey-bg border border-border/30 text-text-secondary text-xs font-light">
                    Upcoming
                  </span>
                )}
              </div>
            </Link>
          )) : (
             <div className="p-8 text-center text-text-tertiary">No meetings scheduled for now.</div>
          )}
        </div>
      </div>

      <div className="md:hidden flex flex-col gap-3">
        {formattedMeetings.length > 0 ? formattedMeetings.map((meeting) => (
          <Link
            key={meeting.id}
            href={`/meetings/${meeting.id}`}
            className="bg-white border border-border/30 rounded-2xl p-4 space-y-3 hover:bg-board/30 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", meeting.iconBg)}>
                <meeting.icon className={cn("h-4 w-4", meeting.iconColor)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-text-primary leading-tight font-literata truncate">{meeting.title}</h4>
                  {meeting.isRecurring && (
                    <span className="inline-flex items-center text-text-secondary" title="Recurring meeting">
                      <Repeat className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-tertiary mt-1 line-clamp-2">{meeting.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="text-text-secondary">
                <div>{meeting.date}</div>
                <div className="text-text-tertiary">{meeting.timeLabel}</div>
              </div>
              {meeting.status === 'Live' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-status-green-bg text-status-green text-xs font-light">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                  Live
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-status-grey-bg border border-border/30 text-text-secondary text-xs font-light">
                  Upcoming
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center -space-x-2">
                {meeting.attendees.length > 0 ? (
                  <>
                    {meeting.attendees.map((attendee, i) => (
                      <div key={i} className="h-7 w-7 rounded-full border-2 border-white bg-sage flex items-center justify-center text-[10px] text-white">
                        {attendee.initials}
                      </div>
                    ))}
                    {meeting.remainingCount > 0 && (
                      <div className="h-7 w-7 rounded-full border-2 border-white bg-cream flex items-center justify-center text-[10px] text-text-primary">
                        +{meeting.remainingCount}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-text-tertiary">No attendees</span>
                )}
              </div>

              {meeting.totalTasks > 0 ? (
                <div className="text-right min-w-[92px]">
                  <div className="text-xs text-text-secondary font-medium">{meeting.progress}%</div>
                  <div className="text-[11px] text-text-tertiary">{meeting.completedTasks}/{meeting.totalTasks} tasks</div>
                </div>
              ) : (
                <span className="text-xs text-text-tertiary">No tasks</span>
              )}
            </div>
          </Link>
        )) : (
          <div className="p-8 text-center text-text-tertiary bg-white border border-border/30 rounded-2xl">No meetings scheduled for now.</div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row sm:items-center sm:justify-between pt-2 shrink-0">
        <span className="text-sm font-light text-text-tertiary">Showing {rangeStart}-{rangeEnd} of {totalMeetings} meetings</span>
        <div className="flex items-center gap-2">
          {currentPage > 1 ? (
            <Link
              href={`/?page=${currentPage - 1}&search=${encodeURIComponent(search)}&filter=${filter}&sortBy=${sortBy}&sortOrder=${sortOrder}`}
              className="h-10 w-10 flex items-center justify-center rounded-2xl bg-surface hover:bg-border-hover transition-colors"
              aria-label="Previous page"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </Link>
          ) : (
            <button
              disabled
              aria-label="Previous page"
              className="h-10 w-10 flex items-center justify-center rounded-2xl bg-surface opacity-40 cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>
          )}
          <span className="md:hidden text-xs text-text-secondary px-2">Page {currentPage} / {totalPages}</span>
          <div className="hidden md:flex items-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/?page=${p}&search=${encodeURIComponent(search)}&filter=${filter}&sortBy=${sortBy}&sortOrder=${sortOrder}`}
              aria-current={p === currentPage ? 'page' : undefined}
              className={cn(
                "h-10 w-10 flex items-center justify-center rounded-2xl text-sm font-light transition-colors",
                p === currentPage
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white border border-border/30 text-text-secondary hover:bg-board"
              )}
            >
              {p}
            </Link>
          ))}
          </div>
          {currentPage < totalPages ? (
            <Link
              href={`/?page=${currentPage + 1}&search=${encodeURIComponent(search)}&filter=${filter}&sortBy=${sortBy}&sortOrder=${sortOrder}`}
              className="h-10 w-10 flex items-center justify-center rounded-2xl bg-surface hover:bg-border-hover transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <button
              disabled
              aria-label="Next page"
              className="h-10 w-10 flex items-center justify-center rounded-2xl bg-surface opacity-40 cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Main page component with streaming
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; filter?: string; sortBy?: string; sortOrder?: string }>;
}) {
  const { page: pageParam, search: searchParam, filter: filterParam, sortBy: sortByParam, sortOrder: sortOrderParam } = await searchParams;
  const parsed = Number.parseInt(pageParam ?? '1', 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  const search = searchParam ?? '';
  const filter = filterParam ?? 'month'; // Default: show meetings within 1 month
  const sortBy = sortByParam ?? 'date';
  const sortOrder = sortOrderParam === 'desc' ? 'desc' : 'asc';
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent
        page={page}
        search={search}
        filter={filter}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />
    </Suspense>
  );
}
