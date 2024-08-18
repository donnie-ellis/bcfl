-- ./migrations/YYYYMMDDHHMMSS_update_managers_table.sql

-- Remove the existing foreign key constraint
ALTER TABLE managers DROP CONSTRAINT IF EXISTS managers_team_key_fkey;

-- Add league_keys and team_keys columns
ALTER TABLE managers
ADD COLUMN league_keys TEXT[] DEFAULT '{}',
ADD COLUMN team_keys TEXT[] DEFAULT '{}';

-- Update existing rows to populate team_keys
UPDATE managers
SET team_keys = ARRAY[team_key]
WHERE team_key IS NOT NULL;

-- Remove the old team_key column
ALTER TABLE managers DROP COLUMN team_key;

-- Create a new table for manager_team_league relationships
CREATE TABLE manager_team_league (
  id SERIAL PRIMARY KEY,
  manager_guid TEXT NOT NULL,
  team_key TEXT NOT NULL,
  league_key TEXT NOT NULL,
  UNIQUE (manager_guid, team_key, league_key)
);

-- Add indexes for better query performance
CREATE INDEX idx_manager_team_league_manager_guid ON manager_team_league (manager_guid);
CREATE INDEX idx_manager_team_league_team_key ON manager_team_league (team_key);
CREATE INDEX idx_manager_team_league_league_key ON manager_team_league (league_key);

-- Add a trigger to update managers table when manager_team_league is updated
CREATE OR REPLACE FUNCTION update_manager_keys() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE managers
    SET team_keys = array_append(team_keys, NEW.team_key),
        league_keys = array_append(league_keys, NEW.league_key)
    WHERE guid = NEW.manager_guid;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE managers
    SET team_keys = array_remove(team_keys, OLD.team_key),
        league_keys = array_remove(league_keys, OLD.league_key)
    WHERE guid = OLD.manager_guid;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER manager_team_league_update
AFTER INSERT OR DELETE ON manager_team_league
FOR EACH ROW EXECUTE FUNCTION update_manager_keys();