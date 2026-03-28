import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
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
import { useAuth } from '../../lib/hooks/useAuth';
import { useMyTrips } from '../../lib/hooks/useTrips';
import { tripRowToSnapshot, useAppStore } from '../../lib/store/appStore';

export default function ExploreHomeScreen() {
  const { t } = useTranslation(['trips', 'common']);
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: trips = [], isLoading, isError, error, refetch, isRefetching } = useMyTrips();
  const activeTrip = useAppStore((s) => s.activeTrip);
  const setActiveTrip = useAppStore((s) => s.setActiveTrip);
  const userId = user?.id ?? '';

  useEffect(() => {
    if (!trips.length) {
      return;
    }
    if (activeTrip && !trips.some((x) => x.id === activeTrip.id)) {
      setActiveTrip(null);
      return;
    }
    if (!activeTrip && trips.length > 0) {
      setActiveTrip(tripRowToSnapshot(trips[0]));
    }
  }, [trips, activeTrip, setActiveTrip]);

  const { active, others } = useMemo(() => {
    if (!trips.length) {
      return { active: null as (typeof trips)[0] | null, others: [] as typeof trips };
    }
    const id = activeTrip?.id;
    const a = id ? trips.find((x) => x.id === id) ?? trips[0] : trips[0];
    const rest = trips.filter((x) => x.id !== a.id);
    return { active: a, others: rest };
  }, [trips, activeTrip?.id]);

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
          {error instanceof Error ? error.message : t('trips:errorLoadTrips')}
        </Text>
        <Pressable
          onPress={() => void refetch()}
          style={{ paddingVertical: 12, paddingHorizontal: 20, backgroundColor: colors.primary, borderRadius: 12 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common:retry')}</Text>
        </Pressable>
      </View>
    );
  }

  if (!trips.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
        <EmptyTrips onCreatePress={() => router.push('/trip/new')} />
        <Pressable
          onPress={() => router.push('/trip/new')}
          style={({ pressed }) => ({
            position: 'absolute',
            right: 20,
            bottom: Math.max(insets.bottom, 20) + 56,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.9 : 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 4,
          })}
          accessibilityRole="button"
          accessibilityLabel={t('trips:fabCreateA11y')}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
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
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
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
      <Pressable
        onPress={() => router.push('/trip/new')}
        style={({ pressed }) => ({
          position: 'absolute',
          right: 20,
          bottom: Math.max(insets.bottom, 20) + 56,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.9 : 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 4,
        })}
        accessibilityRole="button"
        accessibilityLabel={t('trips:fabCreateA11y')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}
