-- RevenueCat sync: explorer plan expiry, public app_config for founder offer window

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'plus', 'pro', 'explorer'));

CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_config_select_authenticated" ON public.app_config;
CREATE POLICY "app_config_select_authenticated"
  ON public.app_config FOR SELECT TO authenticated USING (true);

-- First 60 days from deploy: adjust in dashboard or UPDATE when you launch publicly.
INSERT INTO public.app_config (key, value) VALUES (
  'founder_offer_ends_at',
  (CURRENT_TIMESTAMP + INTERVAL '60 days')::timestamptz::text
)
ON CONFLICT (key) DO NOTHING;
