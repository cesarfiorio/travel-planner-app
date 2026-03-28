import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hasSupabaseEnv, supabase } from '../supabase';
import type { Tables } from '../supabase/types';

import { useAuth } from './useAuth';

export type TripMemberBrief = { user_id: string; role: string };

export type MemberProfileBrief = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type TripWithDetails = Tables<'trips'> & {
  trip_members: TripMemberBrief[];
  memberProfiles: MemberProfileBrief[];
};

type TripRowWithMembers = Tables<'trips'> & {
  trip_members: TripMemberBrief[] | null;
};

type TripMembersRow = { trip_id: string; user_id: string; role: string };

function normalizeTripRow(t: Tables<'trips'>): Tables<'trips'> {
  return {
    ...t,
    status: t.status ?? 'active',
  };
}

/** Loads members in a separate query so PostgREST nested embed + RLS cannot fail the whole list. */
function attachMembersToTrips(trips: Tables<'trips'>[], members: TripMembersRow[] | null): TripRowWithMembers[] {
  const byTrip = new Map<string, TripMemberBrief[]>();
  for (const m of members ?? []) {
    const list = byTrip.get(m.trip_id) ?? [];
    list.push({ user_id: m.user_id, role: m.role });
    byTrip.set(m.trip_id, list);
  }
  return trips.map((raw) => {
    const t = normalizeTripRow(raw);
    return {
      ...t,
      trip_members: byTrip.get(t.id) ?? [],
    };
  });
}

export const myTripsQueryKey = (userId: string) => ['myTrips', userId] as const;

export const tripDetailQueryKey = (tripId: string) => ['trip', tripId] as const;

async function fetchProfilesForIds(ids: string[]): Promise<Map<string, MemberProfileBrief>> {
  const map = new Map<string, MemberProfileBrief>();
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0 || !supabase) {
    return map;
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, display_name, avatar_url')
    .in('id', unique);
  if (error || !data) {
    return map;
  }
  for (const p of data) {
    map.set(p.id, p);
  }
  return map;
}

function mapTripRow(row: TripRowWithMembers, profileMap: Map<string, MemberProfileBrief>): TripWithDetails {
  const tm = (row.trip_members ?? []).filter(Boolean);
  const { trip_members: _drop, ...trip } = row;
  const memberProfiles = tm.map((m) => {
    const p = profileMap.get(m.user_id);
    return (
      p ?? {
        id: m.user_id,
        full_name: null,
        display_name: null,
        avatar_url: null,
      }
    );
  });
  return {
    ...trip,
    trip_members: tm,
    memberProfiles,
  };
}

export function useMyTrips() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: myTripsQueryKey(userId),
    enabled: Boolean(userId && hasSupabaseEnv && supabase),
    queryFn: async (): Promise<TripWithDetails[]> => {
      if (!supabase || !userId) {
        return [];
      }

      const { data: tripsRaw, error } = await supabase
        .from('trips')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }
      const tripsList = tripsRaw ?? [];
      if (tripsList.length === 0) {
        return [];
      }

      const tripIds = tripsList.map((x) => x.id);
      const { data: membersRows, error: membersError } = await supabase
        .from('trip_members')
        .select('trip_id, user_id, role')
        .in('trip_id', tripIds);

      if (membersError) {
        throw membersError;
      }

      const rows = attachMembersToTrips(tripsList, membersRows);
      const allUserIds: string[] = [];
      for (const t of rows) {
        allUserIds.push(t.created_by);
        for (const m of t.trip_members ?? []) {
          allUserIds.push(m.user_id);
        }
      }
      const profileMap = await fetchProfilesForIds(allUserIds);
      return rows.map((r) => mapTripRow(r, profileMap));
    },
  });
}

export function useTrip(tripId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: tripDetailQueryKey(tripId ?? ''),
    enabled: Boolean(tripId && userId && hasSupabaseEnv && supabase),
    queryFn: async (): Promise<TripWithDetails | null> => {
      if (!supabase || !tripId) {
        return null;
      }
      const { data: tripRaw, error } = await supabase.from('trips').select('*').eq('id', tripId).maybeSingle();

      if (error) {
        throw error;
      }
      if (!tripRaw) {
        return null;
      }

      const { data: membersRows, error: membersError } = await supabase
        .from('trip_members')
        .select('trip_id, user_id, role')
        .eq('trip_id', tripId);

      if (membersError) {
        throw membersError;
      }

      const row = attachMembersToTrips([tripRaw], membersRows)[0];
      const ids = [row.created_by, ...(row.trip_members ?? []).map((m) => m.user_id)];
      const profileMap = await fetchProfilesForIds(ids);
      return mapTripRow(row, profileMap);
    },
  });
}

export type CreateTripInput = {
  name: string;
  destination_label: string | null;
  start_date: string | null;
  end_date: string | null;
};

export function useCreateTrip() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (input: CreateTripInput): Promise<Tables<'trips'>> => {
      if (!supabase || !userId) {
        throw new Error('Not signed in');
      }
      const now = new Date().toISOString();
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          name: input.name.trim(),
          destination_label: input.destination_label?.trim() || null,
          start_date: input.start_date,
          end_date: input.end_date,
          created_by: userId,
          status: 'active',
          updated_at: now,
        })
        .select('*')
        .single();

      if (tripError || !trip) {
        throw tripError ?? new Error('insert trip');
      }

      const { error: memberError } = await supabase.from('trip_members').insert({
        trip_id: trip.id,
        user_id: userId,
        role: 'owner',
      });
      if (memberError) {
        throw memberError;
      }
      return trip;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: myTripsQueryKey(userId) });
    },
  });
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      name?: string;
      destination_label?: string | null;
      start_date?: string | null;
      end_date?: string | null;
      status?: string;
    }) => {
      if (!supabase || !userId) {
        throw new Error('Not signed in');
      }
      const { id, ...patch } = payload;
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('trips')
        .update({ ...patch, updated_at: now })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: myTripsQueryKey(userId) });
      void queryClient.invalidateQueries({ queryKey: tripDetailQueryKey(vars.id) });
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (tripId: string) => {
      if (!supabase) {
        throw new Error('Not signed in');
      }
      const { error } = await supabase.from('trips').delete().eq('id', tripId);
      if (error) {
        throw error;
      }
      return tripId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: myTripsQueryKey(userId) });
    },
  });
}
