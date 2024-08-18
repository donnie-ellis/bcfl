-- ./supabase/migrations/20240815000000_remove_waiver_priority_constraint.sql

-- Remove the check constraint
ALTER TABLE IF EXISTS public.teams 
DROP CONSTRAINT IF EXISTS check_waiver_priority;

-- Update the column definition
ALTER TABLE public.teams 
ALTER COLUMN waiver_priority TYPE varchar,
ALTER COLUMN waiver_priority DROP NOT NULL,
ALTER COLUMN waiver_priority DROP DEFAULT;

-- Update the comment on the column
COMMENT ON COLUMN public.teams.waiver_priority IS 'Waiver priority as a string. Can be null, empty string, numeric, or "last"';

-- Remove the validation function and trigger if they exist
DROP TRIGGER IF EXISTS trigger_validate_waiver_priority ON public.teams;
DROP FUNCTION IF EXISTS validate_waiver_priority();