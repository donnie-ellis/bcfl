-- Function to delete a draft and its related entries
CREATE OR REPLACE FUNCTION delete_draft(p_draft_id TEXT)
RETURNS VOID AS $$
DECLARE
    v_draft_id UUID;
BEGIN
    -- Try to cast the input to UUID
    BEGIN
        v_draft_id := p_draft_id::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
        -- If casting to UUID fails, try to use it as an integer
        v_draft_id := (SELECT id FROM drafts WHERE id::TEXT = p_draft_id);
    END;

    -- If v_draft_id is still null, the draft wasn't found
    IF v_draft_id IS NULL THEN
        RAISE EXCEPTION 'Draft not found';
    END IF;

    -- Delete related draft picks
    DELETE FROM draft_picks WHERE draft_id = v_draft_id;
  
    -- Delete related draft teams
    DELETE FROM draft_teams WHERE draft_id = v_draft_id;
  
    -- Delete the draft itself
    DELETE FROM drafts WHERE id = v_draft_id;
END;
$$ LANGUAGE plpgsql;