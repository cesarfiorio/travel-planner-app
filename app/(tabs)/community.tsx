import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommunityMvpCard } from '../../components/CommunityMvpCard';
import { COLORS, FONT } from '../../constants/theme';
import { useAuth } from '../../lib/hooks/useAuth';
import {
  useCommunityFeed,
  useToggleRouteLike,
  useToggleRouteSave,
} from '../../lib/hooks/useCommunityRoutes';

const SCREEN_BG = COLORS.cardBg;

type PillId = 'all' | 'solo' | 'couple' | 'family' | 'friends';

const PILLS: { id: PillId; labelKey: string }[] = [
  { id: 'all', labelKey: 'filterPillAll' },
  { id: 'solo', labelKey: 'style_solo' },
  { id: 'couple', labelKey: 'style_couple' },
  { id: 'family', labelKey: 'style_family' },
  { id: 'friends', labelKey: 'styleFriends' },
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

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [pill, setPill] = useState<PillId>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchInput.trim()), 320);
    return () => clearTimeout(timeout);
  }, [searchInput]);

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
      default:
        return { travelStyle: null, tagContains: null };
    }
  }, [pill]);

  const { data, isPending, isError, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCommunityFeed(debouncedSearch, travelStyle, tagContains);

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
      style={{ flexGrow: 0 }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        gap: 8,
        alignItems: 'center',
        paddingTop: 4,
        paddingBottom: 8,
      }}
    >
      {PILLS.map((p) => {
        const active = pill === p.id;
        return (
          <Pressable
            key={p.id}
            onPress={() => setPill(p.id)}
            style={{
              height: 32,
              paddingHorizontal: 14,
              borderRadius: 100,
              backgroundColor: active ? COLORS.primary : COLORS.cardBg,
              borderWidth: active ? 0 : 1,
              borderColor: COLORS.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={{
                fontSize: FONT.base,
                fontWeight: FONT.semibold,
                color: active ? COLORS.textOnPrimary : COLORS.textSecondary,
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
      <View
        style={{
          paddingTop: insets.top + 4,
          paddingHorizontal: 20,
          paddingBottom: 2,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: FONT.bold, color: COLORS.textPrimary, letterSpacing: -0.3 }}>
            {t('screenTitle')}
          </Text>
          <Text style={{ fontSize: FONT.sm, color: COLORS.textSecondary, marginTop: 1, lineHeight: 16 }}>
            {t('screenSubtitle')}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 14,
            backgroundColor: COLORS.cardBg,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={COLORS.textTertiary}
            style={{
              flex: 1,
              fontSize: FONT.base,
              color: COLORS.textPrimary,
              paddingVertical: 0,
            }}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel={t('searchA11y')}
          />
          {searchInput.length > 0 ? (
            <Pressable
              onPress={() => setSearchInput('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('searchClearA11y')}
            >
              <Ionicons name="close-circle" size={22} color={COLORS.textTertiary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {renderPills()}

      {isPending && routes.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : isError ? (
        <Text style={{ textAlign: 'center', color: COLORS.textSecondary, padding: 24 }}>{t('errorLoad')}</Text>
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
            <View style={{ paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
              {isFetchingNextPage ? (
                <ActivityIndicator style={{ marginVertical: 16 }} color={COLORS.primary} />
              ) : null}
              {userId ? (
                <Pressable
                  onPress={() => router.push('/trip/new')}
                  style={{
                    marginHorizontal: 20,
                    marginTop: isFetchingNextPage ? 8 : 4,
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderRadius: 14,
                    backgroundColor: COLORS.primary,
                    alignItems: 'center',
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('sharePastTrip')}
                >
                  <Text style={{ fontSize: FONT.md, fontWeight: FONT.bold, color: COLORS.textOnPrimary }}>
                    {t('sharePastTrip')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: COLORS.textSecondary, paddingVertical: 4, paddingHorizontal: 2 }}>
              {t('emptyFeed')}
            </Text>
          }
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: 0,
            paddingBottom: 8,
          }}
        />
      )}
    </View>
  );
}
