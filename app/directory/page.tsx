import { createClient } from '@/utils/supabase/server';
import { DirectoryClient } from '@/components/DirectoryClient';

export default async function PeopleDirectoryPage() {
  const supabase = await createClient();

  // Fetch all users
  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching users:', error);
  }

  // Count active teams logic (mock for now or based on unique divisions)
  const uniqueDivisions = new Set(users?.map(u => u.division) || []);
  const activeTeamsCount = uniqueDivisions.size || 34;

  return (
    <div className="h-full">
      <DirectoryClient 
        initialUsers={users || []} 
        activeTeamsCount={activeTeamsCount} 
      />
    </div>
  );
}
