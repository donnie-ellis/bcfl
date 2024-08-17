-- Function to delete a draft and its related entries
CREATE OR REPLACE FUNCTION delete_draft(p_draft_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete related draft picks
  DELETE FROM draft_picks WHERE draft_id = p_draft_id;
  
  -- Delete related draft teams
  DELETE FROM draft_teams WHERE draft_id = p_draft_id;
  
  -- Delete the draft itself
  DELETE FROM drafts WHERE id = p_draft_id;
END;
$$ LANGUAGE plpgsql;