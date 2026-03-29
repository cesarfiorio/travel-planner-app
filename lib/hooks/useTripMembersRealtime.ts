import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { hasSupabaseEnv, supabase } from '../supabase';

import { useAuth } from './useAuth';
import { myTripsQueryKey, tripDetailQueryKey } from './useTrips';

export function useTripMembersRealtime(tripId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  useEffect(() => {
    if (!tripId || !supabase || !hasSupabaseEnv || !userId) {
      return;
    }

    const client = supabase;

    const channel = client
      .channel(`trip_members:${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_members', filter: `trip_id=eq.${tripId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: myTripsQueryKey(userId) });
          void queryClient.invalidateQueries({ queryKey: tripDetailQueryKey(tripId) });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [tripId, userId, queryClient]);
}
