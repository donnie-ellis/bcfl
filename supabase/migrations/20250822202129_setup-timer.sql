-- Migration: Add draft timer functionality
-- Add timer columns to drafts table

ALTER TABLE public.drafts 
ADD COLUMN use_timer boolean DEFAULT false,
ADD COLUMN is_paused boolean DEFAULT true,
ADD COLUMN pick_seconds integer DEFAULT 90;

-- Add pick timing column to picks table
ALTER TABLE public.picks 
ADD COLUMN pick_time_seconds integer;

-- Add comments for clarity
COMMENT ON COLUMN public.drafts.use_timer IS 'Whether this draft uses a pick timer';
COMMENT ON COLUMN public.drafts.is_paused IS 'Whether the timer is currently paused';
COMMENT ON COLUMN public.drafts.pick_seconds IS 'Number of seconds allowed per pick';
COMMENT ON COLUMN public.picks.pick_time_seconds IS 'Total time taken for pick in seconds - values over pick_seconds indicate overtime';

-- Create index for timer-related queries
CREATE INDEX idx_drafts_timer_active ON public.drafts (id) WHERE use_timer = true AND is_paused = false;

-- Create function to update pick timing when a pick is submitted
CREATE OR REPLACE FUNCTION public.record_pick_timing()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only record timing for picks that are being marked as picked
  IF NEW.is_picked = true AND OLD.is_picked = false THEN
    -- You'll need to pass the actual time_remaining from your client
    -- For now, we'll just ensure the column exists
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update timing when picks are made
CREATE OR REPLACE TRIGGER update_pick_timing
  BEFORE UPDATE ON public.picks
  FOR EACH ROW
  EXECUTE FUNCTION public.record_pick_timing();

-- Enhanced submit_draft_pick function with timing
CREATE OR REPLACE FUNCTION public.submit_draft_pick_with_timing(
  p_draft_id integer, 
  p_pick_id integer, 
  p_player_id integer, 
  p_picked_by text,
  p_time_remaining integer DEFAULT NULL
) 
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_pick RECORD;
  v_next_pick INTEGER;
  v_result JSONB;
  v_total_picks INTEGER;
  v_picked_count INTEGER;
  v_draft_pick_seconds INTEGER;
  v_calculated_time INTEGER;
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

  -- Calculate the actual time taken for the pick
  -- If time_remaining is negative, it means overtime, so add the absolute value to pick_seconds
  -- If time_remaining is positive, subtract it from pick_seconds to get time taken
  IF p_time_remaining IS NOT NULL THEN
    IF p_time_remaining < 0 THEN
      -- Overtime: pick_seconds + abs(time_remaining)
      v_calculated_time := v_draft_pick_seconds + (p_time_remaining * -1);
    ELSE
      -- Normal time: pick_seconds - time_remaining
      v_calculated_time := v_draft_pick_seconds - p_time_remaining;
    END IF;
  ELSE
    -- If no time provided, default to the full pick_seconds (assumes time expired)
    v_calculated_time := v_draft_pick_seconds;
  END IF;

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

    -- Update the current pick and reset timer pause state
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

-- Grant permissions
GRANT ALL ON FUNCTION public.record_pick_timing() TO anon;
GRANT ALL ON FUNCTION public.record_pick_timing() TO authenticated;
GRANT ALL ON FUNCTION public.record_pick_timing() TO service_role;

GRANT ALL ON FUNCTION public.submit_draft_pick_with_timing(integer, integer, integer, text, integer) TO anon;
GRANT ALL ON FUNCTION public.submit_draft_pick_with_timing(integer, integer, integer, text, integer) TO authenticated;
GRANT ALL ON FUNCTION public.submit_draft_pick_with_timing(integer, integer, integer, text, integer) TO service_role;