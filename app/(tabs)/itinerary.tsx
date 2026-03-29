import * as Localization from 'expo-localization';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { Pressable, SectionList, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItineraryPlaceRow } from '../../components/ItineraryPlaceRow';
import { colors } from '../../constants/colors';
import { useAuth } from '../../lib/hooks/useAuth';
import { type ItineraryPlaceVm, useItinerary } from '../../lib/hooks/useItinerary';
import { itineraryDateLabelForDay } from '../../lib/itinerary/dayDate';
import { useAppStore } from '../../lib/store/appStore';
import { parseLocalDate } from '../../lib/trips/tripUi';

type Section = {
  dayNumber: number;
  title: string;
  data: ItineraryPlaceVm[];
};

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
    updateStatus,
    removePlace,
    scheduleNotesSave,
  } = useItinerary(tripId);

  const locale = Localization.getLocales()[0]?.languageTag ?? 'en';

  const sections: Section[] = useMemo(() => {
    return rawSections.map((s) => {
      const dateLabel = itineraryDateLabelForDay(activeTrip?.start_date ?? null, s.dayNumber, locale);
      const title =
        dateLabel.length > 0
          ? t('itineraryDaySection', { day: s.dayNumber, date: dateLabel })
          : t('itineraryDaySectionNoDate', { day: s.dayNumber });
      return { dayNumber: s.dayNumber, title, data: s.data };
    });
  }, [rawSections, activeTrip?.start_date, locale, t]);

  const dateRangeLabel = useMemo(() => {
    const start = parseLocalDate(activeTrip?.start_date ?? null);
    const end = parseLocalDate(activeTrip?.end_date ?? null);
    if (!start) {
      return '';
    }
    const fmt = (d: Date) => d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    if (!end) {
      return fmt(start);
    }
    return t('itineraryHeaderDates', { start: fmt(start), end: fmt(end) });
  }, [activeTrip?.start_date, activeTrip?.end_date, locale, t]);

  if (!activeTrip) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background }}>
        <Text style={{ textAlign: 'center', color: colors.inactive }}>{t('itineraryNoTrip')}</Text>
      </View>
    );
  }

  if (isLoading && rawSections.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.inactive }}>{t('loading', { ns: 'common' })}</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background }}>
        <Text style={{ textAlign: 'center', color: colors.text, marginBottom: 16 }}>
          {error instanceof Error ? error.message : t('itineraryLoadError')}
        </Text>
        <Pressable
          onPress={() => void refetch()}
          style={{ alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 20, backgroundColor: colors.primarySolid, borderRadius: 12 }}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: '600' }}>{t('common:retry')}</Text>
        </Pressable>
      </View>
    );
  }

  if (sections.length === 0 || sections.every((s) => s.data.length === 0)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 24, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 }}>{t('itineraryEmptyTitle')}</Text>
        <Text style={{ fontSize: 16, color: colors.inactive, lineHeight: 24, marginBottom: 20 }}>{t('itineraryEmptyBody')}</Text>
        <Pressable
          onPress={() => router.push('/(tabs)/explore')}
          style={{ alignSelf: 'flex-start', paddingVertical: 12, paddingHorizontal: 18, backgroundColor: colors.primarySolid, borderRadius: 12 }}
          accessibilityRole="button"
        >
          <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{t('itineraryGoExplore')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }} numberOfLines={2}>
          {activeTrip.name}
        </Text>
        {dateRangeLabel ? (
          <Text style={{ fontSize: 14, color: colors.inactive, marginTop: 4 }}>{dateRangeLabel}</Text>
        ) : null}
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.tripPlaceId}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.primary} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        renderSectionHeader={({ section }) => (
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: colors.text,
              marginTop: 16,
              marginBottom: 10,
            }}
          >
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 12 }}>
            <ItineraryPlaceRow
              row={item}
              accessToken={session?.access_token}
              onCycleStatus={(id, next) => void updateStatus({ tripPlaceId: id, status: next })}
              onRemove={(id) => void removePlace(id)}
              onNotesChange={(id, notes) => scheduleNotesSave(id, notes)}
            />
          </View>
        )}
      />
    </View>
  );
}
