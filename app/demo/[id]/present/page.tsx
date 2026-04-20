import { notFound } from 'next/navigation';
import { InitiativePresentClient } from '@/components/InitiativePresentClient';
import { createClient } from '@/utils/supabase/server';

export default async function InitiativePresentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: initiative, error } = await supabase
    .from('initiatives')
    .select('id, title')
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

  return <InitiativePresentClient initiativeId={id} initiativeTitle={initiative.title} slides={slides || []} />;
}
