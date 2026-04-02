import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyTrips } from '../../components/EmptyTrips';
import { TripCard } from '../../components/TripCard';
import { TripSwitcher } from '../../components/TripSwitcher';
import { colors } from '../../constants/colors';
import { formatErrorMessage } from '../../lib/formatError';
import { useAuth } from '../../lib/hooks/useAuth';
import { FREE_OWNER_TRIP_LIMIT, useSubscription } from '../../lib/hooks/useSubscription';
import { useMyTrips } from '../../lib/hooks/useTrips';
import { tripRowToSnapshot, useAppStore } from '../../lib/store/appStore';
import { pickFeaturedTripForHome, sortTripsForHome } from '../../lib/trips/tripUi';

const SCROLL_END_PADDING = 88;
const FAB_BACKGROUND = '#FF6B35';

export default function HomeTripsScreen() {
  const { t } = useTranslation(['trips', 'common']);
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: trips = [], isLoading, isError, error, refetch, isRefetching } = useMyTrips();
  const { isExplorer } = useSubscription();
  const activeTrip = useAppStore((s) => s.activeTrip);
  const setActiveTrip = useAppStore((s) => s.setActiveTrip);
  const userId = user?.id ?? '';

  const ownedTripCount = useMemo(() => trips.filter((t) => t.created_by === userId).length, [trips, userId]);
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

  const fabBottom = useMemo(() => Math.max(insets.bottom, 8) + 14, [insets.bottom]);
  const sortedTrips = useMemo(() => sortTripsForHome(trips), [trips]);

  useEffect(() => {
    if (!sortedTrips.length) {
      return;
    }
    if (activeTrip && !sortedTrips.some((x) => x.id === activeTrip.id)) {
      setActiveTrip(null);
      return;
    }
    const featured = pickFeaturedTripForHome(sortedTrips, activeTrip?.id ?? null);
    if (!featured) {
      return;
    }
    if (!activeTrip || activeTrip.id !== featured.id) {
      setActiveTrip(tripRowToSnapshot(featured));
    }
  }, [sortedTrips, activeTrip, setActiveTrip]);

  const { active, others } = useMemo(() => {
    if (!sortedTrips.length) {
      return { active: null as (typeof sortedTrips)[0] | null, others: [] as typeof sortedTrips };
    }
    const featured = pickFeaturedTripForHome(sortedTrips, activeTrip?.id ?? null);
    const a = featured ?? sortedTrips[0];
    const rest = sortedTrips.filter((x) => x.id !== a.id);
    return { active: a, others: rest };
  }, [sortedTrips, activeTrip?.id]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: colors.text, textAlign: 'center', marginBottom: 16 }}>
          {formatErrorMessage(error, t('trips:errorLoadTrips'))}
        </Text>
        <Pressable
          onPress={() => void refetch()}
          style={{ paddingVertical: 12, paddingHorizontal: 20, backgroundColor: colors.primarySolid, borderRadius: 12 }}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: '600' }}>{t('common:retry')}</Text>
        </Pressable>
      </View>
    );
  }

  if (!trips.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8, overflow: 'visible' }}>
        <View style={{ flex: 1 }}>
          <EmptyTrips onCreatePress={goNewTrip} />
        </View>
        <FabOverlay onPress={goNewTrip} onLongPress={showTripOptions} bottom={fabBottom} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8, overflow: 'visible' }}>
      <Text
        style={{
          fontSize: 28,
          fontWeight: '800',
          color: colors.text,
          paddingHorizontal: 20,
          marginBottom: 16,
        }}
      >
        {t('trips:homeTitle')}
      </Text>
      <TripSwitcher />
      <View style={{ flex: 1, position: 'relative' }} collapsable={false}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: SCROLL_END_PADDING }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.primary} />
          }
        >
          {active ? (
            <View style={{ marginBottom: 8 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: colors.primary,
                  marginBottom: 8,
                  marginLeft: 4,
                }}
              >
                {t('trips:activeTrip')}
              </Text>
              <TripCard trip={active} variant="highlighted" currentUserId={userId} />
            </View>
          ) : null}
          {others.length > 0 ? (
            <>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: colors.inactive,
                  marginBottom: 8,
                  marginLeft: 4,
                  marginTop: 8,
                }}
              >
                {t('trips:otherTrips')}
              </Text>
              {others.map((trip) => (
                <TripCard key={trip.id} trip={trip} variant="default" currentUserId={userId} />
              ))}
            </>
          ) : null}
        </ScrollView>
        <FabOverlay onPress={goNewTrip} onLongPress={showTripOptions} bottom={fabBottom} />
      </View>
    </View>
  );
}

function FabOverlay({ onPress, onLongPress, bottom }: { onPress: () => void; onLongPress?: () => void; bottom: number }) {
  const { t } = useTranslation('trips');

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 9999,
      }}
      collapsable={false}
    >
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          right: 16,
          bottom,
        }}
        collapsable={false}
      >
        <View
          style={{
            alignSelf: 'flex-end',
            borderRadius: 360,
            overflow: 'hidden',
            backgroundColor: colors.primary,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.38,
            shadowRadius: 20,
            elevation: Platform.OS === 'android' ? 12 : 0,
          }}
          collapsable={false}
        >
          <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 14,
              paddingHorizontal: 24,
              backgroundColor: FAB_BACKGROUND,
              opacity: pressed ? 0.9 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel={t('fabCreateA11y')}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 17, paddingHorizontal: 10, paddingVertical: 10 }}>
              {t('fabNewTrip')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
