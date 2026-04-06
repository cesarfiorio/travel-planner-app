import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { TripWithDetails } from '../lib/hooks/useTrips';
import { tripRowToSnapshot, useAppStore } from '../lib/store/appStore';
import { formatTripHeroDateRange } from '../lib/trips/tripDateFormat';

const CARD_RADIUS = 16;

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
    router.push(`/trip/${trip.id}`);
  };

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => ({
        marginBottom: 12,
        padding: 18,
        borderRadius: CARD_RADIUS,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E8EAED',
        opacity: pressed ? 0.96 : 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      })}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }} numberOfLines={2}>
        {title}
      </Text>
      {dateLine ? (
        <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>{dateLine}</Text>
      ) : (
        <View style={{ marginTop: 4 }} />
      )}
    </Pressable>
  );
}
