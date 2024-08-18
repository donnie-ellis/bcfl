-- Migration file: YYYYMMDDHHMMSS_add_new_player_fields.sql

-- Add new columns to the players table
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS status_full text,
ADD COLUMN IF NOT EXISTS on_disabled_list boolean,
ADD COLUMN IF NOT EXISTS is_undroppable boolean,
ADD COLUMN IF NOT EXISTS player_stats jsonb,
ADD COLUMN IF NOT EXISTS player_advanced_stats jsonb,
ADD COLUMN IF NOT EXISTS player_points jsonb,
ADD COLUMN IF NOT EXISTS draft_analysis jsonb,
ADD COLUMN IF NOT EXISTS league_ownership jsonb,
ADD COLUMN IF NOT EXISTS rank integer,
ADD COLUMN IF NOT EXISTS o_rank integer,
ADD COLUMN IF NOT EXISTS psr_rank integer,
ADD COLUMN IF NOT EXISTS ownership jsonb;

-- Update existing columns that might need type changes
ALTER TABLE public.players
ALTER COLUMN percent_started TYPE numeric(5,2),
ALTER COLUMN percent_owned TYPE numeric(5,2);

-- Convert has_player_notes to boolean
ALTER TABLE public.players
ALTER COLUMN has_player_notes TYPE boolean 
USING CASE 
    WHEN has_player_notes::text = '1' THEN true 
    WHEN has_player_notes::text = '0' THEN false 
    ELSE null 
END;

-- Convert player_notes_last_timestamp to timestamp
ALTER TABLE public.players
ALTER COLUMN player_notes_last_timestamp TYPE timestamp with time zone
USING 
    CASE 
        WHEN player_notes_last_timestamp IS NOT NULL AND player_notes_last_timestamp != 0
        THEN to_timestamp(player_notes_last_timestamp)
        ELSE NULL
    END;

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_players_rank ON public.players(rank);
CREATE INDEX IF NOT EXISTS idx_players_o_rank ON public.players(o_rank);
CREATE INDEX IF NOT EXISTS idx_players_psr_rank ON public.players(psr_rank);
CREATE INDEX IF NOT EXISTS idx_players_player_notes_last_timestamp ON public.players(player_notes_last_timestamp);

-- Add a GIN index for the jsonb columns to allow for efficient querying
CREATE INDEX IF NOT EXISTS idx_players_draft_analysis ON public.players USING GIN (draft_analysis);
CREATE INDEX IF NOT EXISTS idx_players_ownership ON public.players USING GIN (ownership);

-- Update the updated_at column when these fields are modified
CREATE OR REPLACE FUNCTION update_player_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_player_modtime ON public.players;

CREATE TRIGGER update_player_modtime
BEFORE UPDATE ON public.players
FOR EACH ROW
EXECUTE FUNCTION update_player_modified_column();

-- Add a comment to the players table
COMMENT ON TABLE public.players IS 'Stores detailed information about players from Yahoo Fantasy Sports API';