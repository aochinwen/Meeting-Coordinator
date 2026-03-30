import { createClient } from '@/utils/supabase/server';
import { ChecklistClient } from '@/components/ChecklistClient';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Coordination Checklist | Meeting Coordinator',
  description: 'Manage preparation tasks and action items for the meeting.',
};

export default async function MeetingChecklistPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  // In Next.js 15, `params` is a promise, but in Next.js 14 it's an object.
  // Using App Router, waiting on params is typical in modern Next.js.
  // Wait for it just to be safe if it's dynamic route segment.
  const resolvedParams = await Promise.resolve(params);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // NOTE: For now, we mock the meeting detail since the db `meetings` table isn't fully structured for reading yet via RLS.
  // But we'll pass the ID down.
  const meetingId = resolvedParams.id;

  return (
    <div className="flex flex-col h-full bg-board">
      <main className="flex-1 overflow-y-auto w-full">
        <ChecklistClient meetingId={meetingId} currentUser={user} />
      </main>
    </div>
  );
}
