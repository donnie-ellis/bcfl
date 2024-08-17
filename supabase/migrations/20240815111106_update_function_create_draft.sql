-- ./migrations/000X_update_create_draft_with_picks_function.sql

-- First, drop the existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.create_draft_with_picks(text, text, integer, integer, jsonb, text, jsonb);
DROP FUNCTION IF EXISTS public.create_draft_with_picks(text, text, integer, integer, jsonb, text, jsonb[]);

-- Now, create the updated function
CREATE OR REPLACE FUNCTION public.create_draft_with_picks(
    p_league_id TEXT,
    p_name TEXT,
    p_rounds INTEGER,
    p_total_picks INTEGER,
    p_draft_order JSONB,
    p_status TEXT,
    p_ordered_teams JSONB
) RETURNS TABLE(created_draft_id INTEGER) AS $$
DECLARE
  v_draft_id INTEGER;
  v_num_teams INTEGER;
  v_total_pick INTEGER;
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

  -- Verify draft was created
  IF v_draft_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create or update draft';
  END IF;

  -- Delete existing picks for this draft if any exist
  DELETE FROM picks WHERE draft_id = v_draft_id;

  -- Get the number of teams
  v_num_teams := jsonb_array_length(p_ordered_teams);

  -- Insert new picks
  INSERT INTO picks (draft_id, team_key, pick_number, round_number, total_pick_number)
  SELECT 
    v_draft_id,
    (p_ordered_teams->
      CASE 
        WHEN (gs_round.round % 2 = 0) THEN (v_num_teams - gs_pick.pick)::int
        ELSE (gs_pick.pick - 1)::int
      END
    ->>'team_key')::text,
    gs_pick.pick,
    gs_round.round,
    (gs_round.round - 1) * v_num_teams + gs_pick.pick
  FROM 
    generate_series(1, p_rounds) AS gs_round(round),
    generate_series(1, v_num_teams) AS gs_pick(pick);

  GET DIAGNOSTICS v_total_pick = ROW_COUNT;

  -- Verify picks were inserted
  IF v_total_pick = 0 THEN
    RAISE EXCEPTION 'No picks were inserted';
  END IF;

  RETURN QUERY SELECT v_draft_id;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_draft_with_picks(TEXT, TEXT, INTEGER, INTEGER, JSONB, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_draft_with_picks(TEXT, TEXT, INTEGER, INTEGER, JSONB, TEXT, JSONB) TO service_role;