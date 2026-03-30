import { createClient } from '@/utils/supabase/server';
import { MeetingDetailClient } from '@/components/MeetingDetailClient';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Meeting Details | Meeting Coordinator',
  description: 'View and manage meeting details, participants, tasks, and activities.',
};

export default async function MeetingDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const resolvedParams = await Promise.resolve(params);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const meetingId = resolvedParams.id;

  return (
    <div className="flex flex-col h-full bg-board">
      <main className="flex-1 overflow-y-auto w-full">
        <MeetingDetailClient meetingId={meetingId} currentUser={user || undefined} />
      </main>
    </div>
  );
}
