-- Legacy: deleting a trip set community_routes.trip_id to NULL, leaving ghost feed rows.
-- Remove those rows and any rows whose trip no longer exists (should not happen with FK on).

DELETE FROM public.community_routes cr
WHERE cr.trip_id IS NULL
   OR NOT EXISTS (SELECT 1 FROM public.trips t WHERE t.id = cr.trip_id);

-- Feed should only list routes still tied to a real trip (trip-backed publishes only).

DROP VIEW IF EXISTS public.ranked_routes;

CREATE VIEW public.ranked_routes AS
SELECT
  cr.id,
  cr.creator_id,
  cr.trip_id,
  cr.title,
  cr.description,
  cr.route_geojson,
  cr.is_public,
  cr.created_at,
  cr.updated_at,
  cr.destination,
  cr.tip,
  cr.tags,
  cr.travel_style,
  cr.likes_count,
  cr.published_at,
  cr.duration_days,
  cr.saves_count,
  cr.used_count,
  cr.cover_photo_url,
  (COALESCE(cr.likes_count, 0) * 3)
    + CASE
        WHEN cr.published_at IS NOT NULL AND cr.published_at > now() - interval '7 days' THEN 10
        WHEN cr.published_at IS NOT NULL AND cr.published_at > now() - interval '30 days' THEN 5
        ELSE 0
      END AS score
FROM public.community_routes cr
WHERE cr.is_public = true
  AND cr.trip_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.trips t WHERE t.id = cr.trip_id);

GRANT SELECT ON public.ranked_routes TO authenticated;
