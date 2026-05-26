-- Rename profiles to users
ALTER TABLE IF EXISTS public.profiles RENAME TO users;

-- Re-point foreign keys
ALTER TABLE public.templates DROP CONSTRAINT IF EXISTS templates_chairman_id_fkey;
ALTER TABLE public.templates ADD CONSTRAINT templates_chairman_id_fkey FOREIGN KEY (chairman_id) REFERENCES public.users(id);

ALTER TABLE public.templates DROP CONSTRAINT IF EXISTS templates_coordinator_id_fkey;
ALTER TABLE public.templates ADD CONSTRAINT templates_coordinator_id_fkey FOREIGN KEY (coordinator_id) REFERENCES public.users(id);

ALTER TABLE public.meeting_participants DROP CONSTRAINT IF EXISTS meeting_participants_user_id_fkey;
ALTER TABLE public.meeting_participants ADD CONSTRAINT meeting_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.meeting_checklist_tasks DROP CONSTRAINT IF EXISTS meeting_checklist_tasks_assigned_user_id_fkey;
ALTER TABLE public.meeting_checklist_tasks ADD CONSTRAINT meeting_checklist_tasks_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.meeting_activities DROP CONSTRAINT IF EXISTS meeting_activities_user_id_fkey;
ALTER TABLE public.meeting_activities ADD CONSTRAINT meeting_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE public.comments ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Update row level security names
DROP POLICY IF EXISTS "Allow public read access on profiles" ON public.users;
CREATE POLICY "Allow public read access on users" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update own profile" ON public.users;
CREATE POLICY "Allow authenticated insert/update own user" ON public.users FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Create a backward-compatible view for old queries
CREATE OR REPLACE VIEW public.profiles WITH (security_invoker = true) AS SELECT * FROM public.users;
