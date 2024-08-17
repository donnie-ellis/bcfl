-- Add draft_id column to player_adp table
ALTER TABLE public.player_adp
ADD COLUMN draft_id INTEGER REFERENCES public.drafts(id);

-- Create an index on the new column
CREATE INDEX idx_player_adp_draft_id ON public.player_adp(draft_id);

-- Update the get_player_with_adp function to include draft_id in the WHERE clause
CREATE OR REPLACE FUNCTION public.get_player_with_adp(p_player_id INTEGER, p_draft_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    player_key TEXT,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    editorial_team_abbr TEXT,
    display_position TEXT,
    position_type TEXT,
    eligible_positions TEXT[],
    status TEXT,
    editorial_player_key TEXT,
    editorial_team_key TEXT,
    editorial_team_full_name TEXT,
    bye_weeks TEXT[],
    uniform_number TEXT,
    image_url TEXT,
    adp NUMERIC(5,2),
    adp_formatted VARCHAR(10),
    source_id INTEGER,
    draft_id INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.*, pa.adp, pa.adp_formatted, pa.source_id, pa.draft_id
    FROM public.players p
    LEFT JOIN public.player_adp pa ON p.id = pa.player_id AND pa.draft_id = p_draft_id
    WHERE p.id = p_player_id;
END;
$$ LANGUAGE plpgsql;