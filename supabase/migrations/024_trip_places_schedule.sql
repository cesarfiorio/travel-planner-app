-- Per-stop schedule on itinerary (local time-of-day as HH:MM, duration in minutes).
ALTER TABLE public.trip_places
  ADD COLUMN IF NOT EXISTS start_time_local TEXT,
  ADD COLUMN IF NOT EXISTS duration_minutes INT;

ALTER TABLE public.trip_places DROP CONSTRAINT IF EXISTS trip_places_duration_minutes_check;
ALTER TABLE public.trip_places
  ADD CONSTRAINT trip_places_duration_minutes_check
  CHECK (duration_minutes IS NULL OR duration_minutes > 0);

COMMENT ON COLUMN public.trip_places.start_time_local IS 'Local wall-clock time for this stop, 24h HH:MM (trip-local)';
COMMENT ON COLUMN public.trip_places.duration_minutes IS 'Planned time at stop in minutes';
