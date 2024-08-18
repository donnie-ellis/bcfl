-- Create this function in your Supabase SQL editor
CREATE OR REPLACE FUNCTION submit_draft_pick(
  p_draft_id INT,
  p_pick_id INT,
  p_player_id INT
) RETURNS VOID AS $$
DECLARE
  v_current_pick INT;
  v_total_picks INT;
BEGIN
  -- Start transaction
  BEGIN
    -- Get the current pick and total picks for the draft
    SELECT current_pick, total_picks 
    INTO v_current_pick, v_total_picks
    FROM drafts
    WHERE id = p_draft_id;

    -- Update the pick
    UPDATE picks
    SET player_id = p_player_id, is_picked = true
    WHERE id = p_pick_id AND draft_id = p_draft_id;

    -- Update the draft_players table
    INSERT INTO draft_players (draft_id, player_id, is_picked)
    VALUES (p_draft_id, p_player_id, true)
    ON CONFLICT (draft_id, player_id) 
    DO UPDATE SET is_picked = true;

    -- Increment the current pick
    UPDATE drafts
    SET current_pick = LEAST(current_pick + 1, total_picks)
    WHERE id = p_draft_id;

    -- Commit transaction
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback transaction on error
      ROLLBACK;
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql;
