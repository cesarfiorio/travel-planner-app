-- Fix infinite recursion between trips and trip_members RLS policies.
-- The old trip_members SELECT policy queried trip_members again inside EXISTS, which
-- re-entered the same policy. PostgREST then fails reads (e.g. Explore "Could not load trips").
-- Run once in Supabase SQL Editor after 001 and 002.

CREATE OR REPLACE FUNCTION public.routeflow_user_is_trip_member(p_trip_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = p_trip_id AND tm.user_id = p_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.routeflow_user_is_trip_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.routeflow_user_is_trip_member(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.routeflow_user_is_trip_owner_member(p_trip_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = p_trip_id AND tm.user_id = p_user_id AND tm.role = 'owner'
  );
$$;

REVOKE ALL ON FUNCTION public.routeflow_user_is_trip_owner_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.routeflow_user_is_trip_owner_member(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "trips_select_visible" ON public.trips;
CREATE POLICY "trips_select_visible"
  ON public.trips FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.routeflow_user_is_trip_member(id, auth.uid())
  );

DROP POLICY IF EXISTS "trips_update_owner" ON public.trips;
CREATE POLICY "trips_update_owner"
  ON public.trips FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.routeflow_user_is_trip_owner_member(id, auth.uid())
  );

DROP POLICY IF EXISTS "trip_members_select_visible" ON public.trip_members;
CREATE POLICY "trip_members_select_visible"
  ON public.trip_members FOR SELECT TO authenticated
  USING (public.routeflow_user_is_trip_member(trip_id, auth.uid()));

DROP POLICY IF EXISTS "trip_members_insert" ON public.trip_members;
CREATE POLICY "trip_members_insert"
  ON public.trip_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.trips t
        WHERE t.id = trip_id AND t.created_by = auth.uid()
      )
      OR public.routeflow_user_is_trip_owner_member(trip_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "trip_members_delete_owner_or_self" ON public.trip_members;
CREATE POLICY "trip_members_delete_owner_or_self"
  ON public.trip_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.routeflow_user_is_trip_owner_member(trip_id, auth.uid())
  );
