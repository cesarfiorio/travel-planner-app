-- User-defined itinerary rows without a linked `places` row (e.g. "Go to my friend's house").
ALTER TABLE public.trip_places
  ADD COLUMN IF NOT EXISTS custom_title TEXT;

ALTER TABLE public.trip_places
  ALTER COLUMN place_id DROP NOT NULL;

ALTER TABLE public.trip_places DROP CONSTRAINT IF EXISTS trip_places_place_or_custom_check;
ALTER TABLE public.trip_places
  ADD CONSTRAINT trip_places_place_or_custom_check
  CHECK (
    place_id IS NOT NULL
    OR (custom_title IS NOT NULL AND btrim(custom_title) <> '')
  );

COMMENT ON COLUMN public.trip_places.custom_title IS 'Shown when place_id is null; user-defined activity label';
