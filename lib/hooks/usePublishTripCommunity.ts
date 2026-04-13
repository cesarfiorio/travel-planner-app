import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { TravelStyleId } from '../community/constants';
import { hasSupabaseEnv, supabase } from '../supabase';
import { buildRouteGeoJson, type PlacePin } from '../utils/routeGeoJson';
import { tripDurationDays } from '../trips/tripUi';

import { useAuth } from './useAuth';
import { communityFeedQueryKey } from './useCommunityRoutes';
import { tripDetailQueryKey, myTripsQueryKey } from './useTrips';
import { tripMemoryQueryKey } from './useTripMemory';

export const communityRouteByTripQueryKey = (tripId: string) => ['communityRouteByTrip', tripId] as const;

export type CommunityRouteForTripRow = {
  id: string;
  tip: string | null;
  tags: string[] | null;
  travel_style: string | null;
};

export function useCommunityRouteForTrip(tripId: string | undefined) {
  const { user } = useAuth();
  const uid = user?.id ?? '';

  return useQuery({
    queryKey: communityRouteByTripQueryKey(tripId ?? ''),
    enabled: Boolean(tripId && uid && hasSupabaseEnv && supabase),
    queryFn: async (): Promise<CommunityRouteForTripRow | null> => {
      if (!supabase || !tripId) {
        return null;
      }
      const { data, error } = await supabase
        .from('community_routes')
        .select('id, tip, tags, travel_style')
        .eq('trip_id', tripId)
        .eq('creator_id', uid)
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return data;
    },
  });
}

export type PublishCompletedTripToCommunityInput = {
  tripId: string;
  tripName: string;
  destinationLabel: string | null;
  startDate: string | null;
  endDate: string | null;
  /** Distinct place ids in itinerary order */
  placeIds: string[];
  /** When set (e.g. from itinerary), skips an extra round-trip to `places` for coordinates. */
  routePins?: PlacePin[];
  tip: string;
  tags: string[];
  travelStyle: TravelStyleId;
  coverPhotoUrl?: string | null;
};

export function usePublishCompletedTripToCommunity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (input: PublishCompletedTripToCommunityInput): Promise<void> => {
      if (!supabase || !userId) {
        throw new Error('Not signed in');
      }
      const t = input.tip.trim();
      if (!t) {
        throw new Error('Tip required when sharing with the community');
      }
      if (t.length > 600) {
        throw new Error('Tip too long');
      }
      if (!input.travelStyle) {
        throw new Error('Travel style required when sharing');
      }
      if (input.tags.length > 3) {
        throw new Error('At most 3 tags');
      }

      /** Cap rows scanned so duplicate cleanup stays fast even if data is messy. */
      const DEDUP_PAGE = 24;
      const { data: rowsForTrip, error: listErr } = await supabase
        .from('community_routes')
        .select('id, published_at, updated_at')
        .eq('trip_id', input.tripId)
        .eq('creator_id', userId)
        .order('updated_at', { ascending: false })
        .limit(DEDUP_PAGE);
      if (listErr) {
        throw listErr;
      }
      const owned = rowsForTrip ?? [];
      const rankTime = (row: { published_at: string | null; updated_at: string }) =>
        Math.max(
          row.published_at ? new Date(row.published_at).getTime() : 0,
          row.updated_at ? new Date(row.updated_at).getTime() : 0,
        );
      const sorted = [...owned].sort((a, b) => {
        const d = rankTime(b) - rankTime(a);
        if (d !== 0) {
          return d;
        }
        return b.id.localeCompare(a.id);
      });
      const canonicalId = sorted.length > 0 ? sorted[0].id : null;
      const duplicateIds = sorted.slice(1).map((r) => r.id);
      if (duplicateIds.length > 0) {
        const { error: delDupErr } = await supabase.from('community_routes').delete().in('id', duplicateIds);
        if (delDupErr) {
          throw delDupErr;
        }
      }

      const now = new Date().toISOString();
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

      let pins: PlacePin[];
      if (input.routePins && input.routePins.length > 0) {
        pins = input.routePins;
      } else {
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
        const idOrder = new Map(input.placeIds.map((id, i) => [id, i]));
        placeRows.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));
        pins = placeRows.map((p) => ({
          id: p.id,
          name: p.name,
          latitude: p.latitude != null ? Number(p.latitude) : null,
          longitude: p.longitude != null ? Number(p.longitude) : null,
        }));
      }
      const routeGeoJson = buildRouteGeoJson(pins);

      const dest = input.destinationLabel?.trim() || input.tripName.trim() || 'Trip';

      if (canonicalId) {
        const { error: upErr } = await supabase
          .from('community_routes')
          .update({
            title: input.tripName.trim(),
            tip: t,
            tags: input.tags,
            travel_style: input.travelStyle,
            destination: dest,
            duration_days: durationDays,
            route_geojson: routeGeoJson,
            cover_photo_url: input.coverPhotoUrl?.trim() || null,
            updated_at: now,
            published_at: now,
          })
          .eq('id', canonicalId)
          .eq('creator_id', userId);
        if (upErr) {
          throw upErr;
        }
        return;
      }

      const { error: crErr } = await supabase.from('community_routes').insert({
        creator_id: userId,
        trip_id: input.tripId,
        title: input.tripName.trim(),
        description: null,
        tip: t,
        tags: input.tags,
        travel_style: input.travelStyle,
        destination: dest,
        duration_days: durationDays,
        published_at: now,
        is_public: true,
        route_geojson: routeGeoJson,
        cover_photo_url: input.coverPhotoUrl?.trim() || null,
        updated_at: now,
      });
      if (crErr) {
        throw crErr;
      }
    },
    onSuccess: (_void, input) => {
      void queryClient.invalidateQueries({ queryKey: tripDetailQueryKey(input.tripId) });
      void queryClient.invalidateQueries({ queryKey: myTripsQueryKey(userId) });
      void queryClient.invalidateQueries({ queryKey: communityRouteByTripQueryKey(input.tripId) });
      void queryClient.invalidateQueries({ queryKey: tripMemoryQueryKey(input.tripId) });
      // Defer feed invalidation so the publish mutation returns sooner and the UI unblocks faster.
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: communityFeedQueryKey });
      }, 150);
    },
  });
}
