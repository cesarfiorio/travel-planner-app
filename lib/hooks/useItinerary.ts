import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { hasSupabaseEnv, supabase } from '../supabase';
import type { Json } from '../supabase/types';
import { useAppStore } from '../store/appStore';

import { useAuth } from './useAuth';
import { tripPlaceIdsQueryKey } from './usePlaces';

export type ItineraryStatus = 'planned' | 'visited' | 'skipped';

export type ItineraryPlaceVm = {
  tripPlaceId: string;
  placeId: string;
  dayNumber: number;
  orderIndex: number;
  status: ItineraryStatus;
  notes: string | null;
  name: string;
  category: string | null;
  photos: Json;
  address: string | null;
};

type TripPlaceRow = {
  id: string;
  trip_id: string;
  place_id: string;
  day_number: number;
  order_index: number;
  status: string;
  notes: string | null;
  places: {
    id: string;
    name: string;
    category: string | null;
    photos: Json;
    formatted_address: string | null;
  } | null;
};

export const itineraryQueryKey = (tripId: string) => ['itinerary', tripId] as const;

function isStatus(v: string): v is ItineraryStatus {
  return v === 'planned' || v === 'visited' || v === 'skipped';
}

function mapRow(r: TripPlaceRow): ItineraryPlaceVm | null {
  const p = r.places;
  if (!p) {
    return null;
  }
  if (!isStatus(r.status)) {
    return null;
  }
  return {
    tripPlaceId: r.id,
    placeId: p.id,
    dayNumber: r.day_number,
    orderIndex: r.order_index,
    status: r.status,
    notes: r.notes,
    name: p.name,
    category: p.category,
    photos: p.photos,
    address: p.formatted_address,
  };
}

function groupSections(rows: ItineraryPlaceVm[]): { dayNumber: number; data: ItineraryPlaceVm[] }[] {
  const map = new Map<number, ItineraryPlaceVm[]>();
  for (const row of rows) {
    const list = map.get(row.dayNumber) ?? [];
    list.push(row);
    map.set(row.dayNumber, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dayNumber, data]) => ({
      dayNumber,
      data: [...data].sort((x, y) => x.orderIndex - y.orderIndex),
    }));
}

async function fetchItineraryRows(tripId: string): Promise<ItineraryPlaceVm[]> {
  if (!supabase) {
    return [];
  }
  const { data, error } = await supabase
    .from('trip_places')
    .select(
      `
      id,
      trip_id,
      place_id,
      day_number,
      order_index,
      status,
      notes,
      places (
        id,
        name,
        category,
        photos,
        formatted_address
      )
    `,
    )
    .eq('trip_id', tripId)
    .order('day_number', { ascending: true })
    .order('order_index', { ascending: true });

  if (error) {
    throw error;
  }
  const list: ItineraryPlaceVm[] = [];
  for (const raw of data ?? []) {
    const m = mapRow(raw as TripPlaceRow);
    if (m) {
      list.push(m);
    }
  }
  return list;
}

export function useItinerary(tripId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: itineraryQueryKey(tripId ?? ''),
    enabled: Boolean(tripId && userId && hasSupabaseEnv && supabase),
    queryFn: () => fetchItineraryRows(tripId!),
  });

  const places = query.data ?? [];
  const sections = groupSections(places);

  const updateStatus = useMutation({
    mutationFn: async (vars: { tripPlaceId: string; status: ItineraryStatus }) => {
      if (!supabase) {
        throw new Error('Not configured');
      }
      const { error } = await supabase.from('trip_places').update({ status: vars.status }).eq('id', vars.tripPlaceId);
      if (error) {
        throw error;
      }
    },
    onMutate: async (vars) => {
      if (!tripId) {
        return;
      }
      await queryClient.cancelQueries({ queryKey: itineraryQueryKey(tripId) });
      const prev = queryClient.getQueryData<ItineraryPlaceVm[]>(itineraryQueryKey(tripId));
      if (prev) {
        queryClient.setQueryData<ItineraryPlaceVm[]>(
          itineraryQueryKey(tripId),
          prev.map((r) => (r.tripPlaceId === vars.tripPlaceId ? { ...r, status: vars.status } : r)),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (tripId && ctx?.prev) {
        queryClient.setQueryData(itineraryQueryKey(tripId), ctx.prev);
      }
    },
    onSettled: () => {
      if (tripId) {
        void queryClient.invalidateQueries({ queryKey: itineraryQueryKey(tripId) });
      }
    },
  });

  const removePlace = useMutation({
    mutationFn: async (tripPlaceId: string) => {
      if (!supabase) {
        throw new Error('Not configured');
      }
      const { error } = await supabase.from('trip_places').delete().eq('id', tripPlaceId);
      if (error) {
        throw error;
      }
    },
    onMutate: async (tripPlaceId) => {
      if (!tripId) {
        return;
      }
      await queryClient.cancelQueries({ queryKey: itineraryQueryKey(tripId) });
      const prev = queryClient.getQueryData<ItineraryPlaceVm[]>(itineraryQueryKey(tripId));
      if (prev) {
        const removed = prev.find((r) => r.tripPlaceId === tripPlaceId);
        queryClient.setQueryData<ItineraryPlaceVm[]>(
          itineraryQueryKey(tripId),
          prev.filter((r) => r.tripPlaceId !== tripPlaceId),
        );
        return { prev, removedPlaceId: removed?.placeId };
      }
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (tripId && ctx?.prev) {
        queryClient.setQueryData(itineraryQueryKey(tripId), ctx.prev);
      }
    },
    onSuccess: () => {
      if (tripId) {
        void queryClient.invalidateQueries({ queryKey: tripPlaceIdsQueryKey(tripId) });
        void queryClient.invalidateQueries({
          predicate: (q) =>
            Array.isArray(q.queryKey) && q.queryKey[0] === 'tripPlaceLink' && q.queryKey[1] === tripId,
        });
      }
    },
    onSettled: () => {
      if (tripId) {
        void queryClient.invalidateQueries({ queryKey: itineraryQueryKey(tripId) });
      }
    },
  });

  const persistNotes = useMutation({
    mutationFn: async (vars: { tripPlaceId: string; notes: string }) => {
      if (!supabase) {
        throw new Error('Not configured');
      }
      const { error } = await supabase.from('trip_places').update({ notes: vars.notes }).eq('id', vars.tripPlaceId);
      if (error) {
        throw error;
      }
    },
  });

  const notesTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const scheduleNotesSave = useCallback(
    (tripPlaceId: string, notes: string) => {
      const existing = notesTimers.current.get(tripPlaceId);
      if (existing) {
        clearTimeout(existing);
      }
      const tid = setTimeout(() => {
        notesTimers.current.delete(tripPlaceId);
        void persistNotes.mutateAsync({ tripPlaceId, notes });
      }, 800);
      notesTimers.current.set(tripPlaceId, tid);
    },
    [persistNotes],
  );

  return {
    sections,
    /** Flat itinerary rows (stable with React Query until invalidated). */
    places,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    updateStatus: updateStatus.mutateAsync,
    removePlace: removePlace.mutateAsync,
    scheduleNotesSave,
    isUpdatingStatus: updateStatus.isPending,
  };
}

export function useAddTripPlace() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (vars: { tripId: string; placeId: string; dayNumber?: number }) => {
      if (!supabase || !userId) {
        throw new Error('Not signed in');
      }
      const fromStore = useAppStore.getState().itineraryAddDayNumber;
      const dayRaw = vars.dayNumber ?? fromStore ?? 1;
      const dayNumber = Math.max(1, Math.floor(Number(dayRaw)) || 1);

      const { data: maxRow, error: maxErr } = await supabase
        .from('trip_places')
        .select('order_index')
        .eq('trip_id', vars.tripId)
        .eq('day_number', dayNumber)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxErr) {
        throw maxErr;
      }
      const nextOrder = (maxRow?.order_index ?? -1) + 1;
      const { data: existing, error: exErr } = await supabase
        .from('trip_places')
        .select('id')
        .eq('trip_id', vars.tripId)
        .eq('place_id', vars.placeId)
        .maybeSingle();
      if (exErr) {
        throw exErr;
      }
      if (existing?.id) {
        const { error: upErr } = await supabase
          .from('trip_places')
          .update({
            day_number: dayNumber,
            order_index: nextOrder,
            sort_order: nextOrder,
          })
          .eq('id', existing.id);
        if (upErr) {
          throw upErr;
        }
        return;
      }
      const { error } = await supabase.from('trip_places').insert({
        trip_id: vars.tripId,
        place_id: vars.placeId,
        day_number: dayNumber,
        order_index: nextOrder,
        sort_order: nextOrder,
        status: 'planned',
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: tripPlaceIdsQueryKey(vars.tripId) });
      void queryClient.invalidateQueries({ queryKey: itineraryQueryKey(vars.tripId) });
      void queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) && q.queryKey[0] === 'tripPlaceLink' && q.queryKey[1] === vars.tripId,
      });
    },
  });
}
