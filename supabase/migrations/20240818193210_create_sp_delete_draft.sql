CREATE OR REPLACE FUNCTION public.delete_draft(p_draft_id INTEGER)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Delete related player_adp entries
    DELETE FROM public.player_adp WHERE draft_id = p_draft_id;

    -- Delete related draft_players entries
    DELETE FROM public.draft_players WHERE draft_id = p_draft_id;

    -- Delete related picks
    DELETE FROM public.picks WHERE draft_id = p_draft_id;

    -- Finally, delete the draft
    DELETE FROM public.drafts WHERE id = p_draft_id;

    -- If any of the above operations fail, the entire transaction will be rolled back automatically
END;
$$;