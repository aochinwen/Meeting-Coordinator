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
    <div className="max-w-[1280px] mx-auto pb-24 flex flex-col pt-6 sm:pt-8 space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8">
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

  // Prefetch all data server-side in parallel.
  // We avoid relational joins for profiles here because the generated types 
  // are missing some foreign key relationships, causing build errors.
  const [
    { data: meeting },
    { data: participants },
    { data: tasks },
    { data: activities },
    { data: { user } },
    { data: roomBooking }
  ] = await Promise.all([
    supabase.from('meetings').select('*').eq('id', meetingId).single(),
    supabase.from('meeting_participants').select('*').eq('meeting_id', meetingId),
    supabase.from('meeting_checklist_tasks').select('*').eq('meeting_id', meetingId).order('created_at', { ascending: true }),
    supabase.from('meeting_activities').select('*').eq('meeting_id', meetingId).order('created_at', { ascending: false }).limit(20),
    supabase.auth.getUser(),
    supabase.from('room_bookings').select('*, room:room_id(*)').eq('meeting_id', meetingId).eq('status', 'confirmed').order('created_at', { ascending: false }).limit(1)
  ]);

  // Collect all unique person IDs that need profiles
  const personIds = new Set<string>();
  if (meeting?.chairman_id) personIds.add(meeting.chairman_id);
  if (meeting?.coordinator_id) personIds.add(meeting.coordinator_id);
  participants?.forEach(p => personIds.add(p.user_id));
  activities?.forEach(a => { if (a.user_id) personIds.add(a.user_id); });

  // Fetch task assignees and their profiles
  const taskIds = (tasks || []).map(t => t.id);
  let taskAssigneeRows: any[] = [];
  if (taskIds.length > 0) {
    const { data } = await supabase
      .from('meeting_task_assignees')
      .select('task_id, person_id')
      .in('task_id', taskIds);
    taskAssigneeRows = data || [];
    taskAssigneeRows.forEach(row => personIds.add(row.person_id));
  }

  // Fetch all required profiles in a single batch
  const profileMap = new Map<string, { name: string; division?: string | null; rank?: string | null }>();
  if (personIds.size > 0) {
    const { data: profiles } = await supabase
      .from('people')
      .select('id, name, division, rank')
      .in('id', Array.from(personIds));
    profiles?.forEach(p => profileMap.set(p.id, { name: p.name, division: p.division, rank: p.rank }));
  }

  const initialData = {
    meeting: meeting || null,
    participants: participants?.map(p => ({
      ...p,
      user: profileMap.get(p.user_id) || null
    })) || [],
    tasks: tasks?.map(t => {
      const assignees = taskAssigneeRows
        .filter(row => row.task_id === t.id)
        .map(row => ({
          id: row.person_id,
          name: profileMap.get(row.person_id)?.name || 'Unknown'
        }));
      return { ...t, assignees };
    }) || [],
    activities: activities?.map(a => ({
      ...a,
      user: a.user_id ? profileMap.get(a.user_id) || null : null
    })) || [],
    profileMap: Object.fromEntries(profileMap),
    roomBooking: (Array.isArray(roomBooking) ? roomBooking[0] : roomBooking) || null
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
