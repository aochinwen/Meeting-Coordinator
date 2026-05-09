-- Performance Optimization Indexes
-- This migration adds indexes to speed up common queries in the dashboard and meeting details.

-- Enable pg_trgm for faster text searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Meetings Table Indexes
-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);

-- Indexes for person-based filtering (chairman/coordinator)
CREATE INDEX IF NOT EXISTS idx_meetings_chairman_id ON public.meetings(chairman_id);
CREATE INDEX IF NOT EXISTS idx_meetings_coordinator_id ON public.meetings(coordinator_id);

-- GIN index for fast search on title and description
-- Using gin_trgm_ops for ilike '%query%' support
CREATE INDEX IF NOT EXISTS idx_meetings_search_trgm ON public.meetings USING gin (
    (COALESCE(title, '') || ' ' || COALESCE(description, '')) gin_trgm_ops
);

-- 2. Meeting Task Assignees
-- Ensure person_id is indexed for resolveMeetingsForPerson
CREATE INDEX IF NOT EXISTS idx_meeting_task_assignees_person_id ON public.meeting_task_assignees(person_id);

-- 3. Room Bookings
-- Compound index for common date-range queries on specific rooms
CREATE INDEX IF NOT EXISTS idx_room_bookings_room_date_status ON public.room_bookings(room_id, date, status);
