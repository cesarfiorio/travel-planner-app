-- Mission 3.1: cache Google Places search results by normalized destination + category.

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS destination_normalized text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS cached_at timestamptz,
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating numeric(4, 2),
  ADD COLUMN IF NOT EXISTS price_level integer,
  ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS opening_hours jsonb,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE public.places DROP CONSTRAINT IF EXISTS places_category_check;
ALTER TABLE public.places
  ADD CONSTRAINT places_category_check CHECK (
    category IS NULL
    OR category IN (
      'restaurants',
      'attractions',
      'outdoor',
      'nightlife',
      'shopping',
      'accommodation'
    )
  );

CREATE INDEX IF NOT EXISTS idx_places_dest_cat ON public.places (destination_normalized, category);

CREATE INDEX IF NOT EXISTS idx_places_dest_cat_cached ON public.places (destination_normalized, category, cached_at);

-- Batch increment views_count on cache hits (Edge Function, service_role only).
CREATE OR REPLACE FUNCTION public.routeflow_increment_places_views(p_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.places
  SET views_count = views_count + 1
  WHERE id = ANY(p_ids);
$$;

REVOKE ALL ON FUNCTION public.routeflow_increment_places_views(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.routeflow_increment_places_views(uuid[]) TO service_role;
