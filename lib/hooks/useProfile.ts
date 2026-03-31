import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { formatErrorMessage } from '../formatError';
import { i18n } from '../i18n';
import { hasSupabaseEnv, supabase } from '../supabase';
import type { Tables } from '../supabase/types';
import { deriveTripUiStatus } from '../trips/tripUi';

import { useAuth } from './useAuth';

export type ProfileRow = Tables<'profiles'>;

export const profileQueryKey = (userId: string) => ['profile', userId] as const;

export const completedTripsCountKey = (userId: string) =>
  ['completedTripsCount', userId] as const;

export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: profileQueryKey(userId ?? ''),
    enabled: Boolean(userId && hasSupabaseEnv && supabase),
    queryFn: async (): Promise<ProfileRow | null> => {
      if (!supabase || !userId) {
        return null;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }
      return data;
    },
  });
}

export function useCompletedTripsCount() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: completedTripsCountKey(userId ?? ''),
    enabled: Boolean(userId && hasSupabaseEnv && supabase),
    queryFn: async (): Promise<number> => {
      if (!supabase || !userId) {
        return 0;
      }

      const { data: memberships, error: memberError } = await supabase
        .from('trip_members')
        .select('trip_id')
        .eq('user_id', userId);

      if (memberError) {
        throw memberError;
      }

      const tripIds = [...new Set((memberships ?? []).map((r) => r.trip_id))];
      if (tripIds.length === 0) {
        return 0;
      }

      const { data: tripRows, error: tripsError } = await supabase
        .from('trips')
        .select('id, status, start_date, end_date')
        .in('id', tripIds);

      if (tripsError) {
        throw tripsError;
      }

      return (tripRows ?? []).filter((row) => deriveTripUiStatus(row) === 'completed').length;
    },
  });
}

export function useUpdateProfileName() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (fullName: string) => {
      if (!supabase || !userId) {
        throw new Error('Not signed in');
      }
      const trimmed = fullName.trim();
      if (!trimmed) {
        throw new Error('Name cannot be empty');
      }

      const now = new Date().toISOString();
      const { error } = await supabase.from('profiles').upsert(
        {
          id: userId,
          full_name: trimmed,
          display_name: trimmed,
          updated_at: now,
        },
        { onConflict: 'id' },
      );

      if (error) {
        const msg = formatErrorMessage(error, i18n.t('common:profileUpdateDbHint'));
        throw new Error(msg);
      }
    },
    onMutate: async (fullName: string) => {
      await queryClient.cancelQueries({ queryKey: profileQueryKey(userId) });
      const previous = queryClient.getQueryData<ProfileRow | null>(profileQueryKey(userId));

      const trimmed = fullName.trim();
      queryClient.setQueryData<ProfileRow | null>(profileQueryKey(userId), (old) => {
        if (!old) {
          return {
            id: userId,
            full_name: trimmed,
            display_name: trimmed,
            avatar_url: null,
            plan: 'free',
            plan_expires_at: null,
            created_at: nowIso(),
            updated_at: nowIso(),
          } as ProfileRow;
        }
        return {
          ...old,
          full_name: trimmed,
          display_name: trimmed,
          updated_at: nowIso(),
        };
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(profileQueryKey(userId), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) });
    },
  });
}

function nowIso(): string {
  return new Date().toISOString();
}
