-- Add organization column to people table
ALTER TABLE people ADD COLUMN IF NOT EXISTS organization TEXT;

-- Update comments
COMMENT ON COLUMN people.organization IS 'The organization/company the person belongs to';
