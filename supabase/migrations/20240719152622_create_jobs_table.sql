-- Migration: Create import_jobs table

CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY,
    status VARCHAR(20) NOT NULL,
    progress INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on the status column for faster queries
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);

-- Create or replace the update_modified_column function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at column
DROP TRIGGER IF EXISTS update_import_jobs_modtime ON import_jobs;

CREATE TRIGGER update_import_jobs_modtime
BEFORE UPDATE ON import_jobs
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();