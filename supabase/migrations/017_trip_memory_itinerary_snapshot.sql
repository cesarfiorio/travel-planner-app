-- Persist a copy of the user's itinerary on trip memory (for display/history + community route)
ALTER TABLE public.trip_memories
  ADD COLUMN IF NOT EXISTS itinerary_snapshot jsonb DEFAULT NULL;
