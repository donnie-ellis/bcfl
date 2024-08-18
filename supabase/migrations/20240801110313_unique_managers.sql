-- Migration: Add unique constraint to managers.guid

-- Add the unique constraint
ALTER TABLE public.managers
ADD CONSTRAINT managers_guid_key UNIQUE (guid);

-- In case the operation fails due to duplicate values, you can use this command to find duplicates:
-- SELECT guid, COUNT(*) FROM public.managers GROUP BY guid HAVING COUNT(*) > 1;

-- If there are duplicates, you'll need to handle them before adding the constraint.
-- Here's an example of how you might handle duplicates (adjust as needed):
-- WITH duplicates AS (
--   SELECT guid, MIN(id) as min_id
--   FROM public.managers
--   GROUP BY guid
--   HAVING COUNT(*) > 1
-- )
-- DELETE FROM public.managers
-- WHERE id IN (
--   SELECT m.id
--   FROM public.managers m
--   JOIN duplicates d ON m.guid = d.guid
--   WHERE m.id != d.min_id
-- );

-- After handling duplicates (if any), retry adding the unique constraint
-- ALTER TABLE public.managers
-- ADD CONSTRAINT managers_guid_key UNIQUE (guid);