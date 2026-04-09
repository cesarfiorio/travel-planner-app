import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hasSupabaseEnv, supabase } from '../supabase';
import type { Json, Tables } from '../supabase/types';

import { useAuth } from './useAuth';

export const tripMemoryQueryKey = (tripId: string) => ['tripMemory', tripId] as const;
export const tripJournalQueryKey = (memoryId: string) => ['tripJournal', memoryId] as const;

export type TripMemoryRow = Tables<'trip_memories'>;
export type JournalRow = Tables<'trip_memory_journal_entries'>;

export function useTripMemoryByTripId(tripId: string | undefined) {
  const { user } = useAuth();
  const uid = user?.id ?? '';

  return useQuery({
    queryKey: tripMemoryQueryKey(tripId ?? ''),
    enabled: Boolean(tripId && uid && hasSupabaseEnv && supabase),
    queryFn: async (): Promise<TripMemoryRow | null> => {
      if (!supabase || !tripId) {
        return null;
      }
      const { data, error } = await supabase.from('trip_memories').select('*').eq('trip_id', tripId).maybeSingle();
      if (error) {
        throw error;
      }
      return data;
    },
  });
}

export function useUpdateTripMemory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (payload: {
      memoryId: string;
      tripId: string;
      places_visited?: number;
      itinerary_snapshot?: Json | null;
      cover_photo_url?: string | null;
      cover_place_id?: string | null;
    }) => {
      if (!supabase || !userId) {
        throw new Error('Not signed in');
      }
      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (payload.places_visited !== undefined) {
        patch.places_visited = payload.places_visited;
      }
      if (payload.itinerary_snapshot !== undefined) {
        patch.itinerary_snapshot = payload.itinerary_snapshot;
      }
      if (payload.cover_photo_url !== undefined) {
        patch.cover_photo_url = payload.cover_photo_url;
      }
      if (payload.cover_place_id !== undefined) {
        patch.cover_place_id = payload.cover_place_id;
      }
      const { error } = await supabase.from('trip_memories').update(patch).eq('id', payload.memoryId).eq('created_by', userId);
      if (error) {
        throw error;
      }
    },
    onSuccess: (_void, v) => {
      void queryClient.invalidateQueries({ queryKey: tripMemoryQueryKey(v.tripId) });
    },
  });
}

export function useTripJournal(memoryId: string | undefined) {
  const { user } = useAuth();
  const uid = user?.id ?? '';

  return useQuery({
    queryKey: tripJournalQueryKey(memoryId ?? ''),
    enabled: Boolean(memoryId && uid && hasSupabaseEnv && supabase),
    queryFn: async (): Promise<JournalRow[]> => {
      if (!supabase || !memoryId) {
        return [];
      }
      const { data, error } = await supabase
        .from('trip_memory_journal_entries')
        .select('*')
        .eq('memory_id', memoryId)
        .order('created_at', { ascending: false });
      if (error) {
        throw error;
      }
      return data ?? [];
    },
  });
}

export function useAddJournalEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const uid = user?.id ?? '';

  return useMutation({
    mutationFn: async (input: { memoryId: string; content: string }) => {
      if (!supabase || !uid) {
        throw new Error('Not signed in');
      }
      const now = new Date().toISOString();
      const { error } = await supabase.from('trip_memory_journal_entries').insert({
        memory_id: input.memoryId,
        user_id: uid,
        content: input.content.trim(),
        updated_at: now,
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: (_void, v) => {
      void queryClient.invalidateQueries({ queryKey: tripJournalQueryKey(v.memoryId) });
    },
  });
}

export function useUpdateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; memoryId: string; content: string }) => {
      if (!supabase) {
        throw new Error('Not configured');
      }
      const { error } = await supabase
        .from('trip_memory_journal_entries')
        .update({ content: input.content.trim(), updated_at: new Date().toISOString() })
        .eq('id', input.id);
      if (error) {
        throw error;
      }
    },
    onSuccess: (_void, v) => {
      void queryClient.invalidateQueries({ queryKey: tripJournalQueryKey(v.memoryId) });
    },
  });
}

export function useDeleteJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; memoryId: string }) => {
      if (!supabase) {
        throw new Error('Not configured');
      }
      const { error } = await supabase.from('trip_memory_journal_entries').delete().eq('id', input.id);
      if (error) {
        throw error;
      }
    },
    onSuccess: (_void, v) => {
      void queryClient.invalidateQueries({ queryKey: tripJournalQueryKey(v.memoryId) });
    },
  });
}
