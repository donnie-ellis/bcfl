-- Migration: Update players table with new fields

-- Add new columns
ALTER TABLE players
ADD COLUMN url TEXT,
ADD COLUMN status_full TEXT,
ADD COLUMN injury_note TEXT,
ADD COLUMN editorial_team_url TEXT,
ADD COLUMN is_keeper JSONB,
ADD COLUMN is_undroppable TEXT,
ADD COLUMN primary_position TEXT,
ADD COLUMN eligible_positions_to_add TEXT[],
ADD COLUMN has_player_notes INTEGER,
ADD COLUMN player_notes_last_timestamp BIGINT;

-- Update existing columns
ALTER TABLE players
ALTER COLUMN status TYPE TEXT,
ALTER COLUMN uniform_number TYPE TEXT,
ALTER COLUMN headshot TYPE JSONB USING jsonb_build_object('url', headshot, 'size', headshot_size),
DROP COLUMN headshot_size,
ALTER COLUMN image_url TYPE TEXT,
ALTER COLUMN position_type TYPE TEXT;

-- Update the bye_weeks column to be an array
ALTER TABLE players
ALTER COLUMN bye_weeks TYPE TEXT[] USING ARRAY[bye_weeks];

-- Add an index on player_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_players_player_key ON players(player_key);