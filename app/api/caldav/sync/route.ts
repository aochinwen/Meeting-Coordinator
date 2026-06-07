import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { fetchCalDAVEvents } from '@/lib/caldav';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch credentials (needs service role to read password field)
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: settings, error: settingsError } = await serviceSupabase
    .from('user_caldav_settings')
    .select('caldav_username, caldav_password, caldav_host')
    .eq('user_id', user.id)
    .maybeSingle();

  if (settingsError || !settings) {
    return NextResponse.json({ error: 'CalDAV credentials not configured' }, { status: 400 });
  }

  let syncError: string | null = null;
  let synced = 0;

  try {
    const events = await fetchCalDAVEvents({
      username: settings.caldav_username,
      password: settings.caldav_password,
      host: settings.caldav_host,
    });

    // Upsert each event into meetings table by calendar_uid
    for (const event of events) {
      const { error } = await serviceSupabase
        .from('meetings')
        .upsert(
          {
            calendar_uid: event.uid,
            title: event.title,
            date: event.date,
            start_time: event.start_time,
            end_time: event.end_time,
            description: event.description,
            status: 'scheduled',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'calendar_uid', ignoreDuplicates: false }
        );
      if (!error) synced++;
    }
  } catch (err) {
    syncError = err instanceof Error ? err.message : String(err);
  }

  // Update last_synced_at / last_sync_error
  await serviceSupabase
    .from('user_caldav_settings')
    .update({
      last_synced_at: new Date().toISOString(),
      last_sync_error: syncError,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (syncError) {
    return NextResponse.json({ error: syncError }, { status: 502 });
  }

  return NextResponse.json({ synced });
}
