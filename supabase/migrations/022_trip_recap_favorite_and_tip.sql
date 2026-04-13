-- Trip recap: optional favorite stop override; longer community tips on recap.

ALTER TABLE public.trip_memories
  ADD COLUMN IF NOT EXISTS favorite_place_id UUID REFERENCES public.places (id) ON DELETE SET NULL;

ALTER TABLE public.community_routes DROP CONSTRAINT IF EXISTS community_routes_tip_len_check;
ALTER TABLE public.community_routes
  ADD CONSTRAINT community_routes_tip_len_check CHECK (tip IS NULL OR char_length(tip) <= 600);
