import { useQuery } from '@tanstack/react-query';

import { hasSupabaseEnv, supabase } from '../supabase';

import { useAuth } from './useAuth';

export const founderOfferQueryKey = ['app_config', 'founder_offer_ends_at'] as const;

/** Parsed end date for founder pricing window, or null if missing/invalid. */
export function useFounderOfferEndsAt() {
  const { user } = useAuth();

  return useQuery({
    queryKey: founderOfferQueryKey,
    enabled: Boolean(user && hasSupabaseEnv && supabase),
    queryFn: async (): Promise<Date | null> => {
      if (!supabase) {
        return null;
      }
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'founder_offer_ends_at')
        .maybeSingle();

      if (error) {
        throw error;
      }
      const raw = data?.value?.trim();
      if (!raw) {
        return null;
      }
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? null : d;
    },
    staleTime: 60_000,
  });
}

export function useFounderOfferActive(): boolean {
  const { data: endsAt, isSuccess } = useFounderOfferEndsAt();
  if (!isSuccess || !endsAt) {
    return false;
  }
  return Date.now() < endsAt.getTime();
}

export function founderDaysRemaining(endsAt: Date): number {
  const ms = endsAt.getTime() - Date.now();
  if (ms <= 0) {
    return 0;
  }
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
