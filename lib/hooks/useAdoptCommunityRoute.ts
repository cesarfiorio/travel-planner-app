import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  communityFeedQueryKey,
  communitySourceItineraryQueryKey,
  fetchCommunitySourceItinerary,
} from './useCommunityRoutes';
import { useAuth } from './useAuth';
import { completedTripsCountKey } from './useProfile';
import { myTripsQueryKey, tripDetailQueryKey } from './useTrips';

import { supabase } from '../supabase';
import type { Tables } from '../supabase/types';
import { parseRoutePins, splitPinsAcrossDays } from '../utils/routeGeoJson';

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export type CommunityRouteAdoptInput = {
  routeId: string;
  title: string;
  destination: string | null;
  durationDays: number | null;
  routeGeoJson: Tables<'community_routes'>['route_geojson'];
  /** When set, copy real `day_number` / `order_index` from this trip (public community RLS). */
  sourceTripId?: string | null;
};

export function useAdoptCommunityRoute() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const uid = user?.id ?? '';

  return useMutation({
    mutationFn: async (input: CommunityRouteAdoptInput): Promise<string> => {
      if (!supabase || !uid) {
        throw new Error('Not signed in');
      }
      const { data: existing } = await supabase
        .from('route_used')
        .select('trip_id')
        .eq('user_id', uid)
        .eq('route_id', input.routeId)
        .maybeSingle();
      if (existing?.trip_id) {
        return existing.trip_id;
      }

      const pins = parseRoutePins(input.routeGeoJson);
      let adoptRows: Awaited<ReturnType<typeof fetchCommunitySourceItinerary>>['adoptRows'] = [];
      if (input.sourceTripId?.trim()) {
        try {
          const src = await fetchCommunitySourceItinerary(input.sourceTripId.trim());
          adoptRows = src.adoptRows;
        } catch {
          adoptRows = [];
        }
      }

      let daySpan = Math.max(
        1,
        input.durationDays ?? (pins.length > 0 ? Math.min(7, Math.max(1, Math.ceil(pins.length / 2))) : 1),
      );
      if (adoptRows.length > 0) {
        daySpan = Math.max(daySpan, Math.max(...adoptRows.map((r) => r.day_number), 1));
      }

      const start = stripTime(new Date());
      const end = stripTime(new Date(start));
      end.setDate(end.getDate() + daySpan - 1);

      const now = new Date().toISOString();
      const tripName = input.title?.trim() || input.destination?.trim() || 'Trip';

      const { data: trip, error: tripErr } = await supabase
        .from('trips')
        .insert({
          name: tripName,
          destination_label: input.destination?.trim() || null,
          start_date: toYmd(start),
          end_date: toYmd(end),
          created_by: uid,
          status: 'planning',
          updated_at: now,
        })
        .select('*')
        .single();

      if (tripErr || !trip) {
        throw tripErr ?? new Error('Could not create trip');
      }

      const { error: memErr } = await supabase.from('trip_members').insert({
        trip_id: trip.id,
        user_id: uid,
        role: 'owner',
      });
      if (memErr) {
        throw memErr;
      }

      if (adoptRows.length > 0) {
        const rows = adoptRows.map((r) => ({
          trip_id: trip.id,
          place_id: r.place_id,
          day_number: r.day_number,
          order_index: r.order_index,
          sort_order: r.order_index,
          status: r.status,
          notes: r.notes,
          start_time_local: r.start_time_local,
          duration_minutes: r.duration_minutes,
        }));
        const { error: tpErr } = await supabase.from('trip_places').insert(rows);
        if (tpErr) {
          throw tpErr;
        }
      } else if (pins.length > 0) {
        const dayChunks = splitPinsAcrossDays(pins, daySpan);
        const rows: {
          trip_id: string;
          place_id: string;
          day_number: number;
          order_index: number;
          sort_order: number;
          status: string;
        }[] = [];
        let order = 0;
        for (let dayIdx = 0; dayIdx < dayChunks.length; dayIdx++) {
          const chunk = dayChunks[dayIdx];
          for (const pin of chunk) {
            rows.push({
              trip_id: trip.id,
              place_id: pin.id,
              day_number: dayIdx + 1,
              order_index: order,
              sort_order: order,
              status: 'planned',
            });
            order += 1;
          }
        }
        const { error: tpErr } = await supabase.from('trip_places').insert(rows);
        if (tpErr) {
          throw tpErr;
        }
      }

      const { error: usedErr } = await supabase
        .from('route_used')
        .insert({ route_id: input.routeId, user_id: uid, trip_id: trip.id });
      if (usedErr) {
        throw usedErr;
      }

      return trip.id;
    },
    onSuccess: (tripId, input) => {
      void queryClient.invalidateQueries({ queryKey: communityFeedQueryKey });
      void queryClient.invalidateQueries({ queryKey: myTripsQueryKey(uid) });
      void queryClient.invalidateQueries({ queryKey: completedTripsCountKey(uid) });
      void queryClient.invalidateQueries({ queryKey: ['communityRoute', input.routeId, uid] });
      void queryClient.invalidateQueries({ queryKey: tripDetailQueryKey(tripId) });
      const st = input.sourceTripId?.trim();
      if (st) {
        void queryClient.invalidateQueries({ queryKey: communitySourceItineraryQueryKey(st) });
      }
    },
  });
}
