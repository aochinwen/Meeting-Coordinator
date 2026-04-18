import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { DirectoryClient } from '@/components/DirectoryClient';
import { DirectorySkeleton } from '@/components/ui/loading-skeleton';

export const revalidate = 60; // Revalidate every 60 seconds

// Component that fetches and displays data
async function DirectoryContent() {
  const supabase = await createClient();

  // Fetch all users
  const { data: users, error } = await supabase
    .from('people')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching users:', error);
  }

  // Count active teams logic (mock for now or based on unique divisions)
  const uniqueDivisions = new Set(users?.map(u => u.division) || []);
  const activeTeamsCount = uniqueDivisions.size || 34;

  return (
    <DirectoryClient
      initialUsers={users || []}
      activeTeamsCount={activeTeamsCount}
    />
  );
}

// Main page component with streaming
export default function PeopleDirectoryPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<DirectorySkeleton />}>
        <DirectoryContent />
      </Suspense>
    </div>
  );
}
