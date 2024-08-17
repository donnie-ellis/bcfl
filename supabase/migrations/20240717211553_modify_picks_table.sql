-- Ensure picks table has the correct structure
ALTER TABLE picks 
  ALTER COLUMN draft_id SET NOT NULL,
  ALTER COLUMN team_key SET NOT NULL,
  ALTER COLUMN pick_number SET NOT NULL,
  ALTER COLUMN round_number SET NOT NULL,
  ALTER COLUMN total_pick_number SET NOT NULL;

-- Ensure picks table has the correct primary key
ALTER TABLE picks DROP CONSTRAINT IF EXISTS picks_pkey;
ALTER TABLE picks ADD PRIMARY KEY (draft_id, pick_number);

-- Ensure there's an index on draft_id for efficient deletions
CREATE INDEX IF NOT EXISTS idx_picks_draft_id ON picks(draft_id);

-- Add a foreign key constraint to drafts table if it doesn't exist
ALTER TABLE picks 
  ADD CONSTRAINT fk_picks_draft 
  FOREIGN KEY (draft_id) 
  REFERENCES drafts(id) 
  ON DELETE CASCADE;