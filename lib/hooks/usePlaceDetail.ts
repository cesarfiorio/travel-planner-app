import { useQuery } from '@tanstack/react-query';

import { hasSupabaseEnv, supabase } from '../supabase';
import type { Tables } from '../supabase/types';

import { useAuth } from './useAuth';

export function usePlaceById(placeId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: ['place', placeId],
    enabled: Boolean(placeId && userId && hasSupabaseEnv && supabase),
    queryFn: async (): Promise<Tables<'places'>> => {
      if (!supabase || !placeId) {
        throw new Error('Not configured');
      }
      const { data, error } = await supabase.from('places').select('*').eq('id', placeId).single();
      if (error || !data) {
        throw error ?? new Error('not found');
      }
      return data;
    },
  });
}

export function useTripPlaceLink(tripId: string | undefined, placeId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: ['tripPlaceLink', tripId, placeId],
    enabled: Boolean(tripId && placeId && userId && hasSupabaseEnv && supabase),
    queryFn: async (): Promise<string | null> => {
      if (!supabase || !tripId || !placeId) {
        return null;
      }
      const { data, error } = await supabase
        .from('trip_places')
        .select('id')
        .eq('trip_id', tripId)
        .eq('place_id', placeId)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return data?.id ?? null;
    },
  });
}
