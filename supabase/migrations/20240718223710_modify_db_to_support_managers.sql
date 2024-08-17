-- Migration: Update teams and managers tables, update drafts table

-- Modify teams table if it exists, or create it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
        CREATE TABLE teams (
            team_key VARCHAR(255) PRIMARY KEY,
            league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
            team_id VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            url TEXT,
            team_logos JSONB,
            waiver_priority VARCHAR(50),
            faab_balance VARCHAR(50),
            number_of_moves INTEGER,
            number_of_trades INTEGER,
            league_scoring_type VARCHAR(50),
            has_draft_grade BOOLEAN,
            roster_adds JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ELSE
        -- Add any missing columns to existing teams table
        ALTER TABLE teams
        ADD COLUMN IF NOT EXISTS league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS team_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS url TEXT,
        ADD COLUMN IF NOT EXISTS team_logos JSONB,
        ADD COLUMN IF NOT EXISTS waiver_priority VARCHAR(50),
        ADD COLUMN IF NOT EXISTS faab_balance VARCHAR(50),
        ADD COLUMN IF NOT EXISTS number_of_moves INTEGER,
        ADD COLUMN IF NOT EXISTS number_of_trades INTEGER,
        ADD COLUMN IF NOT EXISTS league_scoring_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS has_draft_grade BOOLEAN,
        ADD COLUMN IF NOT EXISTS roster_adds JSONB,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Modify managers table if it exists, or create it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'managers') THEN
        CREATE TABLE managers (
            manager_id VARCHAR(255) NOT NULL,
            team_key VARCHAR(255) REFERENCES teams(team_key) ON DELETE CASCADE,
            nickname VARCHAR(255),
            guid VARCHAR(255),
            is_commissioner BOOLEAN,
            is_current_login BOOLEAN,
            email VARCHAR(255),
            image_url TEXT,
            felo_score VARCHAR(50),
            felo_tier VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (manager_id, team_key)
        );
    ELSE
        -- Add any missing columns to existing managers table
        ALTER TABLE managers
        ADD COLUMN IF NOT EXISTS team_key VARCHAR(255) REFERENCES teams(team_key) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS nickname VARCHAR(255),
        ADD COLUMN IF NOT EXISTS guid VARCHAR(255),
        ADD COLUMN IF NOT EXISTS is_commissioner BOOLEAN,
        ADD COLUMN IF NOT EXISTS is_current_login BOOLEAN,
        ADD COLUMN IF NOT EXISTS email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS image_url TEXT,
        ADD COLUMN IF NOT EXISTS felo_score VARCHAR(50),
        ADD COLUMN IF NOT EXISTS felo_tier VARCHAR(50),
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Add draft_order column to drafts table if it doesn't exist
ALTER TABLE drafts
ADD COLUMN IF NOT EXISTS draft_order JSONB;

-- Create update_modified_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_teams_modtime') THEN
        CREATE TRIGGER update_teams_modtime
        BEFORE UPDATE ON teams
        FOR EACH ROW
        EXECUTE FUNCTION update_modified_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_managers_modtime') THEN
        CREATE TRIGGER update_managers_modtime
        BEFORE UPDATE ON managers
        FOR EACH ROW
        EXECUTE FUNCTION update_modified_column();
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_league_id ON teams(league_id);
CREATE INDEX IF NOT EXISTS idx_managers_team_key ON managers(team_key);