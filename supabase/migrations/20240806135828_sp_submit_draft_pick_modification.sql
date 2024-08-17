CREATE OR REPLACE FUNCTION public.submit_draft_pick(
  p_draft_id INTEGER,
  p_pick_id INTEGER,
  p_player_id INTEGER,
  p_picked_by TEXT
)
RETURNS VOID AS $$
DECLARE
  v_current_pick INT;
  v_total_picks INT;
  v_pick_number INT;
  v_next_pick INT;
BEGIN
  -- Start transaction
  BEGIN
    -- Get the current pick, total picks, and pick number for the draft
    SELECT d.current_pick, d.total_picks, p.total_pick_number
    INTO v_current_pick, v_total_picks, v_pick_number
    FROM drafts d
    JOIN picks p ON p.draft_id = d.id
    WHERE d.id = p_draft_id AND p.id = p_pick_id;

    -- Update the pick
    UPDATE picks
    SET player_id = p_player_id, is_picked = true, picked_by = p_picked_by
    WHERE id = p_pick_id AND draft_id = p_draft_id;

    -- Update the draft_players table
    INSERT INTO draft_players (draft_id, player_id, is_picked)
    VALUES (p_draft_id, p_player_id, true)
    ON CONFLICT (draft_id, player_id) 
    DO UPDATE SET is_picked = true;

    -- If the pick being made is the current pick, find the next unpicked slot
    IF v_pick_number = v_current_pick THEN
      SELECT MIN(total_pick_number)
      INTO v_next_pick
      FROM picks
      WHERE draft_id = p_draft_id
        AND is_picked = false
        AND total_pick_number > v_current_pick;

      -- If there are no more unpicked slots, set to total_picks + 1
      IF v_next_pick IS NULL THEN
        v_next_pick := v_total_picks + 1;
      END IF;

      -- Update the current pick
      UPDATE drafts
      SET current_pick = v_next_pick
      WHERE id = p_draft_id;
    END IF;

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