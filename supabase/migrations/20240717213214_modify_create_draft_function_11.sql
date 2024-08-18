CREATE OR REPLACE FUNCTION create_draft_with_picks(
  p_league_id TEXT,
  p_name TEXT,
  p_rounds INTEGER,
  p_total_picks INTEGER,
  p_draft_order JSONB,
  p_status TEXT,
  p_ordered_teams JSONB
) RETURNS TABLE (created_draft_id INTEGER, debug_info TEXT) AS $$
DECLARE
  v_draft_id INTEGER;
  v_team JSONB;
  v_round INTEGER;
  v_pick INTEGER;
  v_total_pick INTEGER;
  v_num_teams INTEGER;
  v_debug TEXT := '';
BEGIN
  -- Insert the draft or update if it already exists
  INSERT INTO drafts (league_id, name, rounds, total_picks, draft_order, status)
  VALUES (p_league_id, p_name, p_rounds, p_total_picks, p_draft_order, p_status)
  ON CONFLICT (league_id, name)
  DO UPDATE SET
    rounds = EXCLUDED.rounds,
    total_picks = EXCLUDED.total_picks,
    draft_order = EXCLUDED.draft_order,
    status = EXCLUDED.status
  RETURNING id INTO v_draft_id;

  v_debug := v_debug || 'Draft ID: ' || v_draft_id || '. ';

  -- Delete existing picks for this draft (if any)
  DELETE FROM picks WHERE draft_id = v_draft_id;
  
  v_debug := v_debug || 'Deleted existing picks. ';

  -- Get the number of teams
  v_num_teams := jsonb_array_length(p_ordered_teams);

  -- Prepare picks
  WITH pick_data AS (
    SELECT 
      v_draft_id AS draft_id,
      (CASE 
        WHEN (gs_round.round % 2 = 0) THEN p_ordered_teams->>(v_num_teams - gs_pick.pick)
        ELSE p_ordered_teams->>(gs_pick.pick - 1)
      END)::jsonb->>'team_key' AS team_key,
      gs_pick.pick AS pick_number,
      gs_round.round AS round_number,
      (gs_round.round - 1) * v_num_teams + gs_pick.pick AS total_pick_number
    FROM 
      generate_series(1, p_rounds) AS gs_round(round),
      generate_series(1, v_num_teams) AS gs_pick(pick)
  )
  INSERT INTO picks (draft_id, team_key, pick_number, round_number, total_pick_number)
  SELECT * FROM pick_data;

  v_debug := v_debug || 'Inserted ' || p_rounds * v_num_teams || ' picks. ';

  RETURN QUERY SELECT v_draft_id, v_debug;
END;
$$ LANGUAGE plpgsql;