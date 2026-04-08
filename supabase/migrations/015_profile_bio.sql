-- Optional bio / "about me" on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT;
