-- Step 1: Drop foreign key constraints
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_league_id_fkey;
ALTER TABLE drafts DROP CONSTRAINT IF EXISTS drafts_league_id_fkey;

-- Step 2: Alter leagues table
ALTER TABLE leagues 
DROP CONSTRAINT leagues_pkey,
ADD COLUMN temp_id SERIAL PRIMARY KEY,
ALTER COLUMN league_key TYPE VARCHAR(255),
ALTER COLUMN league_id TYPE VARCHAR(255);

-- Step 3: Update related tables
ALTER TABLE teams
ALTER COLUMN league_id TYPE VARCHAR(255);

ALTER TABLE drafts
ALTER COLUMN league_id TYPE VARCHAR(255);

-- Step 4: Copy data from league_id to league_key if necessary
-- You may need to run this if league_key is empty and league_id contains the Yahoo league key
UPDATE leagues SET league_key = league_id WHERE league_key IS NULL OR league_key = '';

-- Step 5: Set league_key as primary key
ALTER TABLE leagues
DROP CONSTRAINT leagues_pkey,
ADD PRIMARY KEY (league_key),
DROP COLUMN temp_id;

-- Step 6: Re-add foreign key constraints
ALTER TABLE teams
ADD CONSTRAINT teams_league_key_fkey FOREIGN KEY (league_id) REFERENCES leagues(league_key);

ALTER TABLE drafts
ADD CONSTRAINT drafts_league_key_fkey FOREIGN KEY (league_id) REFERENCES leagues(league_key);

-- Step 7: Create index on league_id for potential lookups
CREATE INDEX idx_leagues_league_id ON leagues(league_id);