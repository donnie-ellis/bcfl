-- Migration: Add league_key and team_key to sessions table

-- First, let's check if the columns already exist to avoid errors
DO $$
BEGIN
    -- Check for league_key column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='sessions' AND column_name='league_key') THEN
        ALTER TABLE sessions ADD COLUMN league_key TEXT;
    END IF;

    -- Check for team_key column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='sessions' AND column_name='team_key') THEN
        ALTER TABLE sessions ADD COLUMN team_key TEXT;
    END IF;
END $$;

-- Add comments to the new columns
COMMENT ON COLUMN sessions.league_key IS 'The key of the league the user is currently viewing';
COMMENT ON COLUMN sessions.team_key IS 'The key of the team owned by the user in the current league';

-- Create an index on league_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_league_key ON sessions(league_key);

-- Create an index on team_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_team_key ON sessions(team_key);