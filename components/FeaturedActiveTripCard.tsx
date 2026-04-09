import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { formatItineraryDestinationSubtitle } from '../lib/itinerary/itinerarySubtitle';
import type { TripWithDetails } from '../lib/hooks/useTrips';
import { tripRowToSnapshot, useAppStore } from '../lib/store/appStore';
import { deriveTripUiStatus, primaryTripEntryPath } from '../lib/trips/tripUi';
import { formatTripHeroDateRange } from '../lib/trips/tripDateFormat';

const ORANGE = '#F05A1A';
const CARD_RADIUS = 16;
const HERO_H = 220;

/** Rotate hero photos for visual variety (Unsplash). */
const HERO_URLS = [
  'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1200&q=80',
  'https://images.unsplash.com/photo-1564594736624-def7a10ab047?w=1200&q=80',
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80',
] as const;

function heroUrlForTripId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h + id.charCodeAt(i)) >>> 0;
  }
  return HERO_URLS[h % HERO_URLS.length];
}

type Props = {
  trip: TripWithDetails;
  locale: string;
  /** When true (e.g. profile tab), CTA only sets the active trip for the tab bar—no trip hub navigation. */
  selectActiveOnly?: boolean;
};

export function FeaturedActiveTripCard({ trip, locale, selectActiveOnly = false }: Props) {
  const { t } = useTranslation('trips');
  const router = useRouter();
  const setActiveTrip = useAppStore((s) => s.setActiveTrip);

  const uiStatus = deriveTripUiStatus(trip);
  const badgeLabel =
    uiStatus === 'active'
      ? t('featuredTripBadgeActive')
      : uiStatus === 'planning'
        ? t('featuredTripBadgePlanning')
        : uiStatus === 'completed'
          ? t('featuredTripBadgeCompleted')
          : t('featuredTripBadgeArchived');

  const destLine = formatItineraryDestinationSubtitle(trip.destination_label, trip.name);
  const dateLine = formatTripHeroDateRange(trip.start_date, trip.end_date, locale);

  const openDetail = () => {
    setActiveTrip(tripRowToSnapshot(trip));
    if (!selectActiveOnly) {
      router.push(primaryTripEntryPath(trip));
    }
  };

  const ctaLabel = selectActiveOnly ? t('switchTripTitle') : t('viewDetails');

  return (
    <View
      style={{
        marginBottom: 8,
        borderRadius: CARD_RADIUS,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.14,
        shadowRadius: 10,
        elevation: 5,
      }}
    >
      <View style={{ borderRadius: CARD_RADIUS, overflow: 'hidden' }}>
      <View style={{ height: HERO_H, width: '100%', backgroundColor: '#E5E7EB' }}>
        <Image source={{ uri: heroUrlForTripId(trip.id) }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.2)', 'transparent', 'rgba(0,0,0,0.65)']}
          locations={[0, 0.45, 1]}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.95)',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827' }}>{badgeLabel}</Text>
        </View>
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
          {destLine ? (
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }} numberOfLines={2}>
              {destLine}
            </Text>
          ) : (
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }} numberOfLines={2}>
              {trip.name?.trim() || t('detailTitle')}
            </Text>
          )}
          {dateLine ? (
            <Text style={{ fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.92)', marginTop: 6 }}>{dateLine}</Text>
          ) : null}
        </View>
      </View>
      <View style={{ backgroundColor: '#F05A1A', padding: 14 }}>
        <Pressable
          onPress={openDetail}
          style={({ pressed }) => ({
            width: '100%',
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderRadius: 999,
            backgroundColor: ORANGE,
            opacity: pressed ? 0.92 : 1,
          })}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
        >
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' }}>
            {ctaLabel}
          </Text>
        </Pressable>
      </View>
      </View>
    </View>
  );
}
