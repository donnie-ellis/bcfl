-- Migration file: YYYYMMDDHHMMSS_update_players_table.sql

-- Add new columns to the players table
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS selected_position text,
ADD COLUMN IF NOT EXISTS percent_started numeric(5,2),
ADD COLUMN IF NOT EXISTS percent_owned numeric(5,2),
ADD COLUMN IF NOT EXISTS player_notes_last_timestamp bigint,
ADD COLUMN IF NOT EXISTS preseason_rank integer,
ADD COLUMN IF NOT EXISTS weekly_stats jsonb,
ADD COLUMN IF NOT EXISTS season_stats jsonb;

-- Modify existing column
ALTER TABLE public.players
ALTER COLUMN has_player_notes TYPE boolean USING CASE WHEN has_player_notes = 0 THEN false ELSE true END;

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_players_status ON public.players(status);
CREATE INDEX IF NOT EXISTS idx_players_selected_position ON public.players(selected_position);
CREATE INDEX IF NOT EXISTS idx_players_percent_owned ON public.players(percent_owned);
CREATE INDEX IF NOT EXISTS idx_players_preseason_rank ON public.players(preseason_rank);

-- Update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Only create the trigger if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_players_modtime') THEN
        CREATE TRIGGER update_players_modtime
        BEFORE UPDATE ON public.players
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;