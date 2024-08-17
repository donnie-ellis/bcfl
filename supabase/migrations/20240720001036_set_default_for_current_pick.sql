-- 20230719001_add_current_pick_and_trigger.sql

-- Up Migration
CREATE OR REPLACE FUNCTION public.add_current_pick_column()
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='drafts' AND column_name='current_pick') THEN
        ALTER TABLE drafts ADD COLUMN current_pick INTEGER DEFAULT 1 NOT NULL;
    END IF;
END;
$$ LANGUAGE plpgsql;

SELECT public.add_current_pick_column();

DROP FUNCTION public.add_current_pick_column();

-- Update existing drafts to set current_pick based on the latest pick
UPDATE drafts d
SET current_pick = COALESCE(
    (SELECT MAX(total_pick_number) 
     FROM picks 
     WHERE draft_id = d.id AND is_picked = true),
    1
);

-- Create function to update current_pick
CREATE OR REPLACE FUNCTION public.update_draft_current_pick()
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
EXECUTE FUNCTION public.update_draft_current_pick();

-- Create index on picks table for faster queries
CREATE INDEX IF NOT EXISTS idx_picks_draft_id_total_pick_number ON picks (draft_id, total_pick_number);

-- Down Migration
CREATE OR REPLACE FUNCTION public.remove_current_pick_column()
RETURNS void AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='drafts' AND column_name='current_pick') THEN
        ALTER TABLE drafts DROP COLUMN current_pick;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Down Migration (to be executed manually if needed)
-- SELECT public.remove_current_pick_column();
-- DROP FUNCTION public.remove_current_pick_column();
-- DROP TRIGGER IF EXISTS update_draft_current_pick_trigger ON picks;
-- DROP FUNCTION public.update_draft_current_pick();
-- DROP INDEX IF EXISTS idx_picks_draft_id_total_pick_number;