import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hasSupabaseEnv, supabase } from '../supabase';
import type { Tables } from '../supabase/types';
import { getCountry, guessCountryFromDestination } from '../utils/countryUtils';

import { useAuth } from './useAuth';

/** Free tier: max countries on the scratch map. */
export const FREE_MAP_COUNTRY_LIMIT = 5;

export type VisitedCountryRow = Tables<'visited_countries'>;

export const visitedCountriesKey = (userId: string) => ['visitedCountries', userId] as const;

export function useVisitedCountries() {
  const { user } = useAuth();
  const uid = user?.id ?? '';

  return useQuery({
    queryKey: visitedCountriesKey(uid),
    enabled: Boolean(uid && hasSupabaseEnv && supabase),
    queryFn: async (): Promise<VisitedCountryRow[]> => {
      if (!supabase || !uid) {
        return [];
      }
      const { data, error } = await supabase
        .from('visited_countries')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      if (error) {
        throw error;
      }
      return data ?? [];
    },
  });
}

export function useAddVisitedCountry() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const uid = user?.id ?? '';

  return useMutation({
    mutationFn: async (input: {
      countryCode: string;
      countryName: string;
      firstVisitDate?: string | null;
      tripId?: string | null;
      isManual?: boolean;
    }): Promise<void> => {
      if (!supabase || !uid) {
        throw new Error('Not signed in');
      }
      const { error } = await supabase.from('visited_countries').upsert(
        {
          user_id: uid,
          country_code: input.countryCode,
          country_name: input.countryName,
          first_visit_date: input.firstVisitDate ?? null,
          trip_id: input.tripId ?? null,
          is_manual: input.isManual ?? true,
        },
        { onConflict: 'user_id,country_code' },
      );
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: visitedCountriesKey(uid) });
    },
  });
}

export function useRemoveVisitedCountry() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const uid = user?.id ?? '';

  return useMutation({
    mutationFn: async (countryCode: string): Promise<void> => {
      if (!supabase || !uid) {
        throw new Error('Not signed in');
      }
      const { error } = await supabase
        .from('visited_countries')
        .delete()
        .eq('user_id', uid)
        .eq('country_code', countryCode);
      if (error) {
        throw error;
      }
    },
    onMutate: async (code) => {
      await qc.cancelQueries({ queryKey: visitedCountriesKey(uid) });
      const prev = qc.getQueryData<VisitedCountryRow[]>(visitedCountriesKey(uid));
      if (prev) {
        qc.setQueryData(visitedCountriesKey(uid), prev.filter((r) => r.country_code !== code));
      }
      return { prev };
    },
    onError: (_err, _code, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(visitedCountriesKey(uid), ctx.prev);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: visitedCountriesKey(uid) });
    },
  });
}

/** Call after trip creation/update to auto-mark the destination country. */
export function useAutoMarkCountry() {
  const add = useAddVisitedCountry();

  return (destination: string | null | undefined, tripId: string, startDate: string | null) => {
    if (!destination?.trim()) {
      return;
    }
    const code = guessCountryFromDestination(destination);
    if (!code) {
      return;
    }
    const country = getCountry(code);
    if (!country) {
      return;
    }
    add.mutate({
      countryCode: code,
      countryName: country.name,
      firstVisitDate: startDate ?? null,
      tripId,
      isManual: false,
    });
  };
}
