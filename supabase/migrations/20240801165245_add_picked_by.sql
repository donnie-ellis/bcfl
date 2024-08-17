-- ./migrations/add_picked_by_to_picks.sql
ALTER TABLE public.picks
ADD COLUMN picked_by text;

COMMENT ON COLUMN public.picks.picked_by IS 'The GUID of the manager who made the pick';