import { notFound } from 'next/navigation';
import { InitiativeDetailClient } from '@/components/InitiativeDetailClient';
import { createClient } from '@/utils/supabase/server';

export default async function InitiativeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: initiative, error } = await supabase
    .from('initiatives')
    .select('id, title, stage, narrative_md, demo_setup_md, target_groups, updated_at')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !initiative) {
    notFound();
  }

  const { data: slides } = await supabase
    .from('initiative_slides')
    .select('id, title, description_md, media_type, storage_path, video_url, position')
    .eq('initiative_id', id)
    .is('deleted_at', null)
    .order('position', { ascending: true });

  return (
    <InitiativeDetailClient
      initiative={{
        ...initiative,
        initiative_slides: slides || [],
      }}
    />
  );
}
