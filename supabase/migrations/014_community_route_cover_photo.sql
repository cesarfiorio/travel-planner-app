-- Optional hero image for community feed cards (ranked_routes view uses cr.*)
ALTER TABLE public.community_routes
  ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;
