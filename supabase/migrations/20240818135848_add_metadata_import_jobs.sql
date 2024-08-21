-- Add this SQL to your migration file or run it directly on your database

ALTER TABLE import_jobs
ADD COLUMN metadata JSONB;

-- If you're using RLS (Row Level Security), don't forget to update the policies
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON import_jobs FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON import_jobs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON import_jobs FOR UPDATE USING (auth.role() = 'authenticated');