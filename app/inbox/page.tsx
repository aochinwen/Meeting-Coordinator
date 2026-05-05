import { createClient } from '@/utils/supabase/server';
import DraftInboxClient from '@/components/dashboard/DraftInboxClient';
import { Header } from '@/components/Header';

export default async function InboxPage() {
  const supabase = await createClient();
  
  // Fetch meetings that are in draft status or have draft_data (which implies pending review)
  // We'll just fetch all where status = 'draft' or where draft_data is not null and draft_data->>'is_update' = 'true'
  // Actually, let's just fetch all where status = 'draft' OR draft_data->>'is_cancellation' = 'true' OR draft_data->>'is_update' = 'true'
  // Since draft_data defaults to '{}', we can query checking the jsonb keys
  const { data: meetings, error } = await supabase
    .from('meetings')
    .select(`
      *,
      meeting_checklist_tasks (*)
    `)
    .or("status.eq.draft,draft_data->>is_update.eq.true,draft_data->>is_cancellation.eq.true")
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching inbox meetings:", error);
  }

  // Fetch all people to help with mapping unrecognized emails
  const { data: people } = await supabase
    .from('people')
    .select('*')
    .order('name');

  return (
    <div className="flex-1 overflow-auto bg-surface flex flex-col h-screen">
      <div className="px-8 pt-8 pb-4 max-w-6xl mx-auto w-full">
        <h1 className="text-3xl font-['Literata'] font-bold text-text-primary">Inbox</h1>
        <p className="text-text-secondary mt-1">Review and approve inbound meeting requests</p>
      </div>
      <div className="px-8 pb-8 max-w-6xl mx-auto w-full">
        <DraftInboxClient initialMeetings={meetings || []} people={people || []} />
      </div>
    </div>
  );
}
