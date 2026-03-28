import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../../constants/colors';
import { useTrip } from '../../../lib/hooks/useTrips';
import { tripRowToSnapshot, useAppStore } from '../../../lib/store/appStore';

export default function TripDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const tripId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('trips');
  const { data: trip, isLoading, isError } = useTrip(tripId);
  const setActiveTrip = useAppStore((s) => s.setActiveTrip);

  useEffect(() => {
    if (trip) {
      setActiveTrip(tripRowToSnapshot(trip));
    }
  }, [trip, setActiveTrip]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !trip) {
    return (
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          backgroundColor: colors.background,
        }}
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('detailBackA11y')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ marginTop: 24, fontSize: 17, color: colors.inactive }}>{t('notFound')}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('detailBackA11y')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, marginLeft: 12, fontSize: 20, fontWeight: '700', color: colors.text }} numberOfLines={1}>
          {trip.name}
        </Text>
      </View>
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 16, color: colors.inactive, lineHeight: 24 }}>{t('detailHubSubtitle')}</Text>
      </View>
    </View>
  );
}
