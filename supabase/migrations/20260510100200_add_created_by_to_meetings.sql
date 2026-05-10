-- Add created_by and created_by_name to meetings and meeting_series
-- This allows storing the name of the user who created the meeting at the time of creation.

-- 1. Add columns to meetings table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meetings' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.meetings ADD COLUMN created_by uuid REFERENCES public.people(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meetings' AND column_name = 'created_by_name'
    ) THEN
        ALTER TABLE public.meetings ADD COLUMN created_by_name text;
    END IF;
END $$;

-- 2. Add column to meeting_series table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meeting_series' AND column_name = 'created_by_name'
    ) THEN
        ALTER TABLE public.meeting_series ADD COLUMN created_by_name text;
    END IF;
END $$;

-- 3. Add index for meetings.created_by
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON public.meetings(created_by);
