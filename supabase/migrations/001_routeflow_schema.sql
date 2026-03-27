-- RouteFlow: full schema, RLS, and auth trigger
-- Run this entire file once in Supabase SQL Editor (PostgreSQL).

-- =============================================================================
-- Step 1: Extensions
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- Step 2: Tables (10)
-- =============================================================================

-- 1) profiles — one row per auth user
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) trips — group trips
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  destination_label TEXT,
  start_date DATE,
  end_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) trip_members — membership + role
CREATE TABLE public.trip_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, user_id)
);

-- 4) expenses — trip expenses (Splitwise-style header)
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  paid_by_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  category TEXT,
  expense_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) expense_splits — who owes what for an expense
CREATE TABLE public.expense_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES public.expenses (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  amount_owed NUMERIC(14, 2) NOT NULL CHECK (amount_owed >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (expense_id, user_id)
);

-- 6) places — cached Google Places (or manual POIs)
CREATE TABLE public.places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_place_id TEXT UNIQUE,
  name TEXT NOT NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  formatted_address TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7) trip_places — places attached to a trip (itinerary pins)
CREATE TABLE public.trip_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES public.places (id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, place_id)
);

-- 8) community_routes — shared routes (optional link to a trip)
CREATE TABLE public.community_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  route_geojson JSONB,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9) place_reviews — user reviews for a place
CREATE TABLE public.place_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id UUID NOT NULL REFERENCES public.places (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (place_id, user_id)
);

-- 10) notifications — inbox per user
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX idx_trip_members_trip_id ON public.trip_members (trip_id);
CREATE INDEX idx_trip_members_user_id ON public.trip_members (user_id);
CREATE INDEX idx_expenses_trip_id ON public.expenses (trip_id);
CREATE INDEX idx_expense_splits_expense_id ON public.expense_splits (expense_id);
CREATE INDEX idx_trip_places_trip_id ON public.trip_places (trip_id);
CREATE INDEX idx_community_routes_creator_id ON public.community_routes (creator_id);
CREATE INDEX idx_place_reviews_place_id ON public.place_reviews (place_id);
CREATE INDEX idx_notifications_user_id ON public.notifications (user_id);

CREATE INDEX idx_places_name_trgm ON public.places USING gin (name gin_trgm_ops);

-- =============================================================================
-- Step 3: Row Level Security — enable on all tables
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- -----------------------------------------------------------------------------
-- trips — visible to members (or creator before any member row exists)
-- -----------------------------------------------------------------------------
CREATE POLICY "trips_select_visible"
  ON public.trips FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trips.id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "trips_insert_own"
  ON public.trips FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "trips_update_owner"
  ON public.trips FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trips.id AND tm.user_id = auth.uid() AND tm.role = 'owner'
    )
  );

CREATE POLICY "trips_delete_creator"
  ON public.trips FOR DELETE TO authenticated USING (created_by = auth.uid());

-- -----------------------------------------------------------------------------
-- trip_members
-- -----------------------------------------------------------------------------
CREATE POLICY "trip_members_select_visible"
  ON public.trip_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trip_members.trip_id AND tm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_members.trip_id AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "trip_members_insert"
  ON public.trip_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.trips t
        WHERE t.id = trip_id AND t.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.trip_members tm
        WHERE tm.trip_id = trip_id AND tm.user_id = auth.uid() AND tm.role = 'owner'
      )
    )
  );

CREATE POLICY "trip_members_delete_owner_or_self"
  ON public.trip_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trip_members.trip_id AND tm.user_id = auth.uid() AND tm.role = 'owner'
    )
  );

-- -----------------------------------------------------------------------------
-- expenses — trip members only
-- -----------------------------------------------------------------------------
CREATE POLICY "expenses_select_trip_member"
  ON public.expenses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = expenses.trip_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "expenses_insert_trip_member"
  ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trip_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "expenses_update_trip_member"
  ON public.expenses FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = expenses.trip_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "expenses_delete_trip_member"
  ON public.expenses FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = expenses.trip_id AND tm.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- expense_splits — via parent expense trip membership
-- -----------------------------------------------------------------------------
CREATE POLICY "expense_splits_select"
  ON public.expense_splits FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.trip_members tm ON tm.trip_id = e.trip_id
      WHERE e.id = expense_splits.expense_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "expense_splits_insert"
  ON public.expense_splits FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.trip_members tm ON tm.trip_id = e.trip_id
      WHERE e.id = expense_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "expense_splits_update"
  ON public.expense_splits FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.trip_members tm ON tm.trip_id = e.trip_id
      WHERE e.id = expense_splits.expense_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "expense_splits_delete"
  ON public.expense_splits FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.trip_members tm ON tm.trip_id = e.trip_id
      WHERE e.id = expense_splits.expense_id AND tm.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- places — shared cache: read/write for any signed-in user
-- -----------------------------------------------------------------------------
CREATE POLICY "places_select_authenticated"
  ON public.places FOR SELECT TO authenticated USING (true);

CREATE POLICY "places_insert_authenticated"
  ON public.places FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "places_update_authenticated"
  ON public.places FOR UPDATE TO authenticated USING (true);

-- -----------------------------------------------------------------------------
-- trip_places — trip members
-- -----------------------------------------------------------------------------
CREATE POLICY "trip_places_select"
  ON public.trip_places FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trip_places.trip_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_places_insert"
  ON public.trip_places FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trip_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_places_update"
  ON public.trip_places FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trip_places.trip_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_places_delete"
  ON public.trip_places FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trip_places.trip_id AND tm.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- community_routes
-- -----------------------------------------------------------------------------
CREATE POLICY "community_routes_select"
  ON public.community_routes FOR SELECT TO authenticated
  USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "community_routes_insert"
  ON public.community_routes FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());

CREATE POLICY "community_routes_update"
  ON public.community_routes FOR UPDATE TO authenticated
  USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

CREATE POLICY "community_routes_delete"
  ON public.community_routes FOR DELETE TO authenticated USING (creator_id = auth.uid());

-- -----------------------------------------------------------------------------
-- place_reviews
-- -----------------------------------------------------------------------------
CREATE POLICY "place_reviews_select"
  ON public.place_reviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "place_reviews_insert"
  ON public.place_reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "place_reviews_update"
  ON public.place_reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "place_reviews_delete"
  ON public.place_reviews FOR DELETE TO authenticated USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- notifications — only the recipient
-- -----------------------------------------------------------------------------
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_own"
  ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- =============================================================================
-- Step 4: handle_new_user — auto-create profile on signup
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- =============================================================================
-- Step 5 (manual verification in SQL Editor) — expect 0 rows, no errors:
-- SELECT * FROM public.profiles LIMIT 1;
-- SELECT * FROM public.trips LIMIT 1;
-- SELECT * FROM public.trip_members LIMIT 1;
-- SELECT * FROM public.expenses LIMIT 1;
-- SELECT * FROM public.expense_splits LIMIT 1;
-- SELECT * FROM public.places LIMIT 1;
-- SELECT * FROM public.trip_places LIMIT 1;
-- SELECT * FROM public.community_routes LIMIT 1;
-- SELECT * FROM public.place_reviews LIMIT 1;
-- SELECT * FROM public.notifications LIMIT 1;
-- =============================================================================
