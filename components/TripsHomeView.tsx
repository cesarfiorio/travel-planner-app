import * as Localization from 'expo-localization';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ListRenderItem,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from './Avatar';
import { EmptyTrips } from './EmptyTrips';
import { FeaturedActiveTripCard } from './FeaturedActiveTripCard';
import { NewTripFab } from './NewTripFab';
import { SimpleTripListCard } from './SimpleTripListCard';

import { colors } from '../constants/colors';
import { formatErrorMessage } from '../lib/formatError';
import { useAuth } from '../lib/hooks/useAuth';
import { useProfile } from '../lib/hooks/useProfile';
import { FREE_OWNER_TRIP_LIMIT, useSubscription } from '../lib/hooks/useSubscription';
import { type TripWithDetails, useMyTrips } from '../lib/hooks/useTrips';
import { tripRowToSnapshot, useAppStore } from '../lib/store/appStore';
import { pickFeaturedTripForHome, sortTripsForHome, tripsForHomeTripList } from '../lib/trips/tripUi';

/** Light gray so white trip cards (SimpleTripListCard) read clearly against the screen. */
const SCREEN_BG = '#FAFAFA';
const SCROLL_BOTTOM_PADDING = 120;
const ORANGE = '#F05A1A';

type Props = {
  /** Profile tab: header avatar opens account; no account row in the list. */
  showAccountLink?: boolean;
};

export function TripsHomeView({ showAccountLink = false }: Props) {
  const { t } = useTranslation(['trips', 'common', 'profile']);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locale = Localization.getLocales()[0]?.languageTag ?? 'en-US';
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: trips = [], isLoading, isError, error, refetch, isRefetching } = useMyTrips();
  const { isExplorer } = useSubscription();
  const activeTrip = useAppStore((s) => s.activeTrip);
  const setActiveTrip = useAppStore((s) => s.setActiveTrip);
  const userId = user?.id ?? '';

  const ownedTripCount = useMemo(() => trips.filter((tr) => tr.created_by === userId).length, [trips, userId]);
  const atTripLimit = !isExplorer && ownedTripCount >= FREE_OWNER_TRIP_LIMIT;

  const goNewTrip = () => {
    if (atTripLimit) {
      router.push('/(stack)/paywall');
      return;
    }
    router.push('/trip/new');
  };

  const showTripOptions = () => {
    Alert.alert(t('trips:fabOptionsTitle'), undefined, [
      { text: t('trips:fabNewTrip'), onPress: goNewTrip },
      { text: t('trips:fabLogPast'), onPress: () => router.push('/trip/import') },
      { text: t('common:cancel'), style: 'cancel' },
    ]);
  };

  const fabBottom = Math.max(insets.bottom, 10) + 24;
  const homeTrips = useMemo(() => tripsForHomeTripList(trips), [trips]);
  const sortedTrips = useMemo(() => sortTripsForHome(homeTrips), [homeTrips]);

  const accountDisplayName =
    profile?.full_name?.trim() || profile?.display_name?.trim() || t('profile:travelerFallback');

  const goAccount = () => router.push('/(stack)/account');

  const activeTripFull = useMemo((): TripWithDetails | null => {
    if (!activeTrip?.id) {
      return null;
    }
    return trips.find((t) => t.id === activeTrip.id) ?? null;
  }, [trips, activeTrip?.id]);

  /** Keep Explore / Itinerary / Expenses wired to past trips: don't clear activeTrip just because completed trips are excluded from the home subset. */
  useEffect(() => {
    if (!trips.length) {
      if (activeTrip) {
        setActiveTrip(null);
      }
      return;
    }
    if (activeTrip && !trips.some((x) => x.id === activeTrip.id)) {
      setActiveTrip(null);
      return;
    }
    if (activeTrip && !sortedTrips.some((x) => x.id === activeTrip.id)) {
      return;
    }
    if (!sortedTrips.length) {
      return;
    }
    const featured = pickFeaturedTripForHome(sortedTrips, activeTrip?.id ?? null);
    if (!featured) {
      return;
    }
    if (!activeTrip || activeTrip.id !== featured.id) {
      setActiveTrip(tripRowToSnapshot(featured));
    }
  }, [trips, sortedTrips, activeTrip, setActiveTrip]);

  const { active, others } = useMemo(() => {
    if (!sortedTrips.length) {
      if (activeTripFull) {
        return { active: activeTripFull, others: [] as typeof sortedTrips };
      }
      return { active: null as (typeof sortedTrips)[0] | null, others: [] as typeof sortedTrips };
    }
    if (activeTripFull && sortedTrips.some((x) => x.id === activeTripFull.id)) {
      const featured = pickFeaturedTripForHome(sortedTrips, activeTrip?.id ?? null);
      const a = featured ?? sortedTrips[0];
      const rest = sortedTrips.filter((x) => x.id !== a.id);
      return { active: a, others: rest };
    }
    if (activeTripFull) {
      return { active: activeTripFull, others: sortedTrips };
    }
    const featured = pickFeaturedTripForHome(sortedTrips, null);
    const a = featured ?? sortedTrips[0];
    const rest = sortedTrips.filter((x) => x.id !== a.id);
    return { active: a, others: rest };
  }, [sortedTrips, activeTrip?.id, activeTripFull]);

  const profileTripSelectOnly = Boolean(showAccountLink);

  const renderTripRow: ListRenderItem<TripWithDetails> = useCallback(
    ({ item }) => (
      <SimpleTripListCard
        trip={item}
        locale={locale}
        selectActiveOnly={profileTripSelectOnly}
        showProfileOverflow={profileTripSelectOnly}
        currentUserId={userId}
      />
    ),
    [locale, profileTripSelectOnly, userId],
  );

  const listHeader = useMemo(
    () => (
      <>
        {active ? (
          <FeaturedActiveTripCard
            trip={active}
            locale={locale}
            selectActiveOnly={profileTripSelectOnly}
            showProfileOverflow={profileTripSelectOnly}
            currentUserId={userId}
          />
        ) : null}
        {others.length > 0 ? (
          <Text
            style={{
              fontSize: 17,
              fontWeight: '800',
              color: '#111827',
              marginBottom: 12,
              marginTop: active ? 8 : 0,
            }}
          >
            {t('trips:otherTrips')}
          </Text>
        ) : null}
      </>
    ),
    [active, others.length, locale, t, profileTripSelectOnly, userId],
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: SCREEN_BG }}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: SCREEN_BG }}>
        <Text style={{ color: colors.text, textAlign: 'center', marginBottom: 16 }}>
          {formatErrorMessage(error, t('trips:errorLoadTrips'))}
        </Text>
        <Pressable
          onPress={() => void refetch()}
          style={{ paddingVertical: 12, paddingHorizontal: 20, backgroundColor: ORANGE, borderRadius: 12 }}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: '600' }}>{t('common:retry')}</Text>
        </Pressable>
      </View>
    );
  }

  if (!homeTrips.length && trips.length > 0) {
    return (
      <View style={{ flex: 1, backgroundColor: SCREEN_BG, paddingTop: insets.top + 8, overflow: 'visible' }}>
        {showAccountLink ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: 28,
                fontWeight: '800',
                color: '#111827',
                letterSpacing: -0.5,
                marginRight: 12,
              }}
              numberOfLines={1}
            >
              {t('trips:homeTitle')}
            </Text>
            <Pressable
              onPress={goAccount}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('profile:accountSettings')}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <Avatar name={accountDisplayName} imageUrl={profile?.avatar_url} size={44} />
            </Pressable>
          </View>
        ) : (
          <Text
            style={{
              fontSize: 28,
              fontWeight: '800',
              color: '#111827',
              paddingHorizontal: 20,
              marginBottom: 16,
              letterSpacing: -0.5,
            }}
          >
            {t('trips:homeTitle')}
          </Text>
        )}
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>
          <Text style={{ fontSize: 16, color: '#4B5563', lineHeight: 24, textAlign: 'center', marginBottom: 20 }}>
            {t('trips:homeOnlyPastTripsHint')}
          </Text>
          <Pressable
            onPress={() => router.push('/(stack)/past-trips')}
            style={{
              alignSelf: 'center',
              paddingVertical: 14,
              paddingHorizontal: 24,
              backgroundColor: ORANGE,
              borderRadius: 12,
            }}
            accessibilityRole="button"
            accessibilityLabel={t('trips:homeOpenPastTripsA11y')}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{t('trips:pastTripsTitle')}</Text>
          </Pressable>
        </View>
        <NewTripFab
          bottom={fabBottom}
          label={t('trips:fabNewTrip')}
          accessibilityLabel={t('trips:fabCreateA11y')}
          onPress={goNewTrip}
          onLongPress={showTripOptions}
        />
      </View>
    );
  }

  if (!trips.length) {
    return (
      <View style={{ flex: 1, backgroundColor: SCREEN_BG, paddingTop: insets.top + 8, overflow: 'visible' }}>
        {showAccountLink ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: 28,
                fontWeight: '800',
                color: '#111827',
                letterSpacing: -0.5,
                marginRight: 12,
              }}
              numberOfLines={1}
            >
              {t('trips:homeTitle')}
            </Text>
            <Pressable
              onPress={goAccount}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('profile:accountSettings')}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <Avatar name={accountDisplayName} imageUrl={profile?.avatar_url} size={44} />
            </Pressable>
          </View>
        ) : (
          <Text
            style={{
              fontSize: 28,
              fontWeight: '800',
              color: '#111827',
              paddingHorizontal: 20,
              marginBottom: 16,
              letterSpacing: -0.5,
            }}
          >
            {t('trips:homeTitle')}
          </Text>
        )}
        <View style={{ flex: 1 }}>
          <EmptyTrips onCreatePress={goNewTrip} />
        </View>
        <NewTripFab
          bottom={fabBottom}
          label={t('trips:fabNewTrip')}
          accessibilityLabel={t('trips:fabCreateA11y')}
          onPress={goNewTrip}
          onLongPress={showTripOptions}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: SCREEN_BG, paddingTop: insets.top + 8, overflow: 'visible' }}>
      {showAccountLink ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              flex: 1,
              fontSize: 28,
              fontWeight: '800',
              color: '#111827',
              letterSpacing: -0.5,
              marginRight: 12,
            }}
            numberOfLines={1}
          >
            {t('trips:homeTitle')}
          </Text>
          <Pressable
            onPress={goAccount}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('profile:accountSettings')}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <Avatar name={accountDisplayName} imageUrl={profile?.avatar_url} size={44} />
          </Pressable>
        </View>
      ) : (
        <Text
          style={{
            fontSize: 28,
            fontWeight: '800',
            color: '#111827',
            paddingHorizontal: 20,
            marginBottom: 20,
            letterSpacing: -0.5,
          }}
        >
          {t('trips:homeTitle')}
        </Text>
      )}

      <View style={{ flex: 1 }} collapsable={false}>
        <FlatList
          data={others}
          keyExtractor={(item) => item.id}
          renderItem={renderTripRow}
          ListHeaderComponent={listHeader}
          style={{ flex: 1, backgroundColor: SCREEN_BG }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: SCROLL_BOTTOM_PADDING }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={ORANGE} />}
          showsVerticalScrollIndicator
          initialNumToRender={12}
          windowSize={8}
          removeClippedSubviews={false}
        />
      </View>

      <NewTripFab
        bottom={fabBottom}
        label={t('trips:fabNewTrip')}
        accessibilityLabel={t('trips:fabCreateA11y')}
        onPress={goNewTrip}
        onLongPress={showTripOptions}
      />
    </View>
  );
}
