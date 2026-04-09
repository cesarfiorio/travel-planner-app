-- Deleting a trip (e.g. owner removes a past trip) should remove its Community listing too.
-- Previously trip_id used ON DELETE SET NULL, which left orphaned feed rows.

DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'community_routes'
    AND c.contype = 'f'
    AND pg_get_constraintdef(c.oid) LIKE '%REFERENCES trips%'
    AND pg_get_constraintdef(c.oid) LIKE '%trip_id%'
  LIMIT 1;
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.community_routes DROP CONSTRAINT %I', conname);
  END IF;
END $$;

ALTER TABLE public.community_routes
  ADD CONSTRAINT community_routes_trip_id_fkey
  FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;
