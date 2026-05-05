-- Migration: Multi-assignee support for tasks + task ordering
-- Adds:
--   * meeting_task_assignees   (many-to-many between tasks and people)
--   * meeting_checklist_tasks.sort_order  (manual ordering within a meeting)
-- Existing meeting_checklist_tasks.assigned_user_id is preserved for backward
-- compatibility and backfilled into the junction table.

-- 1. Junction table -----------------------------------------------------------
create table if not exists public.meeting_task_assignees (
  task_id  uuid not null references public.meeting_checklist_tasks(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (task_id, person_id)
);

create index if not exists idx_meeting_task_assignees_task_id
  on public.meeting_task_assignees(task_id);
create index if not exists idx_meeting_task_assignees_person_id
  on public.meeting_task_assignees(person_id);

alter table public.meeting_task_assignees enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meeting_task_assignees'
      and policyname = 'Allow true on all for now'
  ) then
    create policy "Allow true on all for now"
      on public.meeting_task_assignees for all using (true) with check (true);
  end if;
end $$;

-- Backfill from legacy single-assignee column.
insert into public.meeting_task_assignees (task_id, person_id)
select id, assigned_user_id
from public.meeting_checklist_tasks
where assigned_user_id is not null
on conflict do nothing;

-- 2. sort_order on tasks ------------------------------------------------------
alter table public.meeting_checklist_tasks
  add column if not exists sort_order integer;

-- Backfill: rank by created_at within each meeting.
with ranked as (
  select id,
         row_number() over (
           partition by meeting_id order by created_at, id
         ) as rn
  from public.meeting_checklist_tasks
  where sort_order is null
)
update public.meeting_checklist_tasks t
set sort_order = ranked.rn
from ranked
where t.id = ranked.id;

create index if not exists idx_meeting_checklist_tasks_meeting_sort
  on public.meeting_checklist_tasks(meeting_id, sort_order);
