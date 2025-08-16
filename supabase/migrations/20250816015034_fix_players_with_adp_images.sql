-- Migration to fix players_with_adp view to use headshot_url instead of image_url

-- Drop the existing view
DROP VIEW IF EXISTS players_with_adp;

-- Recreate the view with headshot_url instead of image_url
CREATE VIEW players_with_adp AS
SELECT 
    p.id,
    p.player_key,
    p.first_name,
    p.last_name,
    p.full_name,
    p.headshot_url,  -- Changed from image_url to headshot_url
    p.display_position,
    p.eligible_positions,
    p.position_type,
    p.editorial_player_key,
    p.editorial_team_abbr,
    p.editorial_team_full_name,
    p.editorial_team_key,
    p.bye_weeks,
    p.uniform_number,
    p.status,
    pa.adp,
    pa.adp_formatted,
    pa.source_id,
    pa.draft_id,
    dp.is_picked,
    dp.percent_drafted
FROM players p
LEFT JOIN player_adp pa ON p.id = pa.player_id
LEFT JOIN draft_players dp ON p.id = dp.player_id AND pa.draft_id = dp.draft_id;