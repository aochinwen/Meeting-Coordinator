-- Fix: deleting a person from public.people fails with a foreign key
-- violation whenever they were ever set as a chairman/coordinator/creator
-- on a template, meeting, or meeting series. Those FKs were created
-- without an ON DELETE action (defaults to NO ACTION / RESTRICT),
-- inconsistent with the rest of the schema which already uses
-- ON DELETE SET NULL for optional person references (see
-- meeting_checklist_tasks.assigned_user_id, meeting_activities.user_id,
-- comments.user_id).
--
-- This migration changes constraint behaviour and does not delete any
-- rows. It does null out already-orphaned FK values (references to a
-- people.id that no longer exists — data already inconsistent today,
-- since these columns' FK was apparently never validated against
-- existing rows) so the corrected constraint can be added. Historical
-- display data is unaffected since meetings/meeting_series already
-- snapshot the name separately in created_by_name.

DO $$
DECLARE
  rec RECORD;
  targets text[][] := ARRAY[
    ARRAY['templates', 'chairman_id'],
    ARRAY['templates', 'coordinator_id'],
    ARRAY['meetings', 'chairman_id'],
    ARRAY['meetings', 'coordinator_id'],
    ARRAY['meetings', 'created_by'],
    ARRAY['meeting_series', 'created_by']
  ];
  t text[];
BEGIN
  FOREACH t SLICE 1 IN ARRAY targets
  LOOP
    -- Skip if the table/column doesn't exist in this environment.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t[1] AND column_name = t[2]
    ) THEN
      CONTINUE;
    END IF;

    -- Null out any already-orphaned values (pointing at a people.id that no
    -- longer exists) so the FK below can be added without erroring.
    EXECUTE format(
      'UPDATE public.%I SET %I = NULL WHERE %I IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.people WHERE id = public.%I.%I)',
      t[1], t[2], t[2], t[1], t[2]
    );

    -- Find and drop the existing FK constraint on this column, whatever it's named.
    FOR rec IN
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
      WHERE con.contype = 'f'
        AND nsp.nspname = 'public'
        AND rel.relname = t[1]
        AND att.attname = t[2]
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t[1], rec.conname);
    END LOOP;

    -- Re-add it with ON DELETE SET NULL.
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.people(id) ON DELETE SET NULL',
      t[1], t[1] || '_' || t[2] || '_fkey', t[2]
    );
  END LOOP;
END $$;
