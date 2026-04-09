-- ranked_routes used `SELECT cr.*, ... AS score` before community_routes gained a `score`
-- column (013). Expanding cr.* then duplicates `score`, which breaks the view / PostgREST.
-- List columns explicitly and expose a single feed `score` (likes + recency bonus).
--
-- Must DROP first: PostgreSQL does not allow CREATE OR REPLACE VIEW to change column
-- names/order vs the existing view (ERROR 42P16).

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
WHERE cr.is_public = true;

GRANT SELECT ON public.ranked_routes TO authenticated;
