import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommunityMvpCard } from '../../components/CommunityMvpCard';
import {
  useCommunityFeed,
  useToggleRouteLike,
  useToggleRouteSave,
} from '../../lib/hooks/useCommunityRoutes';

const SCREEN_BG = '#F3F4F6';
const ORANGE = '#F05A1A';

type PillId = 'all' | 'solo' | 'couple' | 'family' | 'friends' | 'adventure';

const PILLS: { id: PillId; labelKey: string }[] = [
  { id: 'all', labelKey: 'filterPillAll' },
  { id: 'solo', labelKey: 'style_solo' },
  { id: 'couple', labelKey: 'style_couple' },
  { id: 'family', labelKey: 'style_family' },
  { id: 'friends', labelKey: 'styleFriends' },
  { id: 'adventure', labelKey: 'filterPillAdventure' },
];

function usePerRoutePending() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  const begin = useCallback((id: string) => {
    setCounts((m) => ({ ...m, [id]: (m[id] ?? 0) + 1 }));
  }, []);

  const end = useCallback((id: string) => {
    setCounts((m) => {
      const c = (m[id] ?? 0) - 1;
      if (c <= 0) {
        const next = { ...m };
        delete next[id];
        return next;
      }
      return { ...m, [id]: c };
    });
  }, []);

  const isBusy = (id: string) => (counts[id] ?? 0) > 0;

  return { begin, end, isBusy };
}

export default function CommunityScreen() {
  const { t } = useTranslation('community');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pill, setPill] = useState<PillId>('all');

  const { travelStyle, tagContains } = useMemo(() => {
    switch (pill) {
      case 'solo':
        return { travelStyle: 'solo' as const, tagContains: null };
      case 'couple':
        return { travelStyle: 'couple' as const, tagContains: null };
      case 'family':
        return { travelStyle: 'family' as const, tagContains: null };
      case 'friends':
        return { travelStyle: 'group' as const, tagContains: null };
      case 'adventure':
        return { travelStyle: null, tagContains: 'adventure' as const };
      default:
        return { travelStyle: null, tagContains: null };
    }
  }, [pill]);

  const { data, isPending, isError, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCommunityFeed('', travelStyle, tagContains);

  const toggleLike = useToggleRouteLike();
  const toggleSave = useToggleRouteSave();

  const likePending = usePerRoutePending();
  const savePending = usePerRoutePending();

  const routes = useMemo(() => data?.pages.flat() ?? [], [data]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const renderPills = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingLeft: 20,
        paddingRight: 12,
        gap: 8,
        alignItems: 'center',
        paddingVertical: 16,
      }}
    >
      {PILLS.map((p) => {
        const active = pill === p.id;
        return (
          <Pressable
            key={p.id}
            onPress={() => setPill(p.id)}
            style={{
              height: 36,
              paddingHorizontal: 16,
              borderRadius: 100,
              backgroundColor: active ? ORANGE : '#fff',
              borderWidth: active ? 0 : 1,
              borderColor: '#E5E7EB',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: active ? '#fff' : '#374151',
              }}
            >
              {(t as (k: string) => string)(p.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: SCREEN_BG }}>
      <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 0 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: '#111827' }}>{t('screenTitle')}</Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>{t('screenSubtitle')}</Text>
      </View>

      {renderPills()}

      {isPending && routes.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={ORANGE} size="large" />
        </View>
      ) : isError ? (
        <Text style={{ textAlign: 'center', color: '#6B7280', padding: 24 }}>{t('errorLoad')}</Text>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={routes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CommunityMvpCard
              route={item}
              onToggleHeart={() => {
                const routeId = item.id;
                likePending.begin(routeId);
                toggleLike.mutate(
                  { routeId, liked: item.likedByMe },
                  { onSettled: () => likePending.end(routeId) },
                );
              }}
              onToggleSave={() => {
                const routeId = item.id;
                savePending.begin(routeId);
                toggleSave.mutate(
                  { routeId, saved: item.savedByMe },
                  { onSettled: () => savePending.end(routeId) },
                );
              }}
              heartBusy={likePending.isBusy(item.id)}
              saveBusy={savePending.isBusy(item.id)}
            />
          )}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={ORANGE} />
            ) : null
          }
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: '#6B7280', paddingVertical: 40, paddingHorizontal: 24 }}>
              {t('emptyFeed')}
            </Text>
          }
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
          contentContainerStyle={{ paddingBottom: 12 }}
        />
      )}

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: insets.bottom + 16,
          backgroundColor: SCREEN_BG,
        }}
      >
        <Pressable
          onPress={() => router.push('/trip/import')}
          style={{
            height: 52,
            borderRadius: 100,
            backgroundColor: ORANGE,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
          accessibilityRole="button"
          accessibilityLabel={t('sharePastTrip')}
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>{t('sharePastTrip')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
