import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { TravelStyleId } from '../community/constants';
import { supabase } from '../supabase';
import { getCountry, guessCountryFromDestination } from '../utils/countryUtils';

import { useAuth } from './useAuth';
import { communityFeedQueryKey } from './useCommunityRoutes';
import { completedTripsCountKey, profileQueryKey } from './useProfile';
import { myTripsQueryKey } from './useTrips';
import { visitedCountriesKey } from './useVisitedCountries';

const IMPORT_LIMIT_PER_DAY = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

export type QuickImportInput = {
  destination: string;
  monthYear: string;
  /** DB `travel_style` value from Quick Log, or legacy importer keys (`partner` / `friends`). */
  travelWith: TravelStyleId | 'partner' | 'friends';
  tip: string;
  shareToCommunity: boolean;
  travelStyle?: TravelStyleId | null;
};

export type FullImportInput = QuickImportInput & {
  startDate: string;
  endDate: string;
  placeIds: string[];
  totalSpentCents: number;
  currency: string;
  mood: 'amazing' | 'great' | 'good' | 'mixed';
};

/** Normalize UI / legacy keys to `community_routes.travel_style` CHECK values. */
export function mapTravelStyle(raw: string): string {
  const map: Record<string, string> = {
    partner: 'couple',
    friends: 'group',
    solo: 'solo',
    family: 'family',
    group: 'group',
    backpacker: 'backpacker',
    couple: 'couple',
  };
  return map[raw] ?? 'solo';
}

export const importCountKey = (userId: string) => ['importCount', userId] as const;

export function useImportCount() {
  const { user } = useAuth();
  const uid = user?.id ?? '';

  return useQuery({
    queryKey: importCountKey(uid),
    enabled: Boolean(uid && supabase),
    queryFn: async (): Promise<number> => {
      if (!supabase || !uid) {
        return 0;
      }
      const since = new Date();
      since.setHours(since.getHours() - 24);
      const { count, error } = await supabase
        .from('trips')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', uid)
        .eq('status', 'completed')
        .gte('created_at', since.toISOString());
      if (error) {
        return 0;
      }
      return count ?? 0;
    },
    staleTime: 30_000,
  });
}

export function useCanImport(): boolean {
  const { data: count = 0 } = useImportCount();
  return count < IMPORT_LIMIT_PER_DAY;
}

function monthYearToDate(my: string): { start: string; end: string } {
  const [month, year] = my.split('/').map(Number);
  const y = year ?? new Date().getFullYear();
  const m = month ?? 1;
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export function useQuickImportTrip() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const uid = user?.id ?? '';

  return useMutation({
    mutationFn: async (input: QuickImportInput): Promise<string> => {
      if (!supabase || !uid) {
        throw new Error('Not signed in');
      }
      const now = new Date().toISOString();
      const { start, end } = monthYearToDate(input.monthYear);

      const { data: trip, error: tripErr } = await supabase
        .from('trips')
        .insert({
          name: input.destination.trim(),
          destination_label: input.destination.trim(),
          start_date: start,
          end_date: end,
          created_by: uid,
          status: 'completed',
          updated_at: now,
        })
        .select('*')
        .single();

      if (tripErr || !trip) {
        throw tripErr ?? new Error('insert trip');
      }

      await supabase.from('trip_members').insert({ trip_id: trip.id, user_id: uid, role: 'owner' });

      if (input.shareToCommunity && input.tip.trim()) {
        await supabase.from('community_routes').insert({
          trip_id: trip.id,
          creator_id: uid,
          title: input.destination.trim(),
          destination: input.destination.trim(),
          tip: input.tip.trim(),
          travel_style: mapTravelStyle(input.travelStyle ?? input.travelWith),
          is_public: true,
          published_at: now,
          duration_days: Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / DAY_MS)),
        });
      }

      const code = guessCountryFromDestination(input.destination);
      if (code) {
        const country = getCountry(code);
        if (country) {
          await supabase.from('visited_countries').upsert(
            {
              user_id: uid,
              country_code: code,
              country_name: country.name,
              first_visit_date: start,
              trip_id: trip.id,
              is_manual: false,
            },
            { onConflict: 'user_id,country_code' },
          );
        }
      }

      return trip.id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: myTripsQueryKey(uid) });
      void qc.invalidateQueries({ queryKey: completedTripsCountKey(uid) });
      void qc.invalidateQueries({ queryKey: communityFeedQueryKey });
      void qc.invalidateQueries({ queryKey: visitedCountriesKey(uid) });
      void qc.invalidateQueries({ queryKey: importCountKey(uid) });
    },
  });
}

export function useFullImportTrip() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const uid = user?.id ?? '';

  return useMutation({
    mutationFn: async (input: FullImportInput): Promise<string> => {
      if (!supabase || !uid) {
        throw new Error('Not signed in');
      }
      const now = new Date().toISOString();

      const { data: trip, error: tripErr } = await supabase
        .from('trips')
        .insert({
          name: input.destination.trim(),
          destination_label: input.destination.trim(),
          start_date: input.startDate,
          end_date: input.endDate,
          default_currency: input.currency || 'USD',
          created_by: uid,
          status: 'completed',
          updated_at: now,
        })
        .select('*')
        .single();

      if (tripErr || !trip) {
        throw tripErr ?? new Error('insert trip');
      }

      await supabase.from('trip_members').insert({ trip_id: trip.id, user_id: uid, role: 'owner' });

      if (input.placeIds.length > 0) {
        const rows = input.placeIds.map((pid, i) => ({
          trip_id: trip.id,
          place_id: pid,
          day_number: 1,
          sort_order: i,
          status: 'visited' as const,
        }));
        await supabase.from('trip_places').insert(rows);
      }

      if (input.shareToCommunity && input.tip.trim()) {
        await supabase.from('community_routes').insert({
          trip_id: trip.id,
          creator_id: uid,
          title: input.destination.trim(),
          destination: input.destination.trim(),
          tip: input.tip.trim(),
          travel_style: mapTravelStyle(input.travelStyle ?? input.travelWith),
          is_public: true,
          published_at: now,
          duration_days: Math.max(
            1,
            Math.ceil((new Date(input.endDate).getTime() - new Date(input.startDate).getTime()) / DAY_MS),
          ),
        });
      }

      await supabase.from('trip_memories').insert({
        trip_id: trip.id,
        created_by: uid,
        mood: input.mood,
        places_visited: input.placeIds.length || 1,
        total_spent_cents: input.totalSpentCents,
        travelers_count: input.travelWith === 'solo' ? 1 : 2,
        destination_label: input.destination.trim(),
        share_token: trip.id.slice(0, 8),
      });

      const code = guessCountryFromDestination(input.destination);
      if (code) {
        const country = getCountry(code);
        if (country) {
          await supabase.from('visited_countries').upsert(
            {
              user_id: uid,
              country_code: code,
              country_name: country.name,
              first_visit_date: input.startDate,
              trip_id: trip.id,
              is_manual: false,
            },
            { onConflict: 'user_id,country_code' },
          );
        }
      }

      return trip.id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: myTripsQueryKey(uid) });
      void qc.invalidateQueries({ queryKey: completedTripsCountKey(uid) });
      void qc.invalidateQueries({ queryKey: communityFeedQueryKey });
      void qc.invalidateQueries({ queryKey: visitedCountriesKey(uid) });
      void qc.invalidateQueries({ queryKey: importCountKey(uid) });
    },
  });
}
