-- Mission 5.1: community route publishing, likes, trip memories, ranked feed view

-- -----------------------------------------------------------------------------
-- community_routes: publishing fields
-- -----------------------------------------------------------------------------
ALTER TABLE public.community_routes
  ADD COLUMN IF NOT EXISTS destination TEXT,
  ADD COLUMN IF NOT EXISTS tip TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS travel_style TEXT,
  ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_days INT;

ALTER TABLE public.community_routes DROP CONSTRAINT IF EXISTS community_routes_travel_style_check;
ALTER TABLE public.community_routes
  ADD CONSTRAINT community_routes_travel_style_check CHECK (
    travel_style IS NULL OR travel_style IN ('solo', 'couple', 'family', 'group', 'backpacker')
  );

ALTER TABLE public.community_routes DROP CONSTRAINT IF EXISTS community_routes_tags_len_check;
ALTER TABLE public.community_routes
  ADD CONSTRAINT community_routes_tags_len_check CHECK (
    array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 3
  );

ALTER TABLE public.community_routes DROP CONSTRAINT IF EXISTS community_routes_tip_len_check;
ALTER TABLE public.community_routes
  ADD CONSTRAINT community_routes_tip_len_check CHECK (tip IS NULL OR char_length(tip) <= 280);

CREATE INDEX IF NOT EXISTS idx_community_routes_destination_trgm
  ON public.community_routes USING gin (destination gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_community_routes_published_at ON public.community_routes (published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_community_routes_travel_style ON public.community_routes (travel_style);

-- -----------------------------------------------------------------------------
-- community_route_likes (heart count)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_route_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.community_routes (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (route_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_route_likes_route ON public.community_route_likes (route_id);

CREATE OR REPLACE FUNCTION public.sync_community_route_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_routes SET likes_count = likes_count + 1 WHERE id = NEW.route_id;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    UPDATE public.community_routes SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.route_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_community_route_likes_ins ON public.community_route_likes;
CREATE TRIGGER tr_community_route_likes_ins
  AFTER INSERT ON public.community_route_likes
  FOR EACH ROW EXECUTE PROCEDURE public.sync_community_route_likes_count();

DROP TRIGGER IF EXISTS tr_community_route_likes_del ON public.community_route_likes;
CREATE TRIGGER tr_community_route_likes_del
  AFTER DELETE ON public.community_route_likes
  FOR EACH ROW EXECUTE PROCEDURE public.sync_community_route_likes_count();

ALTER TABLE public.community_route_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_route_likes_select"
  ON public.community_route_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "community_route_likes_insert_own"
  ON public.community_route_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "community_route_likes_delete_own"
  ON public.community_route_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- trip_memories + journal
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  share_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  mood TEXT NOT NULL CHECK (mood IN ('amazing', 'great', 'good', 'mixed')),
  cover_photo_url TEXT,
  cover_place_id UUID REFERENCES public.places (id) ON DELETE SET NULL,
  places_visited INT NOT NULL DEFAULT 0,
  total_spent_cents BIGINT NOT NULL DEFAULT 0,
  travelers_count INT NOT NULL DEFAULT 0,
  destination_label TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_memories_trip_id ON public.trip_memories (trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_memories_share_token ON public.trip_memories (share_token);

CREATE TABLE IF NOT EXISTS public.trip_memory_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.trip_memories (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_memory_journal_memory ON public.trip_memory_journal_entries (memory_id);

ALTER TABLE public.trip_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_memory_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_memories_select_member"
  ON public.trip_memories FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trip_memories.trip_id AND tm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_memories.trip_id AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "trip_memories_insert_member"
  ON public.trip_memories FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.trip_members tm
        WHERE tm.trip_id = trip_memories.trip_id AND tm.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.trips t
        WHERE t.id = trip_memories.trip_id AND t.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "trip_memories_update_own"
  ON public.trip_memories FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY "trip_memories_delete_own"
  ON public.trip_memories FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "trip_memory_journal_select"
  ON public.trip_memory_journal_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_memories m
      WHERE m.id = trip_memory_journal_entries.memory_id
        AND (
          m.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.trip_members tm
            WHERE tm.trip_id = m.trip_id AND tm.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = m.trip_id AND t.created_by = auth.uid()
          )
        )
    )
  );

CREATE POLICY "trip_memory_journal_insert"
  ON public.trip_memory_journal_entries FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.trip_memories m
      WHERE m.id = trip_memory_journal_entries.memory_id
        AND (
          EXISTS (
            SELECT 1 FROM public.trip_members tm
            WHERE tm.trip_id = m.trip_id AND tm.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = m.trip_id AND t.created_by = auth.uid()
          )
        )
    )
  );

CREATE POLICY "trip_memory_journal_update_own"
  ON public.trip_memory_journal_entries FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "trip_memory_journal_delete_own"
  ON public.trip_memory_journal_entries FOR DELETE TO authenticated USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Ranked feed (order by score in the app; PG views cannot enforce ORDER BY)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.ranked_routes AS
SELECT
  cr.*,
  (COALESCE(cr.likes_count, 0) * 3)
    + CASE
        WHEN cr.published_at IS NOT NULL AND cr.published_at > now() - interval '7 days' THEN 10
        WHEN cr.published_at IS NOT NULL AND cr.published_at > now() - interval '30 days' THEN 5
        ELSE 0
      END AS score
FROM public.community_routes cr
WHERE cr.is_public = true;

GRANT SELECT ON public.ranked_routes TO authenticated;

-- -----------------------------------------------------------------------------
-- Storage: memory cover uploads (optional — create bucket if missing)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('memory-covers', 'memory-covers', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "memory_covers_public_read" ON storage.objects;
CREATE POLICY "memory_covers_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'memory-covers');

DROP POLICY IF EXISTS "memory_covers_insert_own" ON storage.objects;
CREATE POLICY "memory_covers_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'memory-covers'
    AND (storage.foldername (name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "memory_covers_update_own" ON storage.objects;
CREATE POLICY "memory_covers_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'memory-covers' AND (storage.foldername (name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "memory_covers_delete_own" ON storage.objects;
CREATE POLICY "memory_covers_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'memory-covers' AND (storage.foldername (name))[1] = auth.uid()::text);
