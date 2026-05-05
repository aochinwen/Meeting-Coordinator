-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. People table (directory of meeting participants, chairmen, etc.)
-- This is NOT the auth table - it's a separate directory of names for meetings
create table public.people (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  division text,
  rank text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Backward compatibility view (maps old 'users' references to people)
create view public.users with (security_invoker = true) as select * from public.people;

-- 2. Templates
create table public.templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  chairman_id uuid references public.people(id),
  coordinator_id uuid references public.people(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. TemplateChecklistTasks
create table public.template_checklist_tasks (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references public.templates(id) on delete cascade not null,
  description text not null,
  due_days_before integer, -- positive = N days before meeting, negative = N days after, null = no due date
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Template Participants (default participants for a template)
create table public.template_participants (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references public.templates(id) on delete cascade not null,
  person_id uuid references public.people(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(template_id, person_id)
);

-- 5. Meeting Series (for recurring meetings)
create table public.meeting_series (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references public.templates(id) on delete set null,
  title text not null,
  description text,
  frequency text check (frequency in ('daily', 'weekly', 'bi-weekly', 'monthly')) not null,
  days_of_week text[], -- Array of day names ['M', 'T', 'W', 'Th', 'F'] or null for daily/monthly
  start_date date not null,
  end_date date, -- NULL for infinite series
  start_time time,
  end_time time,
  duration_minutes integer default 30,
  buffer_minutes integer default 0,
  timezone text default 'UTC',
  created_by uuid references public.people(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Meetings (updated for series support)
create table public.meetings (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references public.templates(id) on delete set null,
  series_id uuid references public.meeting_series(id) on delete cascade,
  title text not null,
  description text,
  date date not null,
  start_time time,
  end_time time,
  status text check (status in ('scheduled', 'completed', 'cancelled', 'draft')) default 'scheduled' not null,
  is_override boolean default false,
  override_fields jsonb default '{}',
  instance_number integer,
  calendar_uid text,
  draft_data jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Meeting Participants
create table public.meeting_participants (
  id uuid primary key default uuid_generate_v4(),
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  user_id uuid references public.people(id) on delete cascade not null,
  status text check (status in ('invited', 'accepted', 'declined', 'tentative')) default 'invited',
  is_required boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. MeetingChecklistTasks
create table public.meeting_checklist_tasks (
  id uuid primary key default uuid_generate_v4(),
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  description text not null,
  assigned_user_id uuid references public.people(id) on delete set null,
  is_completed boolean default false not null,
  due_days_before integer, -- positive = N days before meeting, negative = N days after, null = no due date
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Holidays
create table public.holidays (
  id uuid primary key default uuid_generate_v4(),
  date date unique not null,
  name text not null
);

-- 9. Meeting Activities (Activity Feed)
create table public.meeting_activities (
  id uuid primary key default uuid_generate_v4(),
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  user_id uuid references public.people(id) on delete set null,
  activity_type text check (activity_type in ('task_created', 'task_completed', 'task_assigned', 'comment_added', 'file_uploaded', 'meeting_updated')) not null,
  content text not null,
  metadata jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. Comments (Task-level discussions)
create table public.comments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references public.meeting_checklist_tasks(id) on delete cascade not null,
  user_id uuid references public.people(id) on delete set null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. Rooms (Meeting rooms for booking)
create table public.rooms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  capacity integer not null default 4,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. Room Bookings (Tracks room reservations for meetings)
create table public.room_bookings (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  meeting_id uuid references public.meetings(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text check (status in ('confirmed', 'cancelled', 'tentative')) default 'confirmed',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Partial unique index: only enforce uniqueness for active (non-cancelled)
-- bookings. Cancelled rows are retained for audit and must not block re-booking.
create unique index if not exists room_bookings_active_unique_idx
  on public.room_bookings (room_id, date, start_time)
  where status <> 'cancelled';

-- Add room_id to meetings table
alter table public.meetings add column if not exists room_id uuid references public.rooms(id) on delete set null;

-- Room Availability Functions

-- Function to check if a room is available for a specific time slot
create or replace function public.check_room_availability(
    p_room_id uuid,
    p_date date,
    p_start_time time,
    p_end_time time,
    p_exclude_meeting_id uuid default null
) returns boolean
language plpgsql
as $$
declare
    v_conflicting_count integer;
begin
    select count(*) into v_conflicting_count
    from public.room_bookings rb
    where rb.room_id = p_room_id
        and rb.date = p_date
        and rb.status = 'confirmed'
        and rb.start_time < p_end_time
        and rb.end_time > p_start_time
        and (p_exclude_meeting_id is null or rb.meeting_id != p_exclude_meeting_id);
    
    return v_conflicting_count = 0;
end;
$$;

-- Function to get available rooms for a time slot
create or replace function public.get_available_rooms(
    p_date date,
    p_start_time time,
    p_end_time time,
    p_capacity integer default null,
    p_exclude_meeting_id uuid default null
) returns table(
    room_id uuid,
    room_name text,
    room_capacity integer
)
language plpgsql
as $$
begin
    return query
    select 
        r.id as room_id,
        r.name as room_name,
        r.capacity as room_capacity
    from public.rooms r
    where (p_capacity is null or r.capacity >= p_capacity)
        and not exists (
            select 1 from public.room_bookings rb
            where rb.room_id = r.id
                and rb.date = p_date
                and rb.status = 'confirmed'
                and rb.start_time < p_end_time
                and rb.end_time > p_start_time
                and (p_exclude_meeting_id is null or rb.meeting_id != p_exclude_meeting_id)
        )
    order by r.name;
end;
$$;

-- Function to suggest alternative time slots
create or replace function public.suggest_alternative_slots(
    p_room_id uuid,
    p_date date,
    p_start_time time,
    p_duration_minutes integer,
    p_search_range_hours integer default 4
) returns table(
    suggested_date date,
    suggested_start_time time,
    suggested_end_time time
)
language plpgsql
as $$
declare
    v_slot_start time;
    v_slot_end time;
    v_is_available boolean;
    v_start_minutes integer;
    v_check_date date;
    v_search_start_minutes integer;
    v_search_end_minutes integer;
begin
    -- Convert start time to minutes from midnight
    v_start_minutes := extract(hour from p_start_time) * 60 + extract(minute from p_start_time);
    v_search_start_minutes := greatest(8 * 60, v_start_minutes - (p_search_range_hours * 60));
    v_search_end_minutes := least(18 * 60, v_start_minutes + (p_search_range_hours * 60));
    
    -- Check current date and adjacent dates
    for v_check_date in
        select generate_series(p_date - 1, p_date + 1, interval '1 day')::date
    loop
        -- Check slots every 30 minutes within search range
        for v_slot_start in
            select time '08:00' + (generate_series * interval '30 minutes')
            from generate_series(0, ((v_search_end_minutes - v_search_start_minutes) / 30)) as generate_series
            where extract(hour from (time '08:00' + (generate_series * interval '30 minutes'))) * 60 + 
                  extract(minute from (time '08:00' + (generate_series * interval '30 minutes'))) 
                  between v_search_start_minutes and v_search_end_minutes
        loop
            v_slot_end := v_slot_start + (p_duration_minutes || ' minutes')::interval;
            
            -- Check if slot is available
            select public.check_room_availability(
                p_room_id, 
                v_check_date, 
                v_slot_start::time, 
                v_slot_end::time
            ) into v_is_available;
            
            if v_is_available then
                suggested_date := v_check_date;
                suggested_start_time := v_slot_start::time;
                suggested_end_time := v_slot_end::time;
                return next;
                
                -- Limit to 5 suggestions total
                if (select count(*) from (select 1) as t) >= 5 then
                    return;
                end if;
            end if;
        end loop;
    end loop;
    
    return;
end;
$$;

-- Enable RLS
alter table public.people enable row level security;
alter table public.templates enable row level security;
alter table public.template_checklist_tasks enable row level security;
alter table public.template_participants enable row level security;
alter table public.meeting_series enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.meeting_checklist_tasks enable row level security;
alter table public.holidays enable row level security;
alter table public.meeting_activities enable row level security;
alter table public.comments enable row level security;
alter table public.rooms enable row level security;
alter table public.room_bookings enable row level security;

-- Basic open policies (Update these in a real production environment)
create policy "Allow public read access on people" on public.people for select using (true);
create policy "Allow authenticated insert on people" on public.people for insert with check (true);
create policy "Allow authenticated update on people" on public.people for update using (true) with check (true);
create policy "Allow authenticated delete on people" on public.people for delete using (true);
create policy "Allow true on all for now" on public.templates for all using (true);
create policy "Allow true on all for now" on public.template_checklist_tasks for all using (true);
create policy "Allow true on all for now" on public.template_participants for all using (true);
create policy "Allow true on all for now" on public.meeting_series for all using (true);
create policy "Allow true on all for now" on public.meetings for all using (true);
create policy "Allow true on all for now" on public.meeting_participants for all using (true);
create policy "Allow true on all for now" on public.meeting_checklist_tasks for all using (true);
create policy "Allow true on all for now" on public.holidays for all using (true);
create policy "Allow true on all for now" on public.meeting_activities for all using (true);
create policy "Allow true on all for now" on public.comments for all using (true);
create policy "Allow true on all for now" on public.rooms for all using (true);
create policy "Allow true on all for now" on public.room_bookings for all using (true);

-- Indexes for performance
create index idx_template_participants_template_id on public.template_participants(template_id);
create index idx_template_participants_person_id on public.template_participants(person_id);
create index idx_meeting_series_created_by on public.meeting_series(created_by);
create index idx_meetings_series_id on public.meetings(series_id);
create index idx_meetings_date on public.meetings(date);
create index idx_meeting_participants_meeting_id on public.meeting_participants(meeting_id);
create index idx_meeting_participants_user_id on public.meeting_participants(user_id);
create index idx_meeting_activities_meeting_id on public.meeting_activities(meeting_id);
create index idx_meeting_activities_created_at on public.meeting_activities(created_at desc);
create index idx_comments_task_id on public.comments(task_id);
create index idx_meeting_checklist_tasks_meeting_id on public.meeting_checklist_tasks(meeting_id);
create index idx_meeting_checklist_tasks_assigned_user_id on public.meeting_checklist_tasks(assigned_user_id);
create index idx_room_bookings_room_id on public.room_bookings(room_id);
create index idx_room_bookings_date on public.room_bookings(date);
create index idx_room_bookings_meeting_id on public.room_bookings(meeting_id);
create index idx_room_bookings_room_date on public.room_bookings(room_id, date);
create index idx_rooms_name on public.rooms(name);
