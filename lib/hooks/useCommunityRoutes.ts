import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hasSupabaseEnv, supabase } from '../supabase';
import type { Tables } from '../supabase/types';

import { useAuth } from './useAuth';

export const communityFeedQueryKey = ['communityFeed'] as const;
export const communityLikedFeedQueryKey = ['communityLikedFeed'] as const;
const PAGE = 20;

function scoreFromRouteRow(r: { likes_count: number; published_at: string | null }): number {
  const base = (r.likes_count ?? 0) * 3;
  if (!r.published_at) {
    return base;
  }
  const pub = new Date(r.published_at).getTime();
  const ageMs = Date.now() - pub;
  const bonus = ageMs < 7 * 86400000 ? 10 : ageMs < 30 * 86400000 ? 5 : 0;
  return base + bonus;
}

export type RankedRouteRow = Tables<'ranked_routes'>;

export type CommunityRouteVm = RankedRouteRow & {
  hotel_names?: string | null;
  accommodation_rating?: number | null;
  creatorName: string;
  creatorAvatar: string | null;
  likedByMe: boolean;
  savedByMe: boolean;
  usedByMe: boolean;
  /** When the current user adopted this route, their trip id (detail fetch only). */
  adoptedTripId?: string | null;
  creatorBio?: string | null;
};

export type CommunityLikedFeedPage = { items: CommunityRouteVm[]; nextOffset: number | undefined };

async function fetchProfilesMap(
  ids: string[],
): Promise<Map<string, { display_name: string | null; full_name: string | null; avatar_url: string | null; bio: string | null }>> {
  const map = new Map<
    string,
    { display_name: string | null; full_name: string | null; avatar_url: string | null; bio: string | null }
  >();
  if (!supabase || ids.length === 0) {
    return map;
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, full_name, avatar_url, bio')
    .in('id', [...new Set(ids)]);
  if (error || !data) {
    return map;
  }
  for (const p of data) {
    map.set(p.id, { display_name: p.display_name, full_name: p.full_name, avatar_url: p.avatar_url, bio: p.bio });
  }
  return map;
}

export function useCommunityFeed(
  search: string,
  travelStyle: string | null,
  /** When set, filter rows whose `tags` array contains this value (e.g. `adventure`). */
  tagContains: string | null = null,
  options: { enabled?: boolean } = {},
) {
  const { user } = useAuth();
  const uid = user?.id ?? '';
  const feedEnabled = options.enabled !== false;

  return useInfiniteQuery({
    queryKey: [...communityFeedQueryKey, search.trim(), travelStyle ?? '', tagContains ?? '', uid] as const,
    enabled: Boolean(uid && hasSupabaseEnv && supabase && feedEnabled),
    initialPageParam: 0,
    queryFn: async ({ pageParam }: { pageParam: number }): Promise<CommunityRouteVm[]> => {
      if (!supabase) {
        return [];
      }
      const from = pageParam * PAGE;
      const to = from + PAGE - 1;
      let q = supabase.from('ranked_routes').select('*').order('published_at', { ascending: false });
      const s = search.trim();
      /** Avoid breaking PostgREST `or()` and wildcard injection. */
      const safe = s.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
      if (safe) {
        const pattern = `%${safe}%`;
        q = q.or(`destination.ilike.${pattern},title.ilike.${pattern}`);
      }
      if (tagContains) {
        q = q.contains('tags', [tagContains]);
      } else if (travelStyle) {
        q = q.eq('travel_style', travelStyle);
      }
      const { data: rows, error } = await q.range(from, to);
      if (error) {
        throw error;
      }
      // Omit legacy ghost posts (trip deleted under ON DELETE SET NULL). DB migration 021 + ranked_routes view also filter this.
      const list = (rows ?? []).filter((r) => r.trip_id != null && String(r.trip_id).trim() !== '') as RankedRouteRow[];
      if (list.length === 0) {
        return [];
      }
      const creatorIds = list.map((r) => r.creator_id);
      const profMap = await fetchProfilesMap(creatorIds);
      const routeIds = list.map((r) => r.id);
      let liked = new Set<string>();
      let saved = new Set<string>();
      let used = new Set<string>();
      if (uid && routeIds.length > 0) {
        const [likesRes, savesRes, usedRes] = await Promise.all([
          supabase.from('community_route_likes').select('route_id').eq('user_id', uid).in('route_id', routeIds),
          supabase.from('route_saves').select('route_id').eq('user_id', uid).in('route_id', routeIds),
          supabase.from('route_used').select('route_id').eq('user_id', uid).in('route_id', routeIds),
        ]);
        liked = new Set((likesRes.data ?? []).map((l) => l.route_id));
        saved = new Set((savesRes.data ?? []).map((s) => s.route_id));
        used = new Set((usedRes.data ?? []).map((u) => u.route_id));
      }
      return list.map((r) => {
        const p = profMap.get(r.creator_id);
        const name = p?.display_name?.trim() || p?.full_name?.trim() || 'Traveler';
        return {
          ...r,
          creatorName: name,
          creatorAvatar: p?.avatar_url ?? null,
          creatorBio: p?.bio?.trim() || null,
          likedByMe: liked.has(r.id),
          savedByMe: saved.has(r.id),
          usedByMe: used.has(r.id),
        };
      });
    },
    getNextPageParam: (lastPage, _all, lastPageParam) => {
      if (lastPage.length < PAGE) {
        return undefined;
      }
      return lastPageParam + 1;
    },
  });
}

/** Routes the current user liked, newest like first (paginated). */
export function useCommunityLikedFeed(search: string, options: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const uid = user?.id ?? '';
  const listEnabled = options.enabled !== false;

  return useInfiniteQuery({
    queryKey: [...communityLikedFeedQueryKey, search.trim(), uid] as const,
    enabled: Boolean(uid && hasSupabaseEnv && supabase && listEnabled),
    initialPageParam: 0,
    queryFn: async ({ pageParam }: { pageParam: number }): Promise<CommunityLikedFeedPage> => {
      if (!supabase) {
        return { items: [], nextOffset: undefined };
      }
      const offset = pageParam;
      const { data: likeRows, error: likeErr } = await supabase
        .from('community_route_likes')
        .select('route_id')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE);
      if (likeErr) {
        throw likeErr;
      }
      const rows = likeRows ?? [];
      const hasMore = rows.length > PAGE;
      const slice = hasMore ? rows.slice(0, PAGE) : rows;
      const orderedIds = slice.map((r) => r.route_id).filter(Boolean);
      if (orderedIds.length === 0) {
        return { items: [], nextOffset: hasMore ? offset + PAGE : undefined };
      }
      const { data: routeRows, error } = await supabase.from('ranked_routes').select('*').in('id', orderedIds);
      if (error) {
        throw error;
      }
      const byId = new Map((routeRows ?? []).map((r) => [r.id, r as RankedRouteRow]));
      let list = orderedIds
        .map((id) => byId.get(id))
        .filter((r): r is RankedRouteRow => r != null)
        .filter((r) => r.trip_id != null && String(r.trip_id).trim() !== '');

      const s = search.trim();
      const safe = s.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
      if (safe) {
        list = list.filter((r) => {
          const dest = (r.destination ?? '').toLowerCase();
          const tit = (r.title ?? '').toLowerCase();
          return dest.includes(safe) || tit.includes(safe);
        });
      }

      const creatorIds = list.map((r) => r.creator_id);
      const profMap = await fetchProfilesMap(creatorIds);
      const routeIds = list.map((r) => r.id);
      let saved = new Set<string>();
      let used = new Set<string>();
      if (routeIds.length > 0) {
        const [savesRes, usedRes] = await Promise.all([
          supabase.from('route_saves').select('route_id').eq('user_id', uid).in('route_id', routeIds),
          supabase.from('route_used').select('route_id').eq('user_id', uid).in('route_id', routeIds),
        ]);
        saved = new Set((savesRes.data ?? []).map((x) => x.route_id));
        used = new Set((usedRes.data ?? []).map((x) => x.route_id));
      }
      const items = list.map((r) => {
        const p = profMap.get(r.creator_id);
        const name = p?.display_name?.trim() || p?.full_name?.trim() || 'Traveler';
        return {
          ...r,
          creatorName: name,
          creatorAvatar: p?.avatar_url ?? null,
          creatorBio: p?.bio?.trim() || null,
          likedByMe: true,
          savedByMe: saved.has(r.id),
          usedByMe: used.has(r.id),
        };
      });
      return { items, nextOffset: hasMore ? offset + PAGE : undefined };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });
}

export function useCommunityRoute(routeId: string | undefined) {
  const { user } = useAuth();
  const uid = user?.id ?? '';

  return useQuery({
    queryKey: ['communityRoute', routeId ?? '', uid],
    enabled: Boolean(routeId && uid && supabase && hasSupabaseEnv),
    queryFn: async (): Promise<CommunityRouteVm | null> => {
      if (!supabase || !routeId) {
        return null;
      }
      const { data: row, error } = await supabase.from('community_routes').select('*').eq('id', routeId).maybeSingle();
      if (error) {
        throw error;
      }
      if (!row || !row.is_public) {
        return null;
      }
      const profMap = await fetchProfilesMap([row.creator_id]);
      const p = profMap.get(row.creator_id);
      const name = p?.display_name?.trim() || p?.full_name?.trim() || 'Traveler';
      const [likeRes, saveRes, usedRes] = await Promise.all([
        supabase.from('community_route_likes').select('id').eq('route_id', routeId).eq('user_id', uid).maybeSingle(),
        supabase.from('route_saves').select('route_id').eq('route_id', routeId).eq('user_id', uid).maybeSingle(),
        supabase.from('route_used').select('route_id, trip_id').eq('route_id', routeId).eq('user_id', uid).maybeSingle(),
      ]);
      const score = scoreFromRouteRow(row);
      const adoptedTripId = usedRes.data?.trip_id?.trim() || null;
      return {
        ...(row as RankedRouteRow),
        score,
        saves_count: (row as Record<string, unknown>).saves_count as number ?? 0,
        used_count: (row as Record<string, unknown>).used_count as number ?? 0,
        creatorName: name,
        creatorAvatar: p?.avatar_url ?? null,
        creatorBio: p?.bio?.trim() || null,
        likedByMe: Boolean(likeRes.data),
        savedByMe: Boolean(saveRes.data),
        usedByMe: Boolean(usedRes.data?.route_id),
        adoptedTripId,
      };
    },
  });
}

/** Real itinerary from the published source trip (`community_routes.trip_id`), grouped by `day_number`. */
export type CommunitySourceItineraryStop = {
  orderIndex: number;
  placeId: string;
  name: string;
  category: string | null;
  address: string | null;
  rating: number | null;
  notes: string | null;
  status: 'planned' | 'visited' | 'skipped';
};

export type CommunitySourceItineraryDay = {
  dayNumber: number;
  stops: CommunitySourceItineraryStop[];
};

export type CommunitySourceAdoptRow = {
  place_id: string;
  day_number: number;
  order_index: number;
  status: string;
  notes: string | null;
  start_time_local: string | null;
  duration_minutes: number | null;
};

export async function fetchCommunitySourceItinerary(tripId: string): Promise<{
  days: CommunitySourceItineraryDay[];
  adoptRows: CommunitySourceAdoptRow[];
}> {
  if (!supabase) {
    return { days: [], adoptRows: [] };
  }
  const { data, error } = await supabase
    .from('trip_places')
    .select(
      `
      day_number,
      order_index,
      status,
      notes,
      start_time_local,
      duration_minutes,
      places (
        id,
        name,
        category,
        formatted_address,
        rating
      )
    `,
    )
    .eq('trip_id', tripId)
    .order('day_number', { ascending: true })
    .order('order_index', { ascending: true });
  if (error) {
    throw error;
  }
  type TripPlaceSourceRow = {
    day_number: number;
    order_index: number;
    status: string;
    notes: string | null;
    start_time_local: string | null;
    duration_minutes: number | null;
    places: unknown;
  };

  const adoptRows: CommunitySourceAdoptRow[] = [];
  const byDay = new Map<number, CommunitySourceItineraryStop[]>();
  for (const raw of data ?? []) {
    const r = raw as TripPlaceSourceRow;
    const p = r.places as {
      id: string;
      name: string;
      category: string | null;
      formatted_address: string | null;
      rating: number | null;
    } | null;
    if (!p?.id || !p.name?.trim()) {
      continue;
    }
    const st = r.status;
    if (st !== 'planned' && st !== 'visited' && st !== 'skipped') {
      continue;
    }
    adoptRows.push({
      place_id: p.id,
      day_number: r.day_number,
      order_index: r.order_index,
      status: st,
      notes: r.notes ?? null,
      start_time_local: r.start_time_local ?? null,
      duration_minutes: r.duration_minutes != null ? Number(r.duration_minutes) : null,
    });
    const stop: CommunitySourceItineraryStop = {
      orderIndex: r.order_index,
      placeId: p.id,
      name: p.name.trim(),
      category: p.category ?? null,
      address: p.formatted_address?.trim() ?? null,
      rating: p.rating != null ? Number(p.rating) : null,
      notes: r.notes?.trim() || null,
      status: st,
    };
    const list = byDay.get(r.day_number) ?? [];
    list.push(stop);
    byDay.set(r.day_number, list);
  }
  const days: CommunitySourceItineraryDay[] = [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dayNumber, stops]) => ({
      dayNumber,
      stops: [...stops].sort((x, y) => x.orderIndex - y.orderIndex),
    }));
  return { days, adoptRows };
}

export const communitySourceItineraryQueryKey = (tripId: string) => ['communitySourceItinerary', tripId] as const;

export function useCommunitySourceItinerary(tripId: string | null | undefined) {
  const tid = tripId?.trim() ?? '';
  return useQuery({
    queryKey: communitySourceItineraryQueryKey(tid),
    enabled: Boolean(tid && hasSupabaseEnv && supabase),
    queryFn: async () => {
      const { days } = await fetchCommunitySourceItinerary(tid);
      return days;
    },
  });
}

export function useToggleRouteLike() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const uid = user?.id ?? '';

  return useMutation({
    mutationFn: async ({ routeId, liked }: { routeId: string; liked: boolean }) => {
      if (!supabase || !uid) {
        throw new Error('Not signed in');
      }
      if (liked) {
        const { error } = await supabase.from('community_route_likes').delete().eq('route_id', routeId).eq('user_id', uid);
        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase.from('community_route_likes').insert({ route_id: routeId, user_id: uid });
        if (error) {
          throw error;
        }
      }
    },
    onSuccess: (_d, v) => {
      void queryClient.invalidateQueries({ queryKey: communityFeedQueryKey });
      void queryClient.invalidateQueries({ queryKey: communityLikedFeedQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['communityRoute', v.routeId, uid] });
    },
  });
}

export function useToggleRouteSave() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const uid = user?.id ?? '';

  return useMutation({
    mutationFn: async ({ routeId, saved }: { routeId: string; saved: boolean }) => {
      if (!supabase || !uid) {
        throw new Error('Not signed in');
      }
      if (saved) {
        await supabase.from('route_saves').delete().eq('route_id', routeId).eq('user_id', uid);
      } else {
        await supabase.from('route_saves').insert({ route_id: routeId, user_id: uid });
      }
    },
    onSuccess: (_d, v) => {
      void queryClient.invalidateQueries({ queryKey: communityFeedQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['communityRoute', v.routeId, uid] });
      void queryClient.invalidateQueries({ queryKey: ['savedRoutes', uid] });
    },
  });
}

export function useMarkRouteUsed() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const uid = user?.id ?? '';

  return useMutation({
    mutationFn: async ({ routeId, tripId }: { routeId: string; tripId?: string }) => {
      if (!supabase || !uid) {
        throw new Error('Not signed in');
      }
      await supabase.from('route_used').upsert(
        { route_id: routeId, user_id: uid, trip_id: tripId ?? null },
        { onConflict: 'user_id,route_id' },
      );
    },
    onSuccess: (_d, v) => {
      void queryClient.invalidateQueries({ queryKey: communityFeedQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['communityRoute', v.routeId, uid] });
    },
  });
}

export const savedRoutesQueryKey = (userId: string) => ['savedRoutes', userId] as const;

export function useSavedRoutes() {
  const { user } = useAuth();
  const uid = user?.id ?? '';

  return useQuery({
    queryKey: savedRoutesQueryKey(uid),
    enabled: Boolean(uid && hasSupabaseEnv && supabase),
    queryFn: async (): Promise<CommunityRouteVm[]> => {
      if (!supabase || !uid) {
        return [];
      }
      const { data: saves } = await supabase
        .from('route_saves')
        .select('route_id')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      const routeIds = (saves ?? []).map((s) => s.route_id);
      if (routeIds.length === 0) {
        return [];
      }
      const { data: rows } = await supabase
        .from('community_routes')
        .select('*')
        .in('id', routeIds)
        .eq('is_public', true);
      if (!rows?.length) {
        return [];
      }
      const profMap = await fetchProfilesMap(rows.map((r) => r.creator_id));
      return rows.map((r) => {
        const p = profMap.get(r.creator_id);
        const name = p?.display_name?.trim() || p?.full_name?.trim() || 'Traveler';
        return {
          ...(r as RankedRouteRow),
          score: scoreFromRouteRow(r),
          saves_count: (r as Record<string, unknown>).saves_count as number ?? 0,
          used_count: (r as Record<string, unknown>).used_count as number ?? 0,
          creatorName: name,
          creatorAvatar: p?.avatar_url ?? null,
          likedByMe: false,
          savedByMe: true,
          usedByMe: false,
        };
      });
    },
  });
}
