import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hasSupabaseEnv, supabase } from '../supabase';
import type { Tables } from '../supabase/types';

import { logger } from '../utils/logger';

import { useAuth } from './useAuth';
import { completedTripsCountKey } from './useProfile';

export type TripMemberBrief = { user_id: string; role: string; joined_at: string };

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

type TripMembersRow = { trip_id: string; user_id: string; role: string; joined_at: string };

function normalizeTripRow(t: Tables<'trips'>): Tables<'trips'> {
  return {
    ...t,
    status: t.status ?? 'planning',
  };
}

/** Loads members in a separate query so PostgREST nested embed + RLS cannot fail the whole list. */
function attachMembersToTrips(trips: Tables<'trips'>[], members: TripMembersRow[] | null): TripRowWithMembers[] {
  const byTrip = new Map<string, TripMemberBrief[]>();
  for (const m of members ?? []) {
    const list = byTrip.get(m.trip_id) ?? [];
    list.push({ user_id: m.user_id, role: m.role, joined_at: m.joined_at });
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
        logger.error('[RouteFlow] useMyTrips trips', error);
        throw error;
      }
      const tripsList = tripsRaw ?? [];
      if (tripsList.length === 0) {
        return [];
      }

      const tripIds = tripsList.map((x) => x.id);
      const { data: membersRows, error: membersError } = await supabase
        .from('trip_members')
        .select('trip_id, user_id, role, joined_at')
        .in('trip_id', tripIds);

      if (membersError) {
        logger.error('[RouteFlow] useMyTrips trip_members', membersError);
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
        .select('trip_id, user_id, role, joined_at')
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
          status: 'planning',
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
      void queryClient.invalidateQueries({ queryKey: completedTripsCountKey(userId) });
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
      void queryClient.invalidateQueries({ queryKey: completedTripsCountKey(userId) });
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
      void queryClient.invalidateQueries({ queryKey: completedTripsCountKey(userId) });
    },
  });
}

export type InviteMemberResult =
  | { ok: true }
  | { ok: false; code: 'user_not_found' | 'already_member' };

export function useInviteTripMember() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (vars: { tripId: string; email: string }): Promise<InviteMemberResult> => {
      if (!supabase) {
        throw new Error('Not signed in');
      }
      const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>('invite-member', {
        body: { trip_id: vars.tripId, email: vars.email.trim() },
      });
      if (error) {
        throw error;
      }
      if (data?.error === 'user_not_found') {
        return { ok: false, code: 'user_not_found' };
      }
      if (data?.error === 'already_member') {
        return { ok: false, code: 'already_member' };
      }
      if (data?.success) {
        return { ok: true };
      }
      throw new Error('invite_failed');
    },
    onSuccess: (result, vars) => {
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: myTripsQueryKey(userId) });
        void queryClient.invalidateQueries({ queryKey: tripDetailQueryKey(vars.tripId) });
      }
    },
  });
}

export function useRemoveTripMember() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (vars: { tripId: string; memberUserId: string }) => {
      if (!supabase) {
        throw new Error('Not signed in');
      }
      const { error } = await supabase.from('trip_members').delete().eq('trip_id', vars.tripId).eq('user_id', vars.memberUserId);
      if (error) {
        throw error;
      }
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: myTripsQueryKey(userId) });
      void queryClient.invalidateQueries({ queryKey: tripDetailQueryKey(vars.tripId) });
    },
  });
}
