-- Add accommodation recap fields to trip memories.

ALTER TABLE public.trip_memories
  ADD COLUMN IF NOT EXISTS hotel_names TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_rating INT CHECK (
    accommodation_rating IS NULL OR (accommodation_rating >= 1 AND accommodation_rating <= 10)
  );

ALTER TABLE public.community_routes
  ADD COLUMN IF NOT EXISTS hotel_names TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_rating INT CHECK (
    accommodation_rating IS NULL OR (accommodation_rating >= 1 AND accommodation_rating <= 10)
  );
