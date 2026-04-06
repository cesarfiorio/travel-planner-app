-- Voting & reputation: saves, used, score columns, triggers

-- 1) route_saves
CREATE TABLE IF NOT EXISTS public.route_saves (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.community_routes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, route_id)
);
ALTER TABLE public.route_saves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "route_saves_select" ON public.route_saves;
DROP POLICY IF EXISTS "route_saves_insert" ON public.route_saves;
DROP POLICY IF EXISTS "route_saves_delete" ON public.route_saves;
CREATE POLICY "route_saves_select" ON public.route_saves FOR SELECT TO authenticated USING (true);
CREATE POLICY "route_saves_insert" ON public.route_saves FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "route_saves_delete" ON public.route_saves FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 2) route_used
CREATE TABLE IF NOT EXISTS public.route_used (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.community_routes(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, route_id)
);
ALTER TABLE public.route_used ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "route_used_select" ON public.route_used;
DROP POLICY IF EXISTS "route_used_insert" ON public.route_used;
CREATE POLICY "route_used_select" ON public.route_used FOR SELECT TO authenticated USING (true);
CREATE POLICY "route_used_insert" ON public.route_used FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 3) New columns on community_routes
ALTER TABLE public.community_routes
  ADD COLUMN IF NOT EXISTS saves_count INT4 NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS used_count INT4 NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score FLOAT8 NOT NULL DEFAULT 0;

-- 4) Score recalculation function
CREATE OR REPLACE FUNCTION public.routeflow_recalc_route_score(p_route_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_likes int4;
  v_saves int4;
  v_used  int4;
  v_pub   timestamptz;
  v_bonus float8;
  v_score float8;
BEGIN
  SELECT likes_count, saves_count, used_count, published_at
    INTO v_likes, v_saves, v_used, v_pub
    FROM public.community_routes
   WHERE id = p_route_id;

  IF NOT FOUND THEN RETURN; END IF;

  v_bonus := CASE
    WHEN v_pub > now() - interval '7 days' THEN 15
    WHEN v_pub > now() - interval '30 days' THEN 5
    ELSE 0
  END;

  v_score := (COALESCE(v_likes,0) * 1) + (COALESCE(v_saves,0) * 3) + (COALESCE(v_used,0) * 10) + v_bonus;

  UPDATE public.community_routes SET score = v_score WHERE id = p_route_id;
END;
$$;

-- 5) Triggers: likes
CREATE OR REPLACE FUNCTION public.trg_route_likes_inc() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.community_routes SET likes_count = likes_count + 1 WHERE id = NEW.route_id;
  PERFORM public.routeflow_recalc_route_score(NEW.route_id);
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.trg_route_likes_dec() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.community_routes SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.route_id;
  PERFORM public.routeflow_recalc_route_score(OLD.route_id);
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS route_likes_after_insert ON public.community_route_likes;
CREATE TRIGGER route_likes_after_insert AFTER INSERT ON public.community_route_likes FOR EACH ROW EXECUTE FUNCTION public.trg_route_likes_inc();
DROP TRIGGER IF EXISTS route_likes_after_delete ON public.community_route_likes;
CREATE TRIGGER route_likes_after_delete AFTER DELETE ON public.community_route_likes FOR EACH ROW EXECUTE FUNCTION public.trg_route_likes_dec();

-- 6) Triggers: saves
CREATE OR REPLACE FUNCTION public.trg_route_saves_inc() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.community_routes SET saves_count = saves_count + 1 WHERE id = NEW.route_id;
  PERFORM public.routeflow_recalc_route_score(NEW.route_id);
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.trg_route_saves_dec() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.community_routes SET saves_count = GREATEST(saves_count - 1, 0) WHERE id = OLD.route_id;
  PERFORM public.routeflow_recalc_route_score(OLD.route_id);
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS route_saves_after_insert ON public.route_saves;
CREATE TRIGGER route_saves_after_insert AFTER INSERT ON public.route_saves FOR EACH ROW EXECUTE FUNCTION public.trg_route_saves_inc();
DROP TRIGGER IF EXISTS route_saves_after_delete ON public.route_saves;
CREATE TRIGGER route_saves_after_delete AFTER DELETE ON public.route_saves FOR EACH ROW EXECUTE FUNCTION public.trg_route_saves_dec();

-- 7) Triggers: used
CREATE OR REPLACE FUNCTION public.trg_route_used_inc() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.community_routes SET used_count = used_count + 1 WHERE id = NEW.route_id;
  PERFORM public.routeflow_recalc_route_score(NEW.route_id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS route_used_after_insert ON public.route_used;
CREATE TRIGGER route_used_after_insert AFTER INSERT ON public.route_used FOR EACH ROW EXECUTE FUNCTION public.trg_route_used_inc();

-- 8) Backfill score for existing routes
UPDATE public.community_routes SET score = (COALESCE(likes_count,0) * 1) + (COALESCE(saves_count,0) * 3) + (COALESCE(used_count,0) * 10) +
  CASE WHEN published_at > now() - interval '7 days' THEN 15 WHEN published_at > now() - interval '30 days' THEN 5 ELSE 0 END;
