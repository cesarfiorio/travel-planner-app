import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { TravelStyleId } from '../community/constants';
import { uploadMemoryCover } from '../storage/uploadMemoryCover';
import { supabase } from '../supabase';
import { buildRouteGeoJson } from '../utils/routeGeoJson';
import { tripDurationDays } from '../trips/tripUi';

import { useAuth } from './useAuth';
import { communityFeedQueryKey } from './useCommunityRoutes';
import { tripMemoryQueryKey } from './useTripMemory';
import { completedTripsCountKey } from './useProfile';
import { myTripsQueryKey, tripDetailQueryKey } from './useTrips';

export type MemoryMood = 'amazing' | 'great' | 'good' | 'mixed';

export type FinishTripMode = 'publish' | 'complete_only';

export type FinishTripInput = {
  mode: FinishTripMode;
  tripId: string;
  tripName: string;
  destinationLabel: string | null;
  startDate: string | null;
  endDate: string | null;
  placeIds: string[];
  shareToCommunity: boolean;
  tip: string;
  tags: string[];
  travelStyle: TravelStyleId | null;
  createMemory: boolean;
  explorer: boolean;
  mood: MemoryMood;
  coverPlaceId: string | null;
  coverLocalUri: string | null;
  placesVisited: number;
  totalSpentCents: number;
  travelersCount: number;
};

export function useFinishTrip() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (input: FinishTripInput): Promise<void> => {
      if (!supabase || !userId) {
        throw new Error('Not signed in');
      }
      const now = new Date().toISOString();

      if (input.mode === 'complete_only') {
        const { error: tripErr } = await supabase
          .from('trips')
          .update({ status: 'completed', updated_at: now })
          .eq('id', input.tripId);
        if (tripErr) {
          throw tripErr;
        }
        return;
      }

      if (input.shareToCommunity) {
        const t = input.tip.trim();
        if (!t) {
          throw new Error('Tip required when sharing with the community');
        }
        if (t.length > 280) {
          throw new Error('Tip too long');
        }
        if (!input.travelStyle) {
          throw new Error('Travel style required when sharing');
        }
        if (input.tags.length > 3) {
          throw new Error('At most 3 tags');
        }
      }
      if (input.createMemory && input.explorer) {
        /* mood always set from UI */
      }

      let coverUrl: string | null = null;
      if (input.createMemory && input.explorer && input.coverLocalUri?.trim()) {
        coverUrl = await uploadMemoryCover(input.coverLocalUri.trim(), userId);
      }

      let durationDays: number | null = null;
      const sd = input.startDate;
      const ed = input.endDate;
      if (sd && ed) {
        const [ys, ms, ds] = sd.split('-').map(Number);
        const [ye, me, de] = ed.split('-').map(Number);
        if (ys && ms && ds && ye && me && de) {
          const a = new Date(ys, ms - 1, ds);
          const b = new Date(ye, me - 1, de);
          durationDays = tripDurationDays(a, b);
        }
      }

      let placeRows: { id: string; name: string; latitude: unknown; longitude: unknown }[] = [];
      if (input.placeIds.length > 0) {
        const { data, error: placesError } = await supabase
          .from('places')
          .select('id, name, latitude, longitude')
          .in('id', input.placeIds);
        if (placesError) {
          throw placesError;
        }
        placeRows = data ?? [];
      }
      const pins = placeRows.map((p) => ({
        id: p.id,
        name: p.name,
        latitude: p.latitude != null ? Number(p.latitude) : null,
        longitude: p.longitude != null ? Number(p.longitude) : null,
      }));
      const routeGeoJson = buildRouteGeoJson(pins);

      const { error: tripErr } = await supabase
        .from('trips')
        .update({ status: 'completed', updated_at: now })
        .eq('id', input.tripId);
      if (tripErr) {
        throw tripErr;
      }

      if (input.shareToCommunity && input.travelStyle) {
        const dest =
          input.destinationLabel?.trim() ||
          input.tripName.trim() ||
          'Trip';
        const { error: crErr } = await supabase.from('community_routes').insert({
          creator_id: userId,
          trip_id: input.tripId,
          title: input.tripName.trim(),
          description: null,
          tip: input.tip.trim(),
          tags: input.tags,
          travel_style: input.travelStyle,
          destination: dest,
          duration_days: durationDays,
          published_at: now,
          is_public: true,
          route_geojson: routeGeoJson,
          updated_at: now,
        });
        if (crErr) {
          throw crErr;
        }
      }

      if (input.createMemory && input.explorer) {
        const { error: memErr } = await supabase.from('trip_memories').insert({
          trip_id: input.tripId,
          created_by: userId,
          mood: input.mood,
          cover_photo_url: coverUrl,
          cover_place_id: coverUrl ? null : input.coverPlaceId,
          places_visited: input.placesVisited,
          total_spent_cents: input.totalSpentCents,
          travelers_count: input.travelersCount,
          destination_label: input.destinationLabel,
          start_date: input.startDate,
          end_date: input.endDate,
          updated_at: now,
        });
        if (memErr) {
          throw memErr;
        }
      }
    },
    onSuccess: (_void, input) => {
      void queryClient.invalidateQueries({ queryKey: myTripsQueryKey(userId) });
      void queryClient.invalidateQueries({ queryKey: tripDetailQueryKey(input.tripId) });
      void queryClient.invalidateQueries({ queryKey: completedTripsCountKey(userId) });
      void queryClient.invalidateQueries({ queryKey: communityFeedQueryKey });
      void queryClient.invalidateQueries({ queryKey: tripMemoryQueryKey(input.tripId) });
    },
  });
}
