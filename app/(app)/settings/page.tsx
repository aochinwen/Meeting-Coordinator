import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsClient } from '@/components/SettingsClient';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: person } = await supabase
    .from('people')
    .select('name, email, division, rank, organization')
    .or(`email.eq.${user.email},id.eq.${user.id}`)
    .limit(1)
    .maybeSingle();

  return (
    <SettingsClient
      userId={user.id}
      currentEmail={user.email ?? ''}
      currentName={person?.name ?? ''}
      currentOrganization={person?.organization ?? ''}
      currentDivision={person?.division ?? ''}
      currentRank={person?.rank ?? ''}
    />
  );
}
