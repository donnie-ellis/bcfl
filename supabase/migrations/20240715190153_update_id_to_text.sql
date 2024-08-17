-- Step 1: Drop the foreign key constraint
ALTER TABLE sessions
DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;

-- Step 2: Modify users table
ALTER TABLE users
ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Step 3: Modify sessions table
ALTER TABLE sessions
ALTER COLUMN id TYPE TEXT USING id::TEXT,
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Step 4: Recreate the foreign key constraint
ALTER TABLE sessions
ADD CONSTRAINT sessions_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE;

-- Optional: If you have any indexes on these columns, you may need to recreate them
-- For example:
-- DROP INDEX IF EXISTS sessions_user_id_idx;
-- CREATE INDEX sessions_user_id_idx ON sessions(user_id);