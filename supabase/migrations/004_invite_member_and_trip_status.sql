-- Mission 2.2: resolve invitee by email (service_role only) + trip lifecycle statuses.

-- -----------------------------------------------------------------------------
-- Lookup auth user id by email (Edge Functions with service role only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.routeflow_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT u.id
  FROM auth.users u
  WHERE lower(trim(u.email::text)) = lower(trim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.routeflow_user_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.routeflow_user_id_by_email(text) TO service_role;

-- -----------------------------------------------------------------------------
-- Trip status: planning → active → completed (+ cancelled, archived)
-- -----------------------------------------------------------------------------
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_status_check;

ALTER TABLE public.trips
  ADD CONSTRAINT trips_status_check
  CHECK (status IN ('planning', 'active', 'completed', 'cancelled', 'archived'));

ALTER TABLE public.trips ALTER COLUMN status SET DEFAULT 'planning';
