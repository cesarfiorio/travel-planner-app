-- community_route_likes had two pairs of AFTER INSERT/DELETE triggers (009 + 013),
-- both incrementing/decrementing likes_count — each user like changed the count by 2.
-- Keep 013's triggers (likes_count + score recalc); drop the legacy 009 pair.

DROP TRIGGER IF EXISTS tr_community_route_likes_ins ON public.community_route_likes;
DROP TRIGGER IF EXISTS tr_community_route_likes_del ON public.community_route_likes;

-- Ground truth: one row per user per route (UNIQUE route_id, user_id).
UPDATE public.community_routes cr
SET likes_count = (
  SELECT COUNT(*)::int FROM public.community_route_likes l WHERE l.route_id = cr.id
);

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.community_routes LOOP
    PERFORM public.routeflow_recalc_route_score(r.id);
  END LOOP;
END $$;
