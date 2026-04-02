import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommunityRouteCard } from '../../components/CommunityRouteCard';
import { colors } from '../../constants/colors';
import { TRAVEL_STYLE_IDS } from '../../lib/community/constants';
import {
  useCommunityFeed,
  useToggleRouteLike,
  useToggleRouteSave,
  useMarkRouteUsed,
} from '../../lib/hooks/useCommunityRoutes';

/** Per-route in-flight counts so concurrent actions on different cards (or stacked on one) stay correct. */
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
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [styleFilter, setStyleFilter] = useState<string | null>(null);

  const { data, isPending, isError, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCommunityFeed(debounced, styleFilter);

  const toggleLike = useToggleRouteLike();
  const toggleSave = useToggleRouteSave();
  const markUsed = useMarkRouteUsed();

  const likePending = usePerRoutePending();
  const savePending = usePerRoutePending();
  const usedPending = usePerRoutePending();

  const routes = useMemo(() => data?.pages.flat() ?? [], [data]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, paddingHorizontal: 16, marginBottom: 12 }}>
        {t('screenTitle')}
      </Text>

      <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => setDebounced(search)}
          placeholder={t('searchPlaceholder')}
          placeholderTextColor={colors.inactive}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            color: colors.text,
            backgroundColor: '#fff',
          }}
          returnKeyType="search"
        />
        <Pressable
          onPress={() => setDebounced(search)}
          style={{
            marginTop: 8,
            alignSelf: 'flex-start',
            paddingVertical: 8,
            paddingHorizontal: 14,
            backgroundColor: colors.primarySolid,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{t('searchButton')}</Text>
        </Pressable>
      </View>

      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.inactive, paddingHorizontal: 16, marginBottom: 8 }}>
        {t('filterTravelStyle')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 12 }}>
        <Pressable
          onPress={() => setStyleFilter(null)}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 20,
            backgroundColor: styleFilter === null ? colors.primarySolid : '#F3F4F6',
          }}
        >
          <Text style={{ fontWeight: '700', color: styleFilter === null ? colors.onPrimary : colors.text }}>{t('filterAll')}</Text>
        </Pressable>
        {TRAVEL_STYLE_IDS.map((s) => (
          <Pressable
            key={s}
            onPress={() => setStyleFilter((cur) => (cur === s ? null : s))}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 20,
              backgroundColor: styleFilter === s ? colors.primarySolid : '#F3F4F6',
            }}
          >
            <Text style={{ fontWeight: '700', color: styleFilter === s ? colors.onPrimary : colors.text }}>
              {(t as (k: string) => string)(`style_${s}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {isPending && routes.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primarySolid} size="large" />
        </View>
      ) : isError ? (
        <Text style={{ textAlign: 'center', color: colors.inactive, padding: 24 }}>{t('errorLoad')}</Text>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CommunityRouteCard
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
              onMarkUsed={() => {
                const routeId = item.id;
                usedPending.begin(routeId);
                markUsed.mutate({ routeId }, { onSettled: () => usedPending.end(routeId) });
              }}
              heartBusy={likePending.isBusy(item.id)}
              saveBusy={savePending.isBusy(item.id)}
              usedBusy={usedPending.isBusy(item.id)}
            />
          )}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primarySolid} />
            ) : null
          }
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: colors.inactive, paddingVertical: 40, paddingHorizontal: 24 }}>
              {t('emptyFeed')}
            </Text>
          }
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        />
      )}
    </View>
  );
}
