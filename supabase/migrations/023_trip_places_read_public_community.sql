-- Allow any signed-in user to read itinerary rows for trips that are published
-- on the community feed (so shared routes can show the real day-by-day schedule).

CREATE POLICY "trip_places_select_public_community_source"
  ON public.trip_places FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.community_routes cr
      WHERE cr.trip_id = trip_places.trip_id
        AND cr.is_public IS TRUE
        AND cr.trip_id IS NOT NULL
    )
  );
