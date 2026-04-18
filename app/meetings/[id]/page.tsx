import { createClient } from '@/utils/supabase/server';
import { MeetingDetailClient } from '@/components/MeetingDetailClient';
import { Suspense } from 'react';

export const metadata = {
  title: 'Meeting Details | Meeting Coordinator',
  description: 'View and manage meeting details, participants, tasks, and activities.',
};

export const revalidate = 30; // Revalidate every 30 seconds for real-time data

// Loading fallback for suspense
function MeetingDetailSkeleton() {
  return (
    <div className="max-w-[1280px] mx-auto pb-24 flex flex-col pt-8 space-y-8 px-8">
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    </div>
  );
}

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const meetingId = resolvedParams.id;

  // Prefetch all data server-side for instant client-side rendering
  const [
    { data: meeting },
    { data: participants },
    { data: tasks },
    { data: activities },
    { data: allProfiles },
    { data: { user } }
  ] = await Promise.all([
    supabase.from('meetings').select('*').eq('id', meetingId).single(),
    supabase.from('meeting_participants').select('*').eq('meeting_id', meetingId),
    supabase.from('meeting_checklist_tasks').select('*').eq('meeting_id', meetingId).order('created_at', { ascending: true }),
    supabase.from('meeting_activities').select('*').eq('meeting_id', meetingId).order('created_at', { ascending: false }).limit(20),
    supabase.from('people').select('id, name, division, rank'),
    supabase.auth.getUser()
  ]);

  // Build profile map for client-side use
  const profileMap = new Map<string, { name: string; division?: string | null; rank?: string | null }>();
  allProfiles?.forEach((p) => profileMap.set(p.id, { name: p.name, division: p.division, rank: p.rank }));

  // Pre-process data to reduce client-side computation
  const initialData = {
    meeting: meeting || null,
    participants: participants?.map((p) => ({
      ...p,
      user: profileMap.get(p.user_id) || null
    })) || [],
    tasks: tasks?.map((t) => ({
      ...t,
      assignee: t.assigned_user_id ? profileMap.get(t.assigned_user_id) || null : null
    })) || [],
    activities: activities?.map((a) => ({
      ...a,
      user: a.user_id ? profileMap.get(a.user_id) || null : null
    })) || [],
    profileMap: Object.fromEntries(profileMap)
  };

  return (
    <div className="flex flex-col h-full bg-board">
      <main className="flex-1 overflow-y-auto w-full">
        <Suspense fallback={<MeetingDetailSkeleton />}>
          <MeetingDetailClient
            meetingId={meetingId}
            currentUser={user || undefined}
            initialData={initialData}
          />
        </Suspense>
      </main>
    </div>
  );
}
