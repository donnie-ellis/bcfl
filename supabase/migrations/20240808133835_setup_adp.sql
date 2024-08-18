-- Add new columns to draft_players table
ALTER TABLE draft_players
ADD COLUMN adp NUMERIC(5,2),
ADD COLUMN adp_formatted VARCHAR(10),
ADD COLUMN ffcalc_id INTEGER;

-- Create an index on ffcalc_id for faster lookups
CREATE INDEX idx_draft_players_ffcalc_id ON draft_players(ffcalc_id);