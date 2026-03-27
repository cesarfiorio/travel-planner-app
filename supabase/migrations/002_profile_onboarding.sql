-- Profile onboarding fields, subscription plan, trip lifecycle status
-- Run once in Supabase SQL Editor after 001_routeflow_schema.sql

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'plus', 'pro'));

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips (status);
