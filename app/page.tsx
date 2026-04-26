import { createClient } from '@/utils/supabase/server';
import { Suspense } from 'react';
import { ChevronRight, Video, Target, User, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { DashboardSkeleton } from '@/components/ui/loading-skeleton';
import { DashboardChrome, type ChromeStats } from '@/components/dashboard/DashboardChrome';
import { parseTypes, type SelectedTypes } from '@/components/dashboard/types';
import { CalendarView } from '@/components/dashboard/CalendarView';
import { TasksList, type TaskListItem } from '@/components/dashboard/TasksList';
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
  meeting_checklist_tasks: { id: string; is_completed: boolean }[];
}

export const revalidate = 60;

const PAGE_SIZE = 10;

/* -------------------------------------------------------------------------- */
/*                            Shared stats fetcher                            */
/* -------------------------------------------------------------------------- */

async function fetchStats(): Promise<ChromeStats> {
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const toIso = (d: Date) => d.toISOString().split('T')[0];

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
  const toIso = (d: Date) => d.toISOString().split('T')[0];
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
}: {
  current: DashboardParams;
  params: ChromeParams;
  selectedTypes: SelectedTypes;
  stats: ChromeStats;
  people: { id: string; name: string }[];
  mode: CalendarMode;
  anchor: string;
}) {
  const supabase = await createClient();
  const range = visibleRange(mode, anchor);

  let q = supabase
    .from('meetings')
    .select('id, title, description, date, start_time, end_time, status, meeting_checklist_tasks(id, description, is_completed, due_days_before)')
    .gte('date', range.start)
    .lte('date', range.end);

  if (params.search) {
    q = q.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }

  if (params.person) {
    const allowed = await resolveMeetingsForPerson(params.person, supabase);
    if (allowed.size === 0) {
      // Short-circuit: no meetings match this person.
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
          <CalendarView current={current} mode={mode} anchor={anchor} events={[]} />
        </DashboardChrome>
      );
    }
    q = q.in('id', Array.from(allowed));
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
      });
    }
    if (selectedTypes.tasks) {
      for (const t of m.meeting_checklist_tasks ?? []) {
        const due = computeTaskDueDate(m.date, t.due_days_before);
        if (due >= range.start && due <= range.end) {
          // Search applies to task description and meeting title
          if (params.search) {
            const s = params.search.toLowerCase();
            if (!t.description.toLowerCase().includes(s) && !m.title.toLowerCase().includes(s)) {
              continue;
            }
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
      <CalendarView current={current} mode={mode} anchor={anchor} events={events} />
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
}: {
  current: DashboardParams;
  params: ChromeParams;
  selectedTypes: SelectedTypes;
  stats: ChromeStats;
  people: { id: string; name: string }[];
}) {
  const supabase = await createClient();
  const { start, end } = rangeFromFilter(params.filter);

  let q = supabase
    .from('meetings')
    .select('id, title, date, meeting_checklist_tasks(id, description, is_completed, due_days_before)')
    .gte('date', start)
    .lte('date', end);
  if (params.search) {
    q = q.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }
  if (params.person) {
    const allowed = await resolveMeetingsForPerson(params.person, supabase);
    if (allowed.size === 0) {
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
          <TasksList tasks={[]} />
        </DashboardChrome>
      );
    }
    q = q.in('id', Array.from(allowed));
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
      if (search && !t.description.toLowerCase().includes(search) && !m.title.toLowerCase().includes(search)) {
        continue;
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

/* -------------------------------------------------------------------------- */
/*               Resolve meeting ids matching a person filter                 */
/* -------------------------------------------------------------------------- */

/**
 * Returns the set of meeting ids where the given person appears in any role:
 * chairman, coordinator, participant, or task assignee.
 * Returns null if no person filter is active (caller should skip filtering).
 */
async function resolveMeetingsForPerson(
  personId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Set<string>> {
  const ids = new Set<string>();

  // Chairman / coordinator on the meeting row.
  const { data: own } = await supabase
    .from('meetings')
    .select('id')
    .or(`chairman_id.eq.${personId},coordinator_id.eq.${personId}`);
  for (const r of own ?? []) ids.add(r.id);

  // Participants.
  const { data: parts } = await supabase
    .from('meeting_participants')
    .select('meeting_id')
    .eq('user_id', personId);
  for (const r of parts ?? []) ids.add(r.meeting_id);

  // Task assignees -> meetings via meeting_checklist_tasks.
  const { data: assignedTasks } = await supabase
    .from('meeting_task_assignees')
    .select('meeting_checklist_tasks!inner(meeting_id)')
    .eq('person_id', personId);
  for (const r of (assignedTasks ?? []) as Array<{
    meeting_checklist_tasks: { meeting_id: string } | { meeting_id: string }[];
  }>) {
    const mt = r.meeting_checklist_tasks;
    if (Array.isArray(mt)) mt.forEach((m) => ids.add(m.meeting_id));
    else if (mt) ids.add(mt.meeting_id);
  }

  return ids;
}

async function MeetingsListBranch({
  current,
  params,
  selectedTypes,
  stats,
  people,
  page,
}: {
  current: DashboardParams;
  params: ChromeParams;
  selectedTypes: SelectedTypes;
  stats: ChromeStats;
  people: { id: string; name: string }[];
  page: number;
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
      meeting_checklist_tasks(id, is_completed),
      series_id
    `, { count: 'exact' })
    .gte('date', start)
    .lte('date', end);
  if (params.search) {
    q = q.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }
  if (params.person) {
    const allowed = await resolveMeetingsForPerson(params.person, supabase);
    if (allowed.size === 0) {
      // No meetings match — render empty list with chrome.
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
          <div className="bg-white rounded-[24px] p-12 text-center text-text-tertiary">
            No meetings found for the selected person.
          </div>
        </DashboardChrome>
      );
    }
    q = q.in('id', Array.from(allowed));
  }
  const validSortColumns = ['date', 'title', 'status'];
  const sortColumn = validSortColumns.includes(params.sortBy) ? params.sortBy : 'date';
  q = q.order(sortColumn, { ascending: params.sortOrder === 'asc' });

  const [{ data: meetingsData, count: meetingsCount }, { data: profiles }] = await Promise.all([
    q.range(from, to),
    supabase.from('people').select('id, name').order('name', { ascending: true }),
  ]);

  const totalMeetings = meetingsCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalMeetings / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const profileMap = new Map<string, string>();
  profiles?.forEach((p) => profileMap.set(p.id, p.name));

  const meetings = (meetingsData as unknown as MeetingWithRelations[]) || [];
  const rangeStart = totalMeetings === 0 ? 0 : from + 1;
  const rangeEnd = from + meetings.length;

  const formattedMeetings = meetings.map((meeting) => {
    const isLive = meeting.status === 'scheduled' && meeting.date === new Date().toISOString().split('T')[0];
    const totalTasks = meeting.meeting_checklist_tasks?.length || 0;
    const completedTasks = meeting.meeting_checklist_tasks?.filter((t) => t.is_completed).length || 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const participantIds = meeting.meeting_participants?.map((p) => p.user_id) || [];
    const attendees = participantIds.slice(0, 3).map((id) => {
      const name = profileMap.get(id) || '?';
      return { name, initials: name.charAt(0).toUpperCase() };
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
      isRecurring: !!meeting.series_id,
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
          <div className="col-span-4">Meeting Details</div>
          <div className="col-span-2">Date & Time</div>
          <div className="col-span-2">Attendees</div>
          <div className="col-span-2">Progress</div>
          <div className="col-span-2 text-right">Status</div>
        </div>
        <div className="divide-y divide-[rgba(196,200,188,0.1)]">
          {formattedMeetings.length > 0 ? formattedMeetings.map((meeting) => (
            <Link
              key={meeting.id}
              href={`/meetings/${meeting.id}`}
              className="grid grid-cols-12 gap-4 px-6 py-6 items-center hover:bg-board/50 transition-colors group cursor-pointer"
            >
              <div className="col-span-4 flex items-center gap-4">
                <div className={cn('h-12 w-12 rounded-full flex items-center justify-center shrink-0', meeting.iconBg)}>
                  <meeting.icon className={cn('h-5 w-5', meeting.iconColor)} />
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
                            'h-full rounded-full transition-all',
                            meeting.progress === 100 ? 'bg-primary' :
                            meeting.progress >= 75 ? 'bg-status-green' :
                            meeting.progress >= 50 ? 'bg-blue-500' :
                            meeting.progress >= 25 ? 'bg-status-amber' : 'bg-coral-text'
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
              <div className={cn('h-10 w-10 rounded-full flex items-center justify-center shrink-0', meeting.iconBg)}>
                <meeting.icon className={cn('h-4 w-4', meeting.iconColor)} />
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={pageHref(p)}
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
  const [stats, { data: peopleRows }] = await Promise.all([
    fetchStats(),
    supabase.from('people').select('id, name').order('name', { ascending: true }),
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
