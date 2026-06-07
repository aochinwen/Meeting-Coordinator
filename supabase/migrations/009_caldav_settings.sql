-- Per-user CalDAV credentials for calendar sync
create table public.user_caldav_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  caldav_username text not null,
  caldav_password text not null,
  caldav_host text not null default 'caldav.pixeltools.sg',
  last_synced_at timestamp with time zone,
  last_sync_error text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_caldav_settings enable row level security;

create policy "Users can manage own caldav settings"
  on public.user_caldav_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
