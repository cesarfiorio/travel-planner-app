import { useQuery, useQueryClient } from '@tanstack/react-query';

import { searchPlaces } from '../api/places';
import { useAuth } from './useAuth';
import { hasSupabaseEnv, supabase } from '../supabase';

import type { ExploreCategoryFilter, Place, PlaceCategory } from '../../types/places';
import { EXPLORE_PARALLEL_CATEGORIES } from '../../types/places';

export const searchPlacesQueryKey = (destination: string, category: ExploreCategoryFilter) =>
  ['searchPlaces', destination.trim().toLowerCase(), category] as const;

const STALE_MS = 10 * 60 * 1000;

export function useSearchPlaces(destination: string | undefined, category: ExploreCategoryFilter) {
  const { session, isReady } = useAuth();
  const dest = destination?.trim() ?? '';
  const hasUserJwt = Boolean(session?.access_token);
  const enabled = Boolean(dest && hasSupabaseEnv && supabase && isReady && hasUserJwt);

  return useQuery({
    queryKey: searchPlacesQueryKey(dest || '_', category),
    enabled,
    staleTime: STALE_MS,
    queryFn: async (): Promise<Place[]> => {
      if (!dest) {
        return [];
      }
      if (category === 'all') {
        const batches = await Promise.all(
          EXPLORE_PARALLEL_CATEGORIES.map((c) => searchPlaces(dest, c as PlaceCategory)),
        );
        const map = new Map<string, Place>();
        for (const arr of batches) {
          for (const p of arr) {
            map.set(p.id, p);
          }
        }
        return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
      }
      return searchPlaces(dest, category as PlaceCategory);
    },
  });
}

export const tripPlaceIdsQueryKey = (tripId: string) => ['tripPlaceIds', tripId] as const;

export function useTripPlaceIds(tripId: string | undefined) {
  return useQuery({
    queryKey: tripPlaceIdsQueryKey(tripId ?? ''),
    enabled: Boolean(tripId && hasSupabaseEnv && supabase),
    queryFn: async (): Promise<Set<string>> => {
      if (!supabase || !tripId) {
        return new Set();
      }
      const { data, error } = await supabase.from('trip_places').select('place_id').eq('trip_id', tripId);
      if (error) {
        throw error;
      }
      return new Set(
        (data ?? []).map((r) => r.place_id).filter((id): id is string => typeof id === 'string' && id.length > 0),
      );
    },
  });
}

export function useInvalidateTripPlaces() {
  const queryClient = useQueryClient();
  return (tripId: string) => {
    void queryClient.invalidateQueries({ queryKey: tripPlaceIdsQueryKey(tripId) });
    void queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
  };
}
