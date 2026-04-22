-- Migration: Rooms and Room Bookings Tables
-- This migration adds room management and booking functionality

-- 1. Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    capacity integer NOT NULL DEFAULT 4 CHECK (capacity > 0),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(name)
);

-- 2. Create room_bookings table
CREATE TABLE IF NOT EXISTS public.room_bookings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
    date date NOT NULL,
    start_time time NOT NULL,
    end_time time NOT NULL,
    status text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'tentative')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Add room_id to meetings table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meetings' AND column_name = 'room_id'
    ) THEN
        ALTER TABLE public.meetings ADD COLUMN room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Create function to check room availability
CREATE OR REPLACE FUNCTION public.check_room_availability(
    p_room_id uuid,
    p_date date,
    p_start_time time,
    p_end_time time,
    p_exclude_meeting_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    v_conflicting_count integer;
BEGIN
    SELECT COUNT(*) INTO v_conflicting_count
    FROM public.room_bookings rb
    WHERE rb.room_id = p_room_id
        AND rb.date = p_date
        AND rb.status = 'confirmed'
        AND rb.start_time < p_end_time
        AND rb.end_time > p_start_time
        AND (p_exclude_meeting_id IS NULL OR rb.meeting_id != p_exclude_meeting_id);
    
    RETURN v_conflicting_count = 0;
END;
$$;

-- 5. Create function to get available rooms
CREATE OR REPLACE FUNCTION public.get_available_rooms(
    p_date date,
    p_start_time time,
    p_end_time time,
    p_capacity integer DEFAULT NULL,
    p_exclude_meeting_id uuid DEFAULT NULL
) RETURNS TABLE(
    room_id uuid,
    room_name text,
    room_capacity integer
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id as room_id,
        r.name as room_name,
        r.capacity as room_capacity
    FROM public.rooms r
    WHERE (p_capacity IS NULL OR r.capacity >= p_capacity)
        AND NOT EXISTS (
            SELECT 1 FROM public.room_bookings rb
            WHERE rb.room_id = r.id
                AND rb.date = p_date
                AND rb.status = 'confirmed'
                AND rb.start_time < p_end_time
                AND rb.end_time > p_start_time
                AND (p_exclude_meeting_id IS NULL OR rb.meeting_id != p_exclude_meeting_id)
        )
    ORDER BY r.name;
END;
$$;

-- 6. Create function to suggest alternative time slots
CREATE OR REPLACE FUNCTION public.suggest_alternative_slots(
    p_room_id uuid,
    p_date date,
    p_start_time time,
    p_duration_minutes integer,
    p_search_range_hours integer DEFAULT 4
) RETURNS TABLE(
    suggested_date date,
    suggested_start_time time,
    suggested_end_time time
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_slot_start time;
    v_slot_end time;
    v_is_available boolean;
    v_start_minutes integer;
    v_end_minutes integer;
    v_check_date date;
    v_search_start_minutes integer;
    v_search_end_minutes integer;
BEGIN
    -- Convert start time to minutes from midnight
    v_start_minutes := EXTRACT(HOUR FROM p_start_time) * 60 + EXTRACT(MINUTE FROM p_start_time);
    v_search_start_minutes := GREATEST(8 * 60, v_start_minutes - (p_search_range_hours * 60));
    v_search_end_minUTES := LEAST(18 * 60, v_start_minutes + (p_search_range_hours * 60));
    
    -- Check current date and adjacent dates
    FOR v_check_date IN 
        SELECT generate_series(p_date - 1, p_date + 1, interval '1 day')::date
    LOOP
        -- Check slots every 30 minutes within search range
        FOR v_slot_start IN
            SELECT time '08:00' + (generate_series * interval '30 minutes')
            FROM generate_series(0, ((v_search_end_minutes - v_search_start_minutes) / 30)) as generate_series
            WHERE EXTRACT(HOUR FROM (time '08:00' + (generate_series * interval '30 minutes'))) * 60 + 
                  EXTRACT(MINUTE FROM (time '08:00' + (generate_series * interval '30 minutes'))) 
                  BETWEEN v_search_start_minutes AND v_search_end_minutes
        LOOP
            v_slot_end := v_slot_start + (p_duration_minutes || ' minutes')::interval;
            
            -- Check if slot is available
            SELECT public.check_room_availability(
                p_room_id, 
                v_check_date, 
                v_slot_start::time, 
                v_slot_end::time
            ) INTO v_is_available;
            
            IF v_is_available THEN
                suggested_date := v_check_date;
                suggested_start_time := v_slot_start::time;
                suggested_end_time := v_slot_end::time;
                RETURN NEXT;
                
                -- Limit to 5 suggestions per date
                IF (SELECT COUNT(*) FROM (SELECT 1) as t) >= 5 THEN
                    RETURN;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN;
END;
$$;

-- 7. Create trigger to prevent overlapping bookings
CREATE OR REPLACE FUNCTION public.prevent_overlapping_bookings()
RETURNS trigger AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.room_bookings
        WHERE room_id = NEW.room_id
            AND date = NEW.date
            AND status = 'confirmed'
            AND start_time < NEW.end_time
            AND end_time > NEW.start_time
            AND (TG_OP = 'INSERT' OR id != NEW.id)
    ) THEN
        RAISE EXCEPTION 'Room is already booked for this time slot';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_overlapping_bookings ON public.room_bookings;
CREATE TRIGGER trg_prevent_overlapping_bookings
    BEFORE INSERT OR UPDATE ON public.room_bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_overlapping_bookings();

-- 8. Create trigger to update meeting room_id when booking is created
CREATE OR REPLACE FUNCTION public.update_meeting_room_on_booking()
RETURNS trigger AS $$
BEGIN
    IF NEW.meeting_id IS NOT NULL AND NEW.status = 'confirmed' THEN
        UPDATE public.meetings 
        SET room_id = NEW.room_id 
        WHERE id = NEW.meeting_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_meeting_room_on_booking ON public.room_bookings;
CREATE TRIGGER trg_update_meeting_room_on_booking
    AFTER INSERT OR UPDATE ON public.room_bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_meeting_room_on_booking();

-- 9. Create trigger to clear meeting room_id when booking is cancelled
CREATE OR REPLACE FUNCTION public.clear_meeting_room_on_cancel()
RETURNS trigger AS $$
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.meeting_id IS NOT NULL THEN
        UPDATE public.meetings 
        SET room_id = NULL 
        WHERE id = NEW.meeting_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clear_meeting_room_on_cancel ON public.room_bookings;
CREATE TRIGGER trg_clear_meeting_room_on_cancel
    BEFORE UPDATE ON public.room_bookings
    FOR EACH ROW
    WHEN (NEW.status = 'cancelled')
    EXECUTE FUNCTION public.clear_meeting_room_on_cancel();

-- 10. Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies (open access for development)
CREATE POLICY "Allow authenticated read on rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on rooms" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update on rooms" ON public.rooms FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on rooms" ON public.rooms FOR DELETE USING (true);

CREATE POLICY "Allow authenticated read on room_bookings" ON public.room_bookings FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on room_bookings" ON public.room_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update on room_bookings" ON public.room_bookings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on room_bookings" ON public.room_bookings FOR DELETE USING (true);

-- 12. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_room_bookings_room_id ON public.room_bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_date ON public.room_bookings(date);
CREATE INDEX IF NOT EXISTS idx_room_bookings_meeting_id ON public.room_bookings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_room_date ON public.room_bookings(room_id, date);
CREATE INDEX IF NOT EXISTS idx_room_bookings_status ON public.room_bookings(status);
CREATE INDEX IF NOT EXISTS idx_rooms_name ON public.rooms(name);
