CREATE OR REPLACE VIEW public.players_with_adp AS
SELECT 
    p.id,
    p.player_key::text,
    p.full_name::text,
    p.first_name::text,
    p.last_name::text,
    p.editorial_team_abbr::text,
    p.display_position::text,
    p.position_type::text,
    p.eligible_positions,
    p.status::text,
    p.editorial_player_key::text,
    p.editorial_team_key::text,
    p.editorial_team_full_name::text,
    p.bye_weeks,
    p.uniform_number::text,
    p.image_url::text,
    pa.adp,
    pa.adp_formatted::text,
    pa.source_id,
    pa.draft_id,
    COALESCE(dp.is_picked, false) as is_picked,
    dp.percent_drafted
FROM public.players p
LEFT JOIN public.player_adp pa ON p.id = pa.player_id
LEFT JOIN public.draft_players dp ON p.id = dp.player_id;