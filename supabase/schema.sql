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
  status text check (status in ('scheduled', 'completed', 'cancelled')) default 'scheduled' not null,
  is_override boolean default false,
  override_fields jsonb default '{}',
  instance_number integer,
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

-- Create a trigger to create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.people (id, name, division, rank)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'General', 'Member');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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
