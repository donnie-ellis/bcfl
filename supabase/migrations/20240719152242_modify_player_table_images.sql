-- Migration: Update player image columns in players table

-- Function to check if a column exists (if not already defined)
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

-- Remove the headshot column if it exists and is of type jsonb
DO $$
BEGIN
  IF column_exists('players', 'headshot') THEN
    IF (SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'players' AND column_name = 'headshot') = 'jsonb' THEN
      ALTER TABLE players DROP COLUMN headshot;
    END IF;
  END IF;
END $$;

-- Add or modify columns for player images
DO $$
BEGIN
  IF NOT column_exists('players', 'headshot_url') THEN
    ALTER TABLE players ADD COLUMN headshot_url TEXT;
  END IF;

  IF NOT column_exists('players', 'headshot_size') THEN
    ALTER TABLE players ADD COLUMN headshot_size TEXT;
  END IF;

  IF NOT column_exists('players', 'image_url') THEN
    ALTER TABLE players ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- Drop the temporary function if it was created in this migration
DROP FUNCTION IF EXISTS column_exists(text, text);