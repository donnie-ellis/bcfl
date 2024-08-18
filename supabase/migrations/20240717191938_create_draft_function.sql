CREATE OR REPLACE FUNCTION create_draft_with_picks(
  p_league_id TEXT,
  p_name TEXT,
  p_rounds INTEGER,
  p_total_picks INTEGER,
  p_draft_order JSONB,
  p_status TEXT,
  p_ordered_teams JSONB
) RETURNS TABLE (draft_id INTEGER) AS $$
DECLARE
  v_draft_id INTEGER;
  v_team JSONB;
  v_round INTEGER;
  v_pick INTEGER;
  v_total_pick INTEGER;
BEGIN
  -- Insert the draft
  INSERT INTO drafts (league_id, name, rounds, total_picks, draft_order, status)
  VALUES (p_league_id, p_name, p_rounds, p_total_picks, p_draft_order, p_status)
  RETURNING id INTO v_draft_id;

  -- Create picks
  v_total_pick := 1;
  FOR v_round IN 1..p_rounds LOOP
    FOR v_pick IN 1..jsonb_array_length(p_ordered_teams) LOOP
      IF v_round % 2 = 0 THEN
        -- Even rounds: reverse order
        v_team := p_ordered_teams->((jsonb_array_length(p_ordered_teams) - v_pick));
      ELSE
        -- Odd rounds: normal order
        v_team := p_ordered_teams->(v_pick - 1);
      END IF;

      INSERT INTO picks (draft_id, team_id, pick_number, round_number, total_pick_number)
      VALUES (v_draft_id, (v_team->>'team_id')::TEXT, v_pick, v_round, v_total_pick);

      v_total_pick := v_total_pick + 1;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT v_draft_id;
END;
$$ LANGUAGE plpgsql;