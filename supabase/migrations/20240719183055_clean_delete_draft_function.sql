-- Step 1: Drop all existing delete_draft functions
DROP FUNCTION IF EXISTS delete_draft(uuid);
DROP FUNCTION IF EXISTS delete_draft(text);
DROP FUNCTION IF EXISTS delete_draft(int);

-- Step 2: Create the new delete_draft function
CREATE OR REPLACE FUNCTION delete_draft(p_draft_id INT)
RETURNS VOID AS $$
BEGIN
    -- Delete related draft picks
    DELETE FROM draft_picks WHERE draft_id = p_draft_id;
  
    -- Delete related draft teams
    DELETE FROM draft_teams WHERE draft_id = p_draft_id;
  
    -- Delete the draft itself
    DELETE FROM drafts WHERE id = p_draft_id;

    -- If no rows were deleted, the draft wasn't found
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Draft with ID % not found', p_draft_id;
    END IF;
END;
$$ LANGUAGE plpgsql;