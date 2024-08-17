-- ./migrations/000X_add_current_pick_and_trigger.sql

-- Add current_pick column to drafts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='drafts' AND column_name='current_pick') THEN
        ALTER TABLE drafts ADD COLUMN current_pick INTEGER DEFAULT 1;
    END IF;
END $$;

-- Update existing drafts to set current_pick based on the latest pick
UPDATE drafts d
SET current_pick = COALESCE(
    (SELECT MAX(total_pick_number) 
     FROM picks 
     WHERE draft_id = d.id AND is_picked = true),
    1
);

-- Create function to update current_pick
CREATE OR REPLACE FUNCTION update_draft_current_pick()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE drafts
    SET current_pick = NEW.total_pick_number + 1
    WHERE id = NEW.draft_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function when a pick is made
DROP TRIGGER IF EXISTS update_draft_current_pick_trigger ON picks;
CREATE TRIGGER update_draft_current_pick_trigger
AFTER UPDATE OF is_picked ON picks
FOR EACH ROW
WHEN (NEW.is_picked = true)
EXECUTE FUNCTION update_draft_current_pick();

-- Create index on picks table for faster queries
CREATE INDEX IF NOT EXISTS idx_picks_draft_id_total_pick_number ON picks (draft_id, total_pick_number);