import { createClient } from '@/utils/supabase/server';
import { ScheduleClient } from '@/components/ScheduleClient';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Schedule Meeting | Meeting Coordinator',
  description: 'Schedule a new ad-hoc or recurring meeting.',
};

export default async function SchedulePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // For development: allow access without auth
  // In production, uncomment the redirect below
  // if (!user) {
  //   return redirect('/login');
  // }

  // Fetch available templates
  const { data: templates } = await supabase
    .from('templates')
    .select('*')
    .order('name');

  return (
    <ScheduleClient 
      initialTemplates={templates || []}
      currentUser={user || undefined}
    />
  );
}
