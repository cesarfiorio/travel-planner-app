import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../constants/colors';
import { COLORS, FONT, RADIUS, SPACING } from '../../constants/theme';
import { formatErrorMessage } from '../../lib/formatError';
import { useAuth } from '../../lib/hooks/useAuth';
import { useDeleteTrip, useMyTrips, type TripWithDetails } from '../../lib/hooks/useTrips';
import { parseLocalDate, primaryTripEntryPath } from '../../lib/trips/tripUi';
import { useAppStore } from '../../lib/store/appStore';

function formatTripDates(trip: TripWithDetails, locale: string): string {
  const s = trip.start_date ? parseLocalDate(trip.start_date) : null;
  const e = trip.end_date ? parseLocalDate(trip.end_date) : null;
  if (!s && !e) {
    return '—';
  }
  const df = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  if (s && e) {
    return `${df.format(s)} – ${df.format(e)}`;
  }
  if (s) {
    return df.format(s);
  }
  return e ? df.format(e) : '—';
}

export default function PastTripsScreen() {
  const { t, i18n } = useTranslation(['trips', 'common', 'profile']);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { data: trips = [], isLoading, isError, error, refetch } = useMyTrips();
  const deleteTripMut = useDeleteTrip();
  const setActiveTrip = useAppStore((s) => s.setActiveTrip);

  const locale =
    i18n.language.split('-')[0] === 'pt'
      ? 'pt-BR'
      : i18n.language.split('-')[0] === 'en'
        ? 'en-US'
        : i18n.language;

  const pastTrips = useMemo(() => {
    return trips
      .filter((tr) => tr.created_by === userId && tr.status === 'completed')
      .sort((a, b) => {
        const ae = a.end_date ?? '';
        const be = b.end_date ?? '';
        return be.localeCompare(ae);
      });
  }, [trips, userId]);

  const openMenu = (trip: TripWithDetails) => {
    Alert.alert(trip.name, undefined, [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('trips:menuEditTrip'),
        onPress: () => router.push(`/trip/${trip.id}/edit`),
      },
      {
        text: t('trips:menuOpenTrip'),
        onPress: () => {
          setActiveTrip({
            id: trip.id,
            name: trip.name,
            destination_label: trip.destination_label,
            start_date: trip.start_date,
            end_date: trip.end_date,
            status: trip.status,
            created_by: trip.created_by,
          });
          router.push(primaryTripEntryPath(trip));
        },
      },
      {
        text: t('trips:actionDelete'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(t('trips:deleteTripTitle'), t('trips:deleteTripBody', { name: trip.name }), [
            { text: t('common:cancel'), style: 'cancel' },
            {
              text: t('trips:deleteTripConfirm'),
              style: 'destructive',
              onPress: () =>
                deleteTripMut.mutate(trip.id, {
                  onSuccess: () => void refetch(),
                  onError: (e) =>
                    Alert.alert(t('trips:errorTitle'), formatErrorMessage(e, t('trips:errorDeleteFailed'))),
                }),
            },
          ]),
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + SPACING.sm }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.xl,
          paddingBottom: SPACING.lg,
        }}
      >
        <Pressable
          onPress={() => router.replace('/(tabs)/profile')}
          hitSlop={SPACING.md}
          accessibilityRole="button"
          accessibilityLabel={t('profile:pastTripsBackToProfileA11y')}
        >
          <Ionicons name="arrow-back" size={FONT.xxl + SPACING.xs} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, marginLeft: SPACING.sm, fontSize: FONT.h2, fontWeight: FONT.bold, color: colors.text }}>
          {t('trips:pastTripsTitle')}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={{ paddingHorizontal: SPACING.xl }}>
          <Text style={{ color: colors.text, textAlign: 'center', marginBottom: SPACING.lg }}>{formatErrorMessage(error, t('trips:errorLoadTrips'))}</Text>
          <Pressable
            onPress={() => void refetch()}
            style={{ alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 20, backgroundColor: COLORS.primary, borderRadius: RADIUS.md }}
          >
            <Text style={{ color: COLORS.textOnPrimary, fontWeight: FONT.semibold }}>{t('common:retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={pastTrips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: SPACING.xl,
            paddingBottom: insets.bottom + SPACING.xl,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: colors.inactive, marginTop: SPACING.xxxl, lineHeight: 22 }}>{t('trips:pastTripsEmpty')}</Text>
          }
          renderItem={({ item }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORS.cardBg,
                borderRadius: RADIUS.lg,
                borderWidth: 1,
                borderColor: COLORS.border,
                paddingVertical: SPACING.md,
                paddingLeft: SPACING.lg,
                paddingRight: SPACING.sm,
                marginBottom: SPACING.md,
              }}
            >
              <Pressable
                style={{ flex: 1, minWidth: 0 }}
                onPress={() => {
                  setActiveTrip({
                    id: item.id,
                    name: item.name,
                    destination_label: item.destination_label,
                    start_date: item.start_date,
                    end_date: item.end_date,
                    status: item.status,
                    created_by: item.created_by,
                  });
                  router.push(primaryTripEntryPath(item));
                }}
                accessibilityRole="button"
                accessibilityLabel={t('trips:pastTripsRowA11y', { name: item.name })}
              >
                <Text style={{ fontSize: FONT.md, fontWeight: FONT.bold, color: COLORS.textPrimary }} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={{ fontSize: FONT.sm, color: COLORS.textSecondary, marginTop: SPACING.xs }} numberOfLines={1}>
                  {item.destination_label?.trim() || t('trips:noDestination')}
                </Text>
                <Text style={{ fontSize: FONT.sm, color: COLORS.textTertiary, marginTop: SPACING.xs }}>{formatTripDates(item, locale)}</Text>
              </Pressable>
              <Pressable
                onPress={() => openMenu(item)}
                hitSlop={SPACING.md}
                style={{ padding: SPACING.sm }}
                accessibilityRole="button"
                accessibilityLabel={t('trips:pastTripsMenuA11y', { name: item.name })}
              >
                <Ionicons name="ellipsis-vertical" size={FONT.xl} color={COLORS.textSecondary} />
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}
