-- Alter the meeting status check constraint
alter table public.meetings drop constraint if exists meetings_status_check;
alter table public.meetings add constraint meetings_status_check 
  check (status in ('scheduled', 'completed', 'cancelled', 'draft'));

-- Add new columns for email draft functionality
alter table public.meetings add column if not exists calendar_uid text;
alter table public.meetings add column if not exists draft_data jsonb default '{}';

-- Add unique index for calendar_uid to support upsert/tracking updates
create unique index if not exists idx_meetings_calendar_uid on public.meetings(calendar_uid);
