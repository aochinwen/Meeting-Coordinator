-- Update meeting_activities_activity_type_check constraint
-- This migration expands the allowed activity types to include meeting creation, participant changes, and task deletions.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_activities_activity_type_check') THEN
        ALTER TABLE public.meeting_activities DROP CONSTRAINT meeting_activities_activity_type_check;
    END IF;
END $$;

ALTER TABLE public.meeting_activities 
ADD CONSTRAINT meeting_activities_activity_type_check 
CHECK (activity_type IN (
    'task_created', 
    'task_completed', 
    'task_assigned', 
    'task_deleted', 
    'comment_added', 
    'file_uploaded', 
    'meeting_updated', 
    'meeting_created', 
    'meeting_cancelled', 
    'participants_added', 
    'participant_removed', 
    'venue_updated'
));
