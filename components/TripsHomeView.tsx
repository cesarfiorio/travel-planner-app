import * as Localization from 'expo-localization';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyTrips } from './EmptyTrips';
import { FeaturedActiveTripCard } from './FeaturedActiveTripCard';
import { NewTripFab } from './NewTripFab';
import { SimpleTripListCard } from './SimpleTripListCard';

import { colors } from '../constants/colors';
import { formatErrorMessage } from '../lib/formatError';
import { useAuth } from '../lib/hooks/useAuth';
import { FREE_OWNER_TRIP_LIMIT, useSubscription } from '../lib/hooks/useSubscription';
import { useMyTrips } from '../lib/hooks/useTrips';
import { tripRowToSnapshot, useAppStore } from '../lib/store/appStore';
import { pickFeaturedTripForHome, sortTripsForHome } from '../lib/trips/tripUi';

const SCREEN_BG = '#FFFFFF';
const SCROLL_BOTTOM_PADDING = 120;
const ORANGE = '#F05A1A';

type Props = {
  /** Profile tab shows a link to account & settings. */
  showAccountLink?: boolean;
};

export function TripsHomeView({ showAccountLink = false }: Props) {
  const { t } = useTranslation(['trips', 'common', 'profile']);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locale = Localization.getLocales()[0]?.languageTag ?? 'en-US';
  const { user } = useAuth();
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

  if (!trips.length) {
    return (
      <View style={{ flex: 1, backgroundColor: SCREEN_BG, paddingTop: insets.top + 8, overflow: 'visible' }}>
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

      <View style={{ flex: 1 }} collapsable={false}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: SCROLL_BOTTOM_PADDING }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={ORANGE} />}
          showsVerticalScrollIndicator={false}
        >
          {active ? <FeaturedActiveTripCard trip={active} locale={locale} /> : null}

          {others.length > 0 ? (
            <>
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
              {others.map((trip) => (
                <SimpleTripListCard key={trip.id} trip={trip} locale={locale} />
              ))}
            </>
          ) : null}

          {showAccountLink ? (
            <Pressable
              onPress={() => router.push('/(stack)/account')}
              style={({ pressed }) => ({
                marginTop: 24,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 18,
                paddingHorizontal: 18,
                borderRadius: 16,
                backgroundColor: '#F8F9FA',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                opacity: pressed ? 0.92 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel={t('profile:accountSettings')}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{t('profile:accountSettings')}</Text>
              <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
            </Pressable>
          ) : null}
        </ScrollView>
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
