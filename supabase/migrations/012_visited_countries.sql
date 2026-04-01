-- Scratch-map: track which countries each user has visited.
CREATE TABLE IF NOT EXISTS public.visited_countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  first_visit_date DATE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, country_code)
);

ALTER TABLE public.visited_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visited_countries_select_own"
  ON public.visited_countries FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "visited_countries_insert_own"
  ON public.visited_countries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "visited_countries_update_own"
  ON public.visited_countries FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "visited_countries_delete_own"
  ON public.visited_countries FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_visited_countries_user ON public.visited_countries(user_id);
