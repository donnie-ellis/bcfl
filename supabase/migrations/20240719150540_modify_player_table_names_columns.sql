-- Migration: Safely update name columns in players table

-- Function to check if a column exists
CREATE OR REPLACE FUNCTION column_exists(tbl text, col text) RETURNS boolean AS $$
DECLARE
  exists boolean;
BEGIN
  SELECT count(*) > 0 INTO exists
  FROM information_schema.columns
  WHERE table_name = tbl AND column_name = col;
  RETURN exists;
END;
$$ LANGUAGE plpgsql;

-- Remove the name column if it exists and is of type jsonb
DO $$
BEGIN
  IF column_exists('players', 'name') THEN
    IF (SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'players' AND column_name = 'name') = 'jsonb' THEN
      ALTER TABLE players DROP COLUMN name;
    END IF;
  END IF;
END $$;

-- Add or modify columns for name components
DO $$
BEGIN
  IF NOT column_exists('players', 'full_name') THEN
    ALTER TABLE players ADD COLUMN full_name TEXT;
  END IF;

  IF NOT column_exists('players', 'first_name') THEN
    ALTER TABLE players ADD COLUMN first_name TEXT;
  END IF;

  IF NOT column_exists('players', 'last_name') THEN
    ALTER TABLE players ADD COLUMN last_name TEXT;
  END IF;

  IF NOT column_exists('players', 'ascii_first_name') THEN
    ALTER TABLE players ADD COLUMN ascii_first_name TEXT;
  END IF;

  IF NOT column_exists('players', 'ascii_last_name') THEN
    ALTER TABLE players ADD COLUMN ascii_last_name TEXT;
  END IF;
END $$;

-- Ensure columns are NOT NULL
ALTER TABLE players
ALTER COLUMN full_name SET NOT NULL,
ALTER COLUMN first_name SET NOT NULL,
ALTER COLUMN last_name SET NOT NULL;

-- Add an index on full_name for faster searches if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_players_full_name') THEN
    CREATE INDEX idx_players_full_name ON players(full_name);
  END IF;
END $$;

-- Drop the temporary function
DROP FUNCTION column_exists(text, text);