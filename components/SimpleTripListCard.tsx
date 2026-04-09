import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { TripWithDetails } from '../lib/hooks/useTrips';
import { tripRowToSnapshot, useAppStore } from '../lib/store/appStore';
import { formatTripHeroDateRange } from '../lib/trips/tripDateFormat';
import { primaryTripEntryPath } from '../lib/trips/tripUi';

const CARD_RADIUS = 12;
const CARD_BORDER = '#E5E7EB';

type Props = {
  trip: TripWithDetails;
  locale: string;
};

export function SimpleTripListCard({ trip, locale }: Props) {
  const { t } = useTranslation('trips');
  const router = useRouter();
  const setActiveTrip = useAppStore((s) => s.setActiveTrip);

  const title = trip.name?.trim() || trip.destination_label?.trim() || t('detailTitle');
  const dateLine = formatTripHeroDateRange(trip.start_date, trip.end_date, locale);

  const open = () => {
    setActiveTrip(tripRowToSnapshot(trip));
    router.push(primaryTripEntryPath(trip));
  };

  /** Shadow + elevation on `Pressable` is unreliable (especially Android). Outer `View` carries the card chrome. */
  return (
    <View
      style={{
        marginBottom: 12,
        borderRadius: CARD_RADIUS,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: CARD_BORDER,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.01,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <Pressable
        onPress={open}
        style={({ pressed }) => ({
          borderRadius: CARD_RADIUS,
          opacity: pressed ? 0.92 : 1,
        })}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }} numberOfLines={2}>
            {title}
          </Text>
          {dateLine ? (
            <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>{dateLine}</Text>
          ) : (
            <View style={{ marginTop: 2 }} />
          )}
        </View>
      </Pressable>
    </View>
  );
}
