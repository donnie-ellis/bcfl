-- Step 1: Drop foreign key constraints
ALTER TABLE managers DROP CONSTRAINT IF EXISTS managers_team_id_fkey;
ALTER TABLE picks DROP CONSTRAINT IF EXISTS picks_team_id_fkey;

-- Step 2: Check if team_key column exists, if not, add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'team_key') THEN
        ALTER TABLE teams ADD COLUMN team_key TEXT;
    END IF;
END $$;

-- Step 3: Populate team_key column if it's empty
UPDATE teams SET team_key = id::text WHERE team_key IS NULL;

-- Step 4: Add unique constraint on team_key if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_team_key_key') THEN
        ALTER TABLE teams ADD CONSTRAINT teams_team_key_key UNIQUE (team_key);
    END IF;
END $$;

-- Step 5: Add team_key column to referencing tables if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'managers' AND column_name = 'team_key') THEN
        ALTER TABLE managers ADD COLUMN team_key TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'picks' AND column_name = 'team_key') THEN
        ALTER TABLE picks ADD COLUMN team_key TEXT;
    END IF;
END $$;

-- Step 6: Populate team_key in referencing tables
UPDATE managers m
SET team_key = t.team_key
FROM teams t
WHERE m.team_id = t.id AND m.team_key IS NULL;

UPDATE picks p
SET team_key = t.team_key
FROM teams t
WHERE p.team_id = t.id AND p.team_key IS NULL;

-- Step 7: Drop old team_id column from referencing tables
ALTER TABLE managers DROP COLUMN IF EXISTS team_id;
ALTER TABLE picks DROP COLUMN IF EXISTS team_id;

-- Step 8: Add new foreign key constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'managers_team_key_fkey') THEN
        ALTER TABLE managers
        ADD CONSTRAINT managers_team_key_fkey FOREIGN KEY (team_key) REFERENCES teams(team_key);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'picks_team_key_fkey') THEN
        ALTER TABLE picks
        ADD CONSTRAINT picks_team_key_fkey FOREIGN KEY (team_key) REFERENCES teams(team_key);
    END IF;
END $$;

-- Step 9: Make team_key the primary key of teams table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_pkey' AND contype = 'p' AND conrelid = 'teams'::regclass) THEN
        ALTER TABLE teams 
        DROP CONSTRAINT IF EXISTS teams_pkey,
        ADD PRIMARY KEY (team_key);
    END IF;
END $$;

-- Step 10: Drop the old id column from teams if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'id') THEN
        ALTER TABLE teams DROP COLUMN id;
    END IF;
END $$;

-- Step 11: Update the create_draft_with_picks function
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
  v_num_teams INTEGER;
BEGIN
  -- Insert the draft
  INSERT INTO drafts (league_id, name, rounds, total_picks, draft_order, status)
  VALUES (p_league_id, p_name, p_rounds, p_total_picks, p_draft_order, p_status)
  RETURNING id INTO v_draft_id;

  -- Get the number of teams
  v_num_teams := jsonb_array_length(p_ordered_teams);

  -- Create picks
  v_total_pick := 1;
  FOR v_round IN 1..p_rounds LOOP
    FOR v_pick IN 1..v_num_teams LOOP
      IF v_round % 2 = 0 THEN
        -- Even rounds: reverse order
        v_team := p_ordered_teams->>(v_num_teams - v_pick);
      ELSE
        -- Odd rounds: normal order
        v_team := p_ordered_teams->>(v_pick - 1);
      END IF;

      INSERT INTO picks (draft_id, team_key, pick_number, round_number, total_pick_number)
      VALUES (v_draft_id, (v_team->>'team_key'), v_pick, v_round, v_total_pick);

      v_total_pick := v_total_pick + 1;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT v_draft_id;
END;
$$ LANGUAGE plpgsql;