-- Migration to disable RLS on import_jobs table

-- Disable RLS on the import_jobs table
ALTER TABLE public.import_jobs DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.import_jobs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.import_jobs;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.import_jobs;

-- Optionally, you can grant direct access to roles that need it
GRANT ALL ON public.import_jobs TO authenticated;
GRANT ALL ON public.import_jobs TO service_role;

-- If you want anon to have read access, uncomment the following line:
-- GRANT SELECT ON public.import_jobs TO anon;