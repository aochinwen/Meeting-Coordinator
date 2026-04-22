-- Demo module: initiatives, slides, and media storage

CREATE TABLE IF NOT EXISTS public.initiatives (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('Concept', 'POC', 'POV', 'Production', 'Paused', 'Cancelled')),
  narrative_md text NOT NULL,
  demo_setup_md text NOT NULL,
  target_groups text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.initiative_slides (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  initiative_id uuid NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 0),
  title text NOT NULL,
  description_md text,
  media_type text NOT NULL CHECK (media_type IN ('image', 'gif', 'video_upload', 'video_url')),
  storage_path text,
  video_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  deleted_at timestamp with time zone,
  CONSTRAINT initiative_slides_media_source_check CHECK (
    (media_type = 'video_url' AND video_url IS NOT NULL AND storage_path IS NULL) OR
    (media_type <> 'video_url' AND storage_path IS NOT NULL AND video_url IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_initiatives_updated_at ON public.initiatives(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_initiatives_deleted_at ON public.initiatives(deleted_at);
CREATE INDEX IF NOT EXISTS idx_initiative_slides_initiative_id ON public.initiative_slides(initiative_id);
CREATE INDEX IF NOT EXISTS idx_initiative_slides_deleted_at ON public.initiative_slides(deleted_at);
CREATE INDEX IF NOT EXISTS idx_initiative_slides_position ON public.initiative_slides(initiative_id, position);

ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiative_slides ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'initiatives'
      AND policyname = 'Allow true on all for initiatives'
  ) THEN
    CREATE POLICY "Allow true on all for initiatives"
      ON public.initiatives
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'initiative_slides'
      AND policyname = 'Allow true on all for initiative_slides'
  ) THEN
    CREATE POLICY "Allow true on all for initiative_slides"
      ON public.initiative_slides
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('initiative-media', 'initiative-media', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public read on initiative-media'
  ) THEN
    CREATE POLICY "Allow public read on initiative-media"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'initiative-media');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow authenticated uploads on initiative-media'
  ) THEN
    CREATE POLICY "Allow authenticated uploads on initiative-media"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'initiative-media');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow authenticated updates on initiative-media'
  ) THEN
    CREATE POLICY "Allow authenticated updates on initiative-media"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'initiative-media')
      WITH CHECK (bucket_id = 'initiative-media');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow authenticated deletes on initiative-media'
  ) THEN
    CREATE POLICY "Allow authenticated deletes on initiative-media"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'initiative-media');
  END IF;
END $$;
