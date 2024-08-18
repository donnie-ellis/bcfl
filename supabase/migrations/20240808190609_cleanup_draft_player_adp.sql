-- Revert the changes made to draft_players table

-- Drop the columns related to ADP
ALTER TABLE public.draft_players
DROP COLUMN IF EXISTS adp,
DROP COLUMN IF EXISTS adp_formatted,
DROP COLUMN IF EXISTS ffcalc_id;

-- Remove the index if it exists
DROP INDEX IF EXISTS idx_draft_players_ffcalc_id;
