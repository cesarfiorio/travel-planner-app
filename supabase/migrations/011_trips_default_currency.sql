-- Add a default_currency column so every trip can store the preferred currency.
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS default_currency TEXT NOT NULL DEFAULT 'USD';
