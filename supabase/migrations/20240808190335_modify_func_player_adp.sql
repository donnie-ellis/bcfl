CREATE OR REPLACE FUNCTION public.get_player_with_adp(p_player_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    player_key TEXT,
    full_name TEXT,
    -- Include other player fields here
    adp NUMERIC(5,2),
    adp_formatted VARCHAR(10),
    source_id INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.*, pa.adp, pa.adp_formatted, pa.source_id
    FROM public.players p
    LEFT JOIN public.player_adp pa ON p.id = pa.player_id
    WHERE p.id = p_player_id;
END;
$$ LANGUAGE plpgsql;