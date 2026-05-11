import { createClient } from '@/utils/supabase/server';
import { Suspense } from 'react';
import { ChevronRight, Video, Target, User, Repeat } from 'lucide-react';
import { cn, generatePagination } from '@/lib/utils';
import Link from 'next/link';
import { DashboardSkeleton } from '@/components/ui/loading-skeleton';
import { DashboardChrome, type ChromeStats } from '@/components/dashboard/DashboardChrome';
import { parseTypes, type SelectedTypes } from '@/components/dashboard/types';
import { CalendarContainer } from '@/components/dashboard/CalendarContainer';
import { CalendarGrid } from '@/components/dashboard/CalendarView';
import { TasksList, type TaskListItem } from '@/components/dashboard/TasksList';
import { MeetingRowDesktop, MeetingRowMobile } from '@/components/dashboard/MeetingRow';
import { buildDashboardHref, type DashboardParams } from '@/components/dashboard/url';
import {
  clampAnchor,
  computeTaskDueDate,
  visibleRange,
  type CalendarEvent,
  type CalendarMode,
} from '@/lib/calendar';

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
  meeting_checklist_tasks: { id: string; description: string; is_completed: boolean; due_days_before: number | null }[];
  rooms: { name: string } | null;
}

export const revalidate = 60;

const PAGE_SIZE = 10;

/* -------------------------------------------------------------------------- */
/*                            Shared stats fetcher                            */
/* -------------------------------------------------------------------------- */

async function fetchStats(supabase: Awaited<ReturnType<typeof createClient>>): Promise<ChromeStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // Use local date components (not UTC) to avoid off-by-one in timezones ahead of UTC.
  const toIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [{ count: usersCount }, { count: weekCount }, { count: monthCount }] =
    await Promise.all([
      supabase.from('people').select('*', { count: 'exact', head: true }),
      supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .gte('date', toIso(startOfWeek))
        .lte('date', toIso(endOfWeek)),
      supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .gte('date', toIso(startOfMonth))
        .lte('date', toIso(endOfMonth)),
    ]);

  return {
    activeTeamMembers: usersCount || 0,
    thisWeekMeetings: weekCount || 0,
    thisMonthMeetings: monthCount || 0,
  };
}

/* -------------------------------------------------------------------------- */
/*                            Date range from filter                          */
/* -------------------------------------------------------------------------- */

function rangeFromFilter(filter: string): { start: string; end: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Use local date components (not UTC) to avoid off-by-one in timezones ahead of UTC.
  const toIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const start = toIso(today);

  if (filter === 'all') return { start: '1900-01-01', end: '2099-12-31' };
  if (filter === 'today') return { start, end: start };
  if (filter === 'week') {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return { start, end: toIso(d) };
  }
  // 'month' / default → next 3 months (preserving existing behavior)
  const d = new Date(today);
  d.setMonth(d.getMonth() + 3);
  return { start, end: toIso(d) };
}

/* -------------------------------------------------------------------------- */
/*                              Calendar branch                               */
/* -------------------------------------------------------------------------- */

async function CalendarBranch({
  current,
  params,
  selectedTypes,
  stats,
  people,
  mode,
  anchor,
  resolvedFilters,
}: {
  current: DashboardParams;
  params: ChromeParams;
  selectedTypes: SelectedTypes;
  stats: ChromeStats;
  people: { id: string; name: string }[];
  mode: CalendarMode;
  anchor: string;
  resolvedFilters: ResolvedFilters | null;
}) {
  const supabase = await createClient();
  const range = visibleRange(mode, anchor);

  let q = supabase
    .from('meetings')
    .select('id, title, description, date, start_time, end_time, status, created_by_name, meeting_checklist_tasks(id, description, is_completed, due_days_before)')
    .gte('date', range.start)
    .lte('date', range.end);

  if (resolvedFilters?.meetingIds) {
    q = q.in('id', Array.from(resolvedFilters.meetingIds));
  }

  q = q.order('date', { ascending: true });

  const { data: meetings } = await q;
  const events: CalendarEvent[] = [];

  for (const m of (meetings ?? []) as Array<{
    id: string;
    title: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    status: string | null;
    description: string | null;
    created_by_name: string | null;
    meeting_checklist_tasks: Array<{ id: string; description: string; is_completed: boolean; due_days_before: number | null }>;
  }>) {
    if (selectedTypes.meetings) {
      events.push({
        kind: 'meeting',
        id: m.id,
        title: m.title,
        date: m.date,
        startTime: m.start_time,
        endTime: m.end_time,
        status: m.status,
        description: m.description,
        createdByName: m.created_by_name,
        tasks: (m.meeting_checklist_tasks ?? []).map(t => ({
          id: t.id,
          title: t.description,
          isCompleted: t.is_completed,
          dueDate: computeTaskDueDate(m.date, t.due_days_before),
        })),
      });
    }
    if (selectedTypes.tasks) {
      for (const t of m.meeting_checklist_tasks ?? []) {
        const due = computeTaskDueDate(m.date, t.due_days_before);
        if (due >= range.start && due <= range.end) {
          // Search applies to task description, meeting title, or specific matches
          if (params.search && resolvedFilters) {
            const isMatched = 
              resolvedFilters.taskIds?.has(t.id) || 
              resolvedFilters.criteriaIds?.has(m.id) ||
              t.description.toLowerCase().includes(params.search.toLowerCase()) ||
              m.title.toLowerCase().includes(params.search.toLowerCase());
            
            if (!isMatched) continue;
          }
          events.push({
            kind: 'task',
            id: t.id,
            meetingId: m.id,
            meetingTitle: m.title,
            title: t.description,
            date: due,
            isCompleted: t.is_completed,
          });
        }
      }
    }
  }

  return (
    <DashboardChrome
      current={current}
      params={params}
      selectedTypes={selectedTypes}
      view="calendar"
      stats={stats}
      people={people}
      selectedPersonId={params.person || null}
      showDateFilter={false}
      showSort={false}
    >
      <CalendarContainer current={current} mode={mode} anchor={anchor}>
        <CalendarGrid current={current} mode={mode} anchor={anchor} events={events} />
      </CalendarContainer>
    </DashboardChrome>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Tasks-only list branch                          */
/* -------------------------------------------------------------------------- */

async function TasksListBranch({
  current,
  params,
  selectedTypes,
  stats,
  people,
  resolvedFilters,
}: {
  current: DashboardParams;
  params: ChromeParams;
  selectedTypes: SelectedTypes;
  stats: ChromeStats;
  people: { id: string; name: string }[];
  resolvedFilters: ResolvedFilters | null;
}) {
  const supabase = await createClient();
  const { start, end } = rangeFromFilter(params.filter);

  let q = supabase
    .from('meetings')
    .select('id, title, date, meeting_checklist_tasks(id, description, is_completed, due_days_before)')
    .gte('date', start)
    .lte('date', end);

  if (resolvedFilters?.meetingIds) {
    q = q.in('id', Array.from(resolvedFilters.meetingIds));
  }

  q = q.order('date', { ascending: true });

  const { data: meetings } = await q;

  const items: TaskListItem[] = [];
  const search = params.search.toLowerCase();
  for (const m of (meetings ?? []) as Array<{
    id: string;
    title: string;
    date: string;
    meeting_checklist_tasks: Array<{ id: string; description: string; is_completed: boolean; due_days_before: number | null }>;
  }>) {
    for (const t of m.meeting_checklist_tasks ?? []) {
      if (search && resolvedFilters) {
        const isMatched = 
          resolvedFilters.taskIds?.has(t.id) || 
          resolvedFilters.criteriaIds?.has(m.id) ||
          t.description.toLowerCase().includes(search) ||
          m.title.toLowerCase().includes(search);
        
        if (!isMatched) continue;
      }
      items.push({
        id: t.id,
        title: t.description,
        isCompleted: t.is_completed,
        dueDate: computeTaskDueDate(m.date, t.due_days_before),
        meetingId: m.id,
        meetingTitle: m.title,
        meetingDate: m.date,
      });
    }
  }

  // Sort by configurable param
  const sortAsc = params.sortOrder !== 'desc';
  if (params.sortBy === 'title') {
    items.sort((a, b) => (sortAsc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)));
  } else {
    items.sort((a, b) => (sortAsc ? a.dueDate.localeCompare(b.dueDate) : b.dueDate.localeCompare(a.dueDate)));
  }

  return (
    <DashboardChrome
      current={current}
      params={params}
      selectedTypes={selectedTypes}
      view="list"
      stats={stats}
      people={people}
      selectedPersonId={params.person || null}
    >
      <TasksList tasks={items} />
    </DashboardChrome>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Meetings list branch                              */
/* -------------------------------------------------------------------------- */

type ChromeParams = {
  search: string;
  filter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  view: 'list' | 'calendar';
  calView: string;
  anchor: string;
  types: string;
  person: string;
};

type ResolvedFilters = {
  meetingIds: Set<string> | null;
  taskIds: Set<string> | null;
  criteriaIds: Set<string> | null;
};

/**
 * Resolves both person filter and search query into sets of matching meeting and task IDs.
 */
async function resolveDashboardFilters(
  supabase: Awaited<ReturnType<typeof createClient>>,
  personId?: string,
  search?: string,
): Promise<ResolvedFilters | null> {
  if (!personId && !search) return null;

  let searchMeetingIds: Set<string> | null = null;
  let searchTaskIds: Set<string> | null = null;
  let searchCriteriaIds: Set<string> | null = null;
  let personMeetingIds: Set<string> | null = null;

  if (search) {
    const pattern = `%${search}%`;
    const [
      { data: matchedPeople },
      { data: directMeetings },
      { data: directTasks }
    ] = await Promise.all([
      supabase.from('people').select('id').ilike('name', pattern),
      supabase.from('meetings').select('id').or(`title.ilike.${pattern},description.ilike.${pattern}`),
      supabase.from('meeting_checklist_tasks').select('id, meeting_id').ilike('description', pattern)
    ]);

    const pIds = (matchedPeople || []).map(p => p.id);
    const [
      { data: roleMeetings },
      { data: participantMeetings },
      { data: assigneeTasks }
    ] = await Promise.all([
      pIds.length > 0 ? supabase.from('meetings').select('id').or(`chairman_id.in.(${pIds.join(',')}),coordinator_id.in.(${pIds.join(',')})`) : Promise.resolve({ data: [] }),
      pIds.length > 0 ? supabase.from('meeting_participants').select('meeting_id').in('user_id', pIds) : Promise.resolve({ data: [] }),
      pIds.length > 0 ? supabase.from('meeting_task_assignees').select('task_id, meeting_checklist_tasks!inner(meeting_id)').in('person_id', pIds) : Promise.resolve({ data: [] })
    ]);

    searchMeetingIds = new Set();
    searchTaskIds = new Set();
    searchCriteriaIds = new Set();

    for (const m of directMeetings ?? []) { searchMeetingIds.add(m.id); searchCriteriaIds.add(m.id); }
    for (const m of roleMeetings ?? []) { searchMeetingIds.add(m.id); searchCriteriaIds.add(m.id); }
    for (const m of participantMeetings ?? []) { searchMeetingIds.add(m.meeting_id); searchCriteriaIds.add(m.meeting_id); }
    for (const t of directTasks ?? []) { searchTaskIds.add(t.id); searchMeetingIds.add(t.meeting_id); }
    for (const at of (assigneeTasks as any[] ?? [])) {
      searchTaskIds.add(at.task_id);
      const mId = at.meeting_checklist_tasks?.meeting_id;
      if (mId) searchMeetingIds.add(mId);
    }
  }

  if (personId) {
    const [
      { data: own },
      { data: parts },
      { data: assignedTasks }
    ] = await Promise.all([
      supabase.from('meetings').select('id').or(`chairman_id.eq.${personId},coordinator_id.eq.${personId}`),
      supabase.from('meeting_participants').select('meeting_id').eq('user_id', personId),
      supabase.from('meeting_task_assignees').select('meeting_checklist_tasks!inner(meeting_id)').eq('person_id', personId)
    ]);

    personMeetingIds = new Set();
    for (const r of own ?? []) personMeetingIds.add(r.id);
    for (const r of parts ?? []) personMeetingIds.add(r.meeting_id);
    for (const r of (assignedTasks ?? []) as any[]) {
      const mt = r.meeting_checklist_tasks;
      if (Array.isArray(mt)) mt.forEach((m: any) => personMeetingIds!.add(m.meeting_id));
      else if (mt) personMeetingIds.add(mt.meeting_id);
    }
  }

  let finalMeetingIds = null;
  if (searchMeetingIds && personMeetingIds) {
    finalMeetingIds = new Set([...searchMeetingIds].filter(id => personMeetingIds!.has(id)));
  } else if (searchMeetingIds) {
    finalMeetingIds = searchMeetingIds;
  } else if (personMeetingIds) {
    finalMeetingIds = personMeetingIds;
  }

  return { meetingIds: finalMeetingIds, taskIds: searchTaskIds, criteriaIds: searchCriteriaIds };
}

async function MeetingsListBranch({
  current,
  params,
  selectedTypes,
  stats,
  people,
  page,
  resolvedFilters,
}: {
  current: DashboardParams;
  params: ChromeParams;
  selectedTypes: SelectedTypes;
  stats: ChromeStats;
  people: { id: string; name: string }[];
  page: number;
  resolvedFilters: ResolvedFilters | null;
}) {
  const supabase = await createClient();
  const { start, end } = rangeFromFilter(params.filter);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let q = supabase
    .from('meetings')
    .select(`
      *,
      meeting_participants(user_id),
      meeting_checklist_tasks(id, description, is_completed, due_days_before),
      series_id,
      rooms(name)
    `, { count: 'exact' })
    .gte('date', start)
    .lte('date', end);

  if (resolvedFilters?.meetingIds) {
    q = q.in('id', Array.from(resolvedFilters.meetingIds));
  }
  const validSortColumns = ['date', 'title', 'status'];
  const sortColumn = validSortColumns.includes(params.sortBy) ? params.sortBy : 'date';
  q = q.order(sortColumn, { ascending: params.sortOrder === 'asc' });

  const [{ data: meetingsData, count: meetingsCount }] = await Promise.all([
    q.range(from, to),
  ]);

  const totalMeetings = meetingsCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalMeetings / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const profileMap = new Map<string, string>();
  people?.forEach((p) => profileMap.set(p.id, p.name));

  const meetings = (meetingsData as unknown as MeetingWithRelations[]) || [];
  const rangeStart = totalMeetings === 0 ? 0 : from + 1;
  const rangeEnd = from + meetings.length;

  const now = new Date();
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const localTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const formattedMeetings = meetings.map((meeting) => {
    // Determine display status
    let displayStatus = 'Upcoming';
    if (meeting.status === 'cancelled') {
      displayStatus = 'Cancelled';
    } else if (meeting.status === 'completed') {
      displayStatus = 'Completed';
    } else if (meeting.date < localToday) {
      displayStatus = 'Completed';
    } else if (meeting.date === localToday) {
      // For today's meetings, check time if available
      const start = meeting.start_time || '00:00:00';
      const end = meeting.end_time || '23:59:59';
      
      if (localTime > end) {
        displayStatus = 'Completed';
      } else if (localTime >= start && localTime <= end) {
        displayStatus = 'Live';
      } else {
        displayStatus = 'Upcoming';
      }
    } else {
      displayStatus = 'Upcoming';
    }

    const totalTasks = meeting.meeting_checklist_tasks?.length || 0;
    const completedTasks = meeting.meeting_checklist_tasks?.filter((t) => t.is_completed).length || 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const participantIds = meeting.meeting_participants?.map((p) => p.user_id) || [];
    const attendees = participantIds.slice(0, 3).map((id) => {
      const name = profileMap.get(id) || '?';
      return { name, initials: name.charAt(0).toUpperCase() };
    });
    const remainingCount = Math.max(0, participantIds.length - 3);

    const iconNames = ['video', 'target', 'user'] as const;
    const bgs = ['bg-status-green-bg/30', 'bg-amber/30', 'bg-status-grey-bg/50'];
    const colors = ['text-primary', 'text-status-amber', 'text-text-secondary'];
    const randomIdx = Math.abs(meeting.id.charCodeAt(0) % 3);

    return {
      id: meeting.id,
      title: meeting.title,
      description: meeting.description || 'No description provided',
      date: new Date(meeting.date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
      dateISO: meeting.date,
      startTime: meeting.start_time,
      endTime: meeting.end_time,
      timeLabel: `${meeting.start_time?.slice(0, 5) || 'TBD'} — ${meeting.end_time?.slice(0, 5) || 'TBD'}`,
      roomName: meeting.rooms?.name || 'TBD',
      status: displayStatus,
      iconName: iconNames[randomIdx],
      iconBg: bgs[randomIdx],
      iconColor: colors[randomIdx],
      attendees,
      remainingCount,
      progress,
      totalTasks,
      completedTasks,
      isRecurring: !!meeting.series_id,
      taskDetails: (meeting.meeting_checklist_tasks ?? []).map(t => ({
        id: t.id,
        title: t.description || 'Untitled Task',
        isCompleted: t.is_completed,
        dueDate: computeTaskDueDate(meeting.date, t.due_days_before),
      })),
    };
  });

  const pageHref = (p: number) => buildDashboardHref(current, { page: p });

  return (
    <DashboardChrome
      current={current}
      params={params}
      selectedTypes={selectedTypes}
      view="list"
      stats={stats}
      people={people}
      selectedPersonId={params.person || null}
    >
      <div className="bg-white rounded-[24px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] border border-[rgba(196,200,188,0.2)] overflow-hidden hidden md:block">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-[rgba(234,230,222,0.5)] border-b border-[rgba(196,200,188,0.2)] text-xs tracking-[1.2px] uppercase text-text-secondary font-light shrink-0">
          <div className="col-span-3">Meeting Details</div>
          <div className="col-span-2">Date & Time</div>
          <div className="col-span-2">Room</div>
          <div className="col-span-2">Attendees</div>
          <div className="col-span-2">Progress</div>
          <div className="col-span-1 text-right">Status</div>
        </div>
        <div className="divide-y divide-[rgba(196,200,188,0.1)]">
          {formattedMeetings.length > 0 ? formattedMeetings.map((meeting) => (
            <MeetingRowDesktop key={meeting.id} meeting={meeting} />
          )) : (
            <div className="p-8 text-center text-text-tertiary">No meetings scheduled for now.</div>
          )}
        </div>
      </div>

      <div className="md:hidden flex flex-col gap-3">
        {formattedMeetings.length > 0 ? formattedMeetings.map((meeting) => (
          <MeetingRowMobile key={meeting.id} meeting={meeting} />
        )) : (
          <div className="p-8 text-center text-text-tertiary bg-white border border-border/30 rounded-2xl">No meetings scheduled for now.</div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row sm:items-center sm:justify-between pt-2 shrink-0">
        <span className="text-sm font-light text-text-tertiary">
          Showing {rangeStart}-{rangeEnd} of {totalMeetings} meetings
        </span>
        <div className="flex items-center gap-2">
          {currentPage > 1 ? (
            <Link
              href={pageHref(currentPage - 1)}
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
          <span className="md:hidden text-xs text-text-secondary px-2">
            Page {currentPage} / {totalPages}
          </span>
          <div className="hidden md:flex items-center gap-2">
            {generatePagination(currentPage, totalPages).map((p, i) => (
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="text-text-tertiary px-2">...</span>
              ) : (
                <Link
                  key={p}
                  href={pageHref(p as number)}
                  aria-current={p === currentPage ? 'page' : undefined}
                  className={cn(
                    'h-10 w-10 flex items-center justify-center rounded-2xl text-sm font-light transition-colors',
                    p === currentPage
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white border border-border/30 text-text-secondary hover:bg-board',
                  )}
                >
                  {p}
                </Link>
              )
            ))}
          </div>
          {currentPage < totalPages ? (
            <Link
              href={pageHref(currentPage + 1)}
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
    </DashboardChrome>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Page entrypoint                               */
/* -------------------------------------------------------------------------- */

async function DashboardContent({
  page,
  search,
  filter,
  sortBy,
  sortOrder,
  view,
  calView,
  anchor,
  types,
  person,
}: {
  page: number;
  search: string;
  filter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  view: 'list' | 'calendar';
  calView: CalendarMode;
  anchor: string;
  types: string;
  person: string;
}) {
  const supabase = await createClient();
  const [stats, { data: peopleRows }, resolvedFilters] = await Promise.all([
    fetchStats(supabase),
    supabase.from('people').select('id, name').order('name', { ascending: true }),
    resolveDashboardFilters(supabase, person, search),
  ]);
  const people = peopleRows || [];
  const selectedTypes = parseTypes(types);

  const params: ChromeParams = {
    search,
    filter,
    sortBy,
    sortOrder,
    view,
    calView,
    anchor,
    types,
    person,
  };

  // Build the "current" param record used by helper hrefs (omit defaults).
  const current: DashboardParams = {
    page: page > 1 ? page : undefined,
    search: search || undefined,
    filter: filter && filter !== 'month' ? filter : undefined,
    sortBy: sortBy && sortBy !== 'date' ? sortBy : undefined,
    sortOrder: sortOrder && sortOrder !== 'asc' ? sortOrder : undefined,
    view: view !== 'list' ? view : undefined,
    calView: view === 'calendar' && calView !== 'month' ? calView : undefined,
    anchor: view === 'calendar' ? anchor : undefined,
    types: types || undefined,
    person: person || undefined,
  };

  if (view === 'calendar') {
    return (
      <CalendarBranch
        current={current}
        params={params}
        selectedTypes={selectedTypes}
        stats={stats}
        people={people}
        mode={calView}
        anchor={anchor}
        resolvedFilters={resolvedFilters}
      />
    );
  }

  if (selectedTypes.tasks && !selectedTypes.meetings) {
    return (
      <TasksListBranch
        current={current}
        params={params}
        selectedTypes={selectedTypes}
        stats={stats}
        people={people}
        resolvedFilters={resolvedFilters}
      />
    );
  }

  return (
    <MeetingsListBranch
      current={current}
      params={params}
      selectedTypes={selectedTypes}
      stats={stats}
      people={people}
      page={page}
      resolvedFilters={resolvedFilters}
    />
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    filter?: string;
    sortBy?: string;
    sortOrder?: string;
    view?: string;
    calView?: string;
    anchor?: string;
    types?: string;
    person?: string;
  }>;
}) {
  const sp = await searchParams;
  const parsed = Number.parseInt(sp.page ?? '1', 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  const search = sp.search ?? '';
  const filter = sp.filter ?? 'month';
  const sortBy = sp.sortBy ?? 'date';
  const sortOrder = sp.sortOrder === 'desc' ? 'desc' : 'asc';
  const view: 'list' | 'calendar' = sp.view === 'calendar' ? 'calendar' : 'list';
  const calView: CalendarMode = sp.calView === 'week' ? 'week' : 'month';
  const anchor = clampAnchor(sp.anchor);
  const types = sp.types ?? '';
  const person = sp.person ?? '';

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent
        page={page}
        search={search}
        filter={filter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        view={view}
        calView={calView}
        anchor={anchor}
        types={types}
        person={person}
      />
    </Suspense>
  );
}
