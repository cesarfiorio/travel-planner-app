-- One community_routes row per trip (trip-linked publishes only).
-- Removes older duplicates; keeps the row with latest activity timestamp.

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY trip_id
      ORDER BY
        COALESCE(published_at, updated_at, created_at) DESC NULLS LAST,
        updated_at DESC NULLS LAST,
        id DESC
    ) AS rn
  FROM public.community_routes
  WHERE trip_id IS NOT NULL
)
DELETE FROM public.community_routes r
WHERE r.id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_routes_one_per_trip
  ON public.community_routes (trip_id)
  WHERE trip_id IS NOT NULL;
