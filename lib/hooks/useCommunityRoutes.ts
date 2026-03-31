import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hasSupabaseEnv, supabase } from '../supabase';
import type { Tables } from '../supabase/types';

import { useAuth } from './useAuth';

export const communityFeedQueryKey = ['communityFeed'] as const;
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
  creatorName: string;
  creatorAvatar: string | null;
  likedByMe: boolean;
};

async function fetchProfilesMap(ids: string[]): Promise<Map<string, { display_name: string | null; full_name: string | null; avatar_url: string | null }>> {
  const map = new Map<string, { display_name: string | null; full_name: string | null; avatar_url: string | null }>();
  if (!supabase || ids.length === 0) {
    return map;
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, full_name, avatar_url')
    .in('id', [...new Set(ids)]);
  if (error || !data) {
    return map;
  }
  for (const p of data) {
    map.set(p.id, { display_name: p.display_name, full_name: p.full_name, avatar_url: p.avatar_url });
  }
  return map;
}

export function useCommunityFeed(search: string, travelStyle: string | null) {
  const { user } = useAuth();
  const uid = user?.id ?? '';

  return useInfiniteQuery({
    queryKey: [...communityFeedQueryKey, search.trim(), travelStyle ?? '', uid] as const,
    enabled: Boolean(uid && hasSupabaseEnv && supabase),
    initialPageParam: 0,
    queryFn: async ({ pageParam }: { pageParam: number }): Promise<CommunityRouteVm[]> => {
      if (!supabase) {
        return [];
      }
      const from = pageParam * PAGE;
      const to = from + PAGE - 1;
      let q = supabase.from('ranked_routes').select('*').order('score', { ascending: false });
      const s = search.trim();
      if (s) {
        q = q.ilike('destination', `%${s}%`);
      }
      if (travelStyle) {
        q = q.eq('travel_style', travelStyle);
      }
      const { data: rows, error } = await q.range(from, to);
      if (error) {
        throw error;
      }
      const list = (rows ?? []) as RankedRouteRow[];
      if (list.length === 0) {
        return [];
      }
      const creatorIds = list.map((r) => r.creator_id);
      const profMap = await fetchProfilesMap(creatorIds);
      const routeIds = list.map((r) => r.id);
      let liked = new Set<string>();
      if (uid && routeIds.length > 0) {
        const { data: likes } = await supabase
          .from('community_route_likes')
          .select('route_id')
          .eq('user_id', uid)
          .in('route_id', routeIds);
        liked = new Set((likes ?? []).map((l) => l.route_id));
      }
      return list.map((r) => {
        const p = profMap.get(r.creator_id);
        const name = p?.display_name?.trim() || p?.full_name?.trim() || 'Traveler';
        return {
          ...r,
          creatorName: name,
          creatorAvatar: p?.avatar_url ?? null,
          likedByMe: liked.has(r.id),
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
      const { data: like } = await supabase
        .from('community_route_likes')
        .select('id')
        .eq('route_id', routeId)
        .eq('user_id', uid)
        .maybeSingle();
      const score = scoreFromRouteRow(row);
      return {
        ...(row as RankedRouteRow),
        score,
        creatorName: name,
        creatorAvatar: p?.avatar_url ?? null,
        likedByMe: Boolean(like),
      };
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
      void queryClient.invalidateQueries({ queryKey: ['communityRoute', v.routeId, uid] });
    },
  });
}
