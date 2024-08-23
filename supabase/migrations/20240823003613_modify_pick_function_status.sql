-- Migration to remove unnecessary submit_draft_pick function and update the remaining one

-- Step 1: Drop the unnecessary function
DROP FUNCTION IF EXISTS public.submit_draft_pick(integer, integer, integer);

-- Step 2: Update the remaining function to set draft status to 'completed' when there are no more picks
CREATE OR REPLACE FUNCTION public.submit_draft_pick(
    p_draft_id integer,
    p_pick_id integer,
    p_player_id integer,
    p_picked_by text
) RETURNS jsonb
    LANGUAGE plpgsql
AS $$
DECLARE
  v_pick RECORD;
  v_next_pick INTEGER;
  v_result JSONB;
  v_total_picks INTEGER;
  v_picked_count INTEGER;
BEGIN
  -- Fetch the pick and related draft information
  SELECT p.*, d.current_pick, d.total_picks
  INTO v_pick
  FROM picks p
  JOIN drafts d ON p.draft_id = d.id
  WHERE p.id = p_pick_id AND p.draft_id = p_draft_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pick not found';
  END IF;

  -- Update the pick
  UPDATE picks
  SET player_id = p_player_id, is_picked = true, picked_by = p_picked_by
  WHERE id = p_pick_id AND draft_id = p_draft_id;

  -- Update or insert into draft_players
  INSERT INTO draft_players (draft_id, player_id, is_picked)
  VALUES (p_draft_id, p_player_id, true)
  ON CONFLICT (draft_id, player_id) 
  DO UPDATE SET is_picked = true;

  -- If the pick being made is the current pick, find the next unpicked slot
  IF v_pick.total_pick_number = v_pick.current_pick THEN
    SELECT MIN(total_pick_number)
    INTO v_next_pick
    FROM picks
    WHERE draft_id = p_draft_id
      AND is_picked = false
      AND total_pick_number > v_pick.current_pick;

    -- If there are no more unpicked slots, set to total_picks + 1
    IF v_next_pick IS NULL THEN
      v_next_pick := v_pick.total_picks + 1;
    END IF;

    -- Update the current pick
    UPDATE drafts
    SET current_pick = v_next_pick
    WHERE id = p_draft_id;
  END IF;

  -- Check if all picks have been made
  SELECT total_picks, COUNT(*) FILTER (WHERE is_picked = true)
  INTO v_total_picks, v_picked_count
  FROM drafts d
  JOIN picks p ON d.id = p.draft_id
  WHERE d.id = p_draft_id
  GROUP BY d.id, d.total_picks;

  -- If all picks have been made, set the draft status to 'completed'
  IF v_picked_count = v_total_picks THEN
    UPDATE drafts
    SET status = 'completed'
    WHERE id = p_draft_id;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Pick submitted successfully'
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    v_result := jsonb_build_object(
      'success', false,
      'message', 'Failed to submit pick: ' || SQLERRM
    );
    RETURN v_result;
END;
$$;

-- Step 3: Update the function owner and grants
ALTER FUNCTION public.submit_draft_pick(integer, integer, integer, text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.submit_draft_pick(integer, integer, integer, text) TO anon;
GRANT ALL ON FUNCTION public.submit_draft_pick(integer, integer, integer, text) TO authenticated;
GRANT ALL ON FUNCTION public.submit_draft_pick(integer, integer, integer, text) TO service_role;