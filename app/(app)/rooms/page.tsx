import { createClient } from '@/utils/supabase/server';
import { RoomsClient } from '@/components/RoomsClient';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Room Management | Meeting Coordinator',
  description: 'Manage meeting rooms and view room schedules.',
};

export default async function RoomsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // For development: allow access without auth
  // In production, uncomment the redirect below
  // if (!user) {
  //   return redirect('/login');
  // }

  return <RoomsClient />;
}
