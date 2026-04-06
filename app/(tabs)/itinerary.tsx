import { Ionicons } from '@expo/vector-icons';
import * as Localization from 'expo-localization';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItineraryPlaceRow } from '../../components/ItineraryPlaceRow';
import { colors } from '../../constants/colors';
import { useAuth } from '../../lib/hooks/useAuth';
import { useItinerary } from '../../lib/hooks/useItinerary';
import { itineraryShortDateForDay } from '../../lib/itinerary/dayDate';
import { formatItineraryDestinationSubtitle } from '../../lib/itinerary/itinerarySubtitle';
import { useAppStore } from '../../lib/store/appStore';
import { parseLocalDate, tripDurationDays } from '../../lib/trips/tripUi';

const SCREEN_BG = '#F3F4F6';
const ORANGE = '#F05A1A';

export default function ItineraryScreen() {
  const { t } = useTranslation(['trips', 'common']);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const activeTrip = useAppStore((s) => s.activeTrip);
  const tripId = activeTrip?.id;

  const {
    sections: rawSections,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    removePlace,
  } = useItinerary(tripId);

  const locale = Localization.getLocales()[0]?.languageTag ?? 'en';

  const maxDayInData = useMemo(
    () => (rawSections.length === 0 ? 0 : Math.max(...rawSections.map((s) => s.dayNumber))),
    [rawSections],
  );

  const tripDayCount = useMemo(() => {
    const start = parseLocalDate(activeTrip?.start_date ?? null);
    const end = parseLocalDate(activeTrip?.end_date ?? null);
    if (start && end) {
      return tripDurationDays(start, end);
    }
    return 0;
  }, [activeTrip?.start_date, activeTrip?.end_date]);

  const dayCount = Math.max(1, tripDayCount || 0, maxDayInData);
  const dayNumbers = useMemo(() => Array.from({ length: dayCount }, (_, i) => i + 1), [dayCount]);

  const [selectedDay, setSelectedDay] = useState(1);

  useEffect(() => {
    if (!tripId) {
      return;
    }
    setSelectedDay(1);
  }, [tripId]);

  useEffect(() => {
    setSelectedDay((prev) => Math.min(Math.max(1, prev), dayCount));
  }, [dayCount]);

  const subtitle = useMemo(
    () => formatItineraryDestinationSubtitle(activeTrip?.destination_label, activeTrip?.name),
    [activeTrip?.destination_label, activeTrip?.name],
  );

  const sectionForSelected = rawSections.find((s) => s.dayNumber === selectedDay);
  const dayItems = sectionForSelected?.data ?? [];

  if (!activeTrip) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: SCREEN_BG }}>
        <Text style={{ textAlign: 'center', color: colors.inactive }}>{t('itineraryNoTrip')}</Text>
      </View>
    );
  }

  if (isLoading && rawSections.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: SCREEN_BG }}>
        <Text style={{ color: colors.inactive }}>{t('loading', { ns: 'common' })}</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: SCREEN_BG }}>
        <Text style={{ textAlign: 'center', color: colors.text, marginBottom: 16 }}>
          {error instanceof Error ? error.message : t('itineraryLoadError')}
        </Text>
        <Pressable
          onPress={() => void refetch()}
          style={{ alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 20, backgroundColor: ORANGE, borderRadius: 12 }}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: '600' }}>{t('common:retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const headerBlock = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 }}>
        <Text style={{ flex: 1, fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 }} numberOfLines={2}>
          {t('screenTitle')}
        </Text>
        <Pressable
          onPress={() => router.push('/(tabs)/explore')}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: ORANGE,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4,
          }}
          accessibilityRole="button"
          accessibilityLabel={t('itineraryAddPlaceFabA11y')}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      </View>
      {subtitle ? (
        <Text style={{ fontSize: 15, color: '#6B7280', paddingHorizontal: 20, marginBottom: 16 }} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : (
        <View style={{ marginBottom: 16 }} />
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 8 }}
        style={{ marginBottom: 8 }}
      >
        {dayNumbers.map((day) => {
          const selected = selectedDay === day;
          const dateShort = itineraryShortDateForDay(activeTrip.start_date ?? null, day, locale);
          const label =
            dateShort.length > 0
              ? t('itineraryDayChipLabel', { date: dateShort, day })
              : t('itineraryDayChipDayOnly', { day });
          return (
            <Pressable
              key={day}
              onPress={() => setSelectedDay(day)}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 14,
                backgroundColor: selected ? ORANGE : '#FFFFFF',
                borderWidth: 1,
                borderColor: selected ? ORANGE : '#E5E7EB',
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
            >
              <Text style={{ fontSize: 14, fontWeight: selected ? '700' : '600', color: selected ? '#FFFFFF' : '#6B7280' }}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );

  if (rawSections.length === 0 || rawSections.every((s) => s.data.length === 0)) {
    return (
      <View style={{ flex: 1, backgroundColor: SCREEN_BG, paddingTop: insets.top + 8 }}>
        {headerBlock}
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 }}>{t('itineraryEmptyTitle')}</Text>
          <Text style={{ fontSize: 16, color: colors.inactive, lineHeight: 24, marginBottom: 20 }}>{t('itineraryEmptyBody')}</Text>
          <Pressable
            onPress={() => router.push('/(tabs)/explore')}
            style={{ alignSelf: 'flex-start', paddingVertical: 14, paddingHorizontal: 22, backgroundColor: ORANGE, borderRadius: 14 }}
            accessibilityRole="button"
          >
            <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{t('itineraryGoExplore')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: SCREEN_BG, paddingTop: insets.top + 8 }}>
      {headerBlock}

      <FlatList
        data={dayItems}
        keyExtractor={(item) => item.tripPlaceId}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={ORANGE} />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 16,
          flexGrow: 1,
        }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: colors.inactive, marginTop: 40, paddingHorizontal: 24 }}>
            {t('itineraryEmptyDay')}
          </Text>
        }
        renderItem={({ item, index }) => (
          <View style={{ marginBottom: 16 }}>
            <ItineraryPlaceRow
              row={item}
              accessToken={session?.access_token}
              orderIndex={index}
              locale={locale}
              onRemove={(id) => void removePlace(id)}
            />
          </View>
        )}
      />

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Math.max(16, insets.bottom + 8),
          backgroundColor: SCREEN_BG,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
        }}
      >
        <Pressable
          onPress={() => router.push('/(tabs)/explore')}
          style={{
            paddingVertical: 16,
            borderRadius: 14,
            backgroundColor: ORANGE,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 6,
            elevation: 4,
          }}
          accessibilityRole="button"
          accessibilityLabel={t('itineraryAddActivity')}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>{t('itineraryAddActivity')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
