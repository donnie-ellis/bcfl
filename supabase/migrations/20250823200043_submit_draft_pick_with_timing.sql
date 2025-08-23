-- Migration: Update submit_draft_pick_with_timing to use server-side timer calculation
-- This removes the dependency on client-side timer state
-- Drop the old function with 5 parameters
DROP FUNCTION IF EXISTS "public"."submit_draft_pick_with_timing"(integer, integer, integer, text, integer);

-- Then run your migration to create the new function with 4 parameters
CREATE OR REPLACE FUNCTION "public"."submit_draft_pick_with_timing"(
  "p_draft_id" integer, 
  "p_pick_id" integer, 
  "p_player_id" integer, 
  "p_picked_by" "text"
) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_pick RECORD;
  v_next_pick INTEGER;
  v_result JSONB;
  v_total_picks INTEGER;
  v_picked_count INTEGER;
  v_draft_pick_seconds INTEGER;
  v_calculated_time INTEGER;
  v_latest_timer_event RECORD;
  v_time_elapsed INTEGER;
BEGIN
  -- Fetch the pick and related draft information
  SELECT p.*, d.current_pick, d.total_picks, d.pick_seconds
  INTO v_pick
  FROM picks p
  JOIN drafts d ON p.draft_id = d.id
  WHERE p.id = p_pick_id AND p.draft_id = p_draft_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pick not found';
  END IF;

  -- Get the draft's pick_seconds setting
  v_draft_pick_seconds := v_pick.pick_seconds;

  -- Get the latest timer event for this draft
  SELECT * INTO v_latest_timer_event
  FROM draft_timer_events 
  WHERE draft_id = p_draft_id
  ORDER BY created_at DESC 
  LIMIT 1;

  -- Calculate the actual time taken for the pick based on server-side timer state
  IF v_latest_timer_event IS NOT NULL THEN
    -- Calculate time elapsed since the last timer event
    v_time_elapsed := EXTRACT(EPOCH FROM (NOW() - v_latest_timer_event.created_at));
    
    IF v_latest_timer_event.event_type IN ('start', 'resume') THEN
      -- Timer was running - calculate remaining time at pick moment
      DECLARE
        v_remaining_at_pick INTEGER;
      BEGIN
        v_remaining_at_pick := v_latest_timer_event.seconds_remaining - v_time_elapsed;
        
        IF v_remaining_at_pick < 0 THEN
          -- Overtime: pick_seconds + abs(remaining_time)
          v_calculated_time := v_draft_pick_seconds + (v_remaining_at_pick * -1);
        ELSE
          -- Normal time: pick_seconds - remaining_time
          v_calculated_time := v_draft_pick_seconds - v_remaining_at_pick;
        END IF;
      END;
    ELSE
      -- Timer was paused/stopped - assume full time was used
      v_calculated_time := v_draft_pick_seconds;
    END IF;
  ELSE
    -- No timer events found - assume full time was used
    v_calculated_time := v_draft_pick_seconds;
  END IF;

  -- Ensure calculated time is not negative (minimum 0 seconds)
  v_calculated_time := GREATEST(v_calculated_time, 0);

  -- Update the pick with timing information
  UPDATE picks
  SET 
    player_id = p_player_id, 
    is_picked = true, 
    picked_by = p_picked_by,
    pick_time_seconds = v_calculated_time
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
    SET 
      current_pick = v_next_pick,
      is_paused = CASE 
        WHEN v_next_pick > total_picks THEN true 
        ELSE is_paused 
      END
    WHERE id = p_draft_id;
  END IF;

  -- Check if all picks have been made
  SELECT total_picks, COUNT(*) FILTER (WHERE is_picked = true)
  INTO v_total_picks, v_picked_count
  FROM drafts d
  JOIN picks p ON d.id = p.draft_id
  WHERE d.id = p_draft_id
  GROUP BY d.id, d.total_picks;

  -- If all picks have been made, set the draft status to 'completed' and pause timer
  IF v_picked_count = v_total_picks THEN
    UPDATE drafts
    SET 
      status = 'completed',
      is_paused = true
    WHERE id = p_draft_id;
  END IF;

  -- Create a timer event to record the pick and potentially start next timer
  IF v_next_pick IS NOT NULL AND v_next_pick <= v_total_picks THEN
    -- Insert timer reset/start event for next pick
    INSERT INTO draft_timer_events (
      draft_id, 
      event_type, 
      pick_id, 
      seconds_remaining, 
      original_duration,
      triggered_by,
      metadata
    ) VALUES (
      p_draft_id,
      'start', -- Reset timer for next pick
      v_next_pick, -- Next pick ID would need to be calculated
      v_draft_pick_seconds,
      v_draft_pick_seconds,
      'system',
      jsonb_build_object(
        'previous_pick_id', p_pick_id,
        'pick_time_taken', v_calculated_time
      )
    );
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Pick submitted successfully',
    'pick_time_seconds', v_calculated_time
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