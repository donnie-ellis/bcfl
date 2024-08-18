CREATE OR REPLACE FUNCTION public.delete_draft(p_draft_id INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Delete related picks
    DELETE FROM public.picks WHERE draft_id = p_draft_id;
    
    -- Delete related draft players
    DELETE FROM public.draft_players WHERE draft_id = p_draft_id;
  
    -- Delete the draft itself
    DELETE FROM public.drafts WHERE id = p_draft_id;

    -- If no rows were deleted, the draft wasn't found
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Draft with ID % not found', p_draft_id;
    END IF;
END;
$$ LANGUAGE plpgsql;