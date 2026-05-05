import { createClient } from '@/utils/supabase/server';

export interface InitiativeSlidePreview {
  id: string;
  title: string;
  description_md: string | null;
  media_type: string;
  storage_path: string | null;
  video_url: string | null;
  position: number;
}

export interface InitiativeCard {
  id: string;
  title: string;
  stage: string;
  narrative_md: string;
  target_groups: string[];
  updated_at: string;
  initiative_slides: InitiativeSlidePreview[];
}

interface RawInitiativeSlide extends InitiativeSlidePreview {
  deleted_at: string | null;
}

interface RawInitiative extends Omit<InitiativeCard, 'initiative_slides'> {
  initiative_slides: RawInitiativeSlide[];
}

export async function DemoListServer(): Promise<InitiativeCard[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('initiatives')
    .select(
      'id, title, stage, narrative_md, target_groups, updated_at, initiative_slides(id, title, description_md, media_type, storage_path, video_url, position, deleted_at)'
    )
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to load initiatives', error);
    return [];
  }

  const initiatives = ((data || []) as RawInitiative[]).map((item) => ({
    ...item,
    initiative_slides: (item.initiative_slides || [])
      .filter((slide) => slide.deleted_at === null)
      .sort((a: InitiativeSlidePreview, b: InitiativeSlidePreview) => a.position - b.position),
  }));

  return initiatives;
}
