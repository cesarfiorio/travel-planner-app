import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { ProfileTripOverflowMenu } from './ProfileTripOverflowMenu';

import { formatItineraryDestinationSubtitle } from '../lib/itinerary/itinerarySubtitle';
import type { TripWithDetails } from '../lib/hooks/useTrips';
import { useDestinationCoverPhoto } from '../lib/hooks/useDestinationCoverPhoto';
import { tripRowToSnapshot, useAppStore } from '../lib/store/appStore';
import { deriveTripUiStatus, isTripOnOrAfterEndDateLocal } from '../lib/trips/tripUi';
import { formatTripHeroDateRange } from '../lib/trips/tripDateFormat';

const ORANGE = '#F05A1A';
const CARD_RADIUS = 16;
const HERO_H = 154;

type Props = {
  trip: TripWithDetails;
  locale: string;
  /** When true (e.g. profile tab), CTA only sets the active trip for the tab bar—no trip hub navigation. */
  selectActiveOnly?: boolean;
  showProfileOverflow?: boolean;
  currentUserId?: string;
};

export function FeaturedActiveTripCard({
  trip,
  locale,
  selectActiveOnly = false,
  showProfileOverflow = false,
  currentUserId = '',
}: Props) {
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
  const destinationForCover = trip.destination_label?.trim() || trip.name?.trim() || '';
  const { data: destinationCoverUrl } = useDestinationCoverPhoto(destinationForCover, destinationForCover.length >= 2);

  /** Profile "Your trips": on/after end date (last day or later), CTA completes and opens recap. */
  const showCompleteInsteadOfSwitch = selectActiveOnly && isTripOnOrAfterEndDateLocal(trip);

  const openDetail = () => {
    setActiveTrip(tripRowToSnapshot(trip));
    if (showCompleteInsteadOfSwitch) {
      router.push(`/trip/${trip.id}/finish`);
      return;
    }
    router.push('/(tabs)/explore');
  };

  const ctaLabel = selectActiveOnly
    ? showCompleteInsteadOfSwitch
      ? t('featuredCompleteTripCta')
      : t('viewDetails')
    : t('viewDetails');
  const overflowLabel = trip.name?.trim() || trip.destination_label?.trim() || t('detailTitle');
  const showOverflowTrigger =
    showProfileOverflow && Boolean(currentUserId) && trip.created_by === currentUserId;

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
        <Pressable
          onPress={openDetail}
          style={({ pressed }) => ({ opacity: pressed ? 0.96 : 1 })}
          accessibilityRole="button"
          accessibilityLabel={`${overflowLabel}. ${ctaLabel}`}
          accessibilityHint={
            showCompleteInsteadOfSwitch ? t('featuredCompleteTripA11y') : undefined
          }
        >
          <View style={{ height: HERO_H, width: '100%', backgroundColor: '#E5E7EB' }}>
            {destinationCoverUrl ? (
              <Image source={{ uri: destinationCoverUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : null}
            <LinearGradient
              colors={['rgba(0,0,0,0.08)', 'transparent', 'rgba(0,0,0,0.68)']}
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
                top: 70,
                left: 14,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.95)',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#111827' }}>{badgeLabel}</Text>
            </View>
            <View style={{ position: 'absolute', left: 14, right: 14, bottom: 13 }}>
              {destLine ? (
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }} numberOfLines={1}>
                  {destLine}
                </Text>
              ) : (
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }} numberOfLines={1}>
                  {trip.name?.trim() || t('detailTitle')}
                </Text>
              )}
              {dateLine ? (
                <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.95)', marginTop: 4 }}>{dateLine}</Text>
              ) : null}
            </View>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 13 }}>
            <View
              style={{
                width: '100%',
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 999,
                backgroundColor: ORANGE,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' }}>
                {ctaLabel}
              </Text>
            </View>
          </View>
        </Pressable>
        {showOverflowTrigger ? (
          <View style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }} pointerEvents="box-none">
            <ProfileTripOverflowMenu
              trip={trip}
              currentUserId={currentUserId}
              variant="onPhoto"
              tripLabel={overflowLabel}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}
