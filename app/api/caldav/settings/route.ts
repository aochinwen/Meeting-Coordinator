import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('user_caldav_settings')
    .select('caldav_username, caldav_host, last_synced_at, last_sync_error')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json(data ?? null);
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { caldav_username, caldav_password, caldav_host } = body;

  if (!caldav_username || !caldav_password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('user_caldav_settings')
    .upsert(
      {
        user_id: user.id,
        caldav_username,
        caldav_password,
        caldav_host: caldav_host || 'caldav.pixeltools.sg',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
