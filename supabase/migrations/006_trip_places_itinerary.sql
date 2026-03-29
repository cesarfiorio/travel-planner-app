-- Mission 3.2: itinerary day grouping, status, ordering.

ALTER TABLE public.trip_places
  ADD COLUMN IF NOT EXISTS day_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0;

UPDATE public.trip_places SET order_index = sort_order;

ALTER TABLE public.trip_places DROP CONSTRAINT IF EXISTS trip_places_status_check;
ALTER TABLE public.trip_places
  ADD CONSTRAINT trip_places_status_check CHECK (status IN ('planned', 'visited', 'skipped'));

CREATE INDEX IF NOT EXISTS idx_trip_places_trip_day_order ON public.trip_places (trip_id, day_number, order_index);
