import { Ionicons } from '@expo/vector-icons';
import * as Localization from 'expo-localization';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddCustomItineraryActivityModal } from '../../components/AddCustomItineraryActivityModal';
import { ItineraryActivityDetailModal } from '../../components/ItineraryActivityDetailModal';
import { ItineraryPlaceRow } from '../../components/ItineraryPlaceRow';
import { colors } from '../../constants/colors';
import { COLORS, FONT, LAYOUT, RADIUS, SHADOW, SPACING } from '../../constants/theme';
import { useAuth } from '../../lib/hooks/useAuth';
import { useAddCustomItineraryActivity, useItinerary, type ItineraryPlaceVm } from '../../lib/hooks/useItinerary';
import { itineraryShortDateForDay } from '../../lib/itinerary/dayDate';
import { formatItineraryDestinationSubtitle } from '../../lib/itinerary/itinerarySubtitle';
import { useAppStore } from '../../lib/store/appStore';
import { parseLocalDate, tripDurationDays } from '../../lib/trips/tripUi';

const SCREEN_BG = '#F3F4F6';
const ORANGE = '#F05A1A';
/** Space so the last list row clears the stacked floating action buttons. */
const ITINERARY_FLOATING_ACTIONS_CLEARANCE = 132;

export default function ItineraryScreen() {
  const { t } = useTranslation(['trips', 'common']);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const activeTrip = useAppStore((s) => s.activeTrip);
  const setItineraryAddDayNumber = useAppStore((s) => s.setItineraryAddDayNumber);
  const tripId = activeTrip?.id;

  const {
    sections: rawSections,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    removePlace,
    reorderDay,
    updateSchedule,
    isSavingSchedule,
  } = useItinerary(tripId);

  const addCustomActivity = useAddCustomItineraryActivity();

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
  const [detailRow, setDetailRow] = useState<ItineraryPlaceVm | null>(null);
  const [customActivityOpen, setCustomActivityOpen] = useState(false);
  const prevTripIdForDayTargetRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    setSelectedDay((prev) => Math.min(Math.max(1, prev), dayCount));
  }, [dayCount]);

  useEffect(() => {
    setDetailRow(null);
  }, [tripId, selectedDay]);

  useEffect(() => {
    if (!tripId) {
      prevTripIdForDayTargetRef.current = undefined;
      return;
    }
    if (prevTripIdForDayTargetRef.current !== tripId) {
      prevTripIdForDayTargetRef.current = tripId;
      setSelectedDay(1);
      setItineraryAddDayNumber(1);
      return;
    }
    setItineraryAddDayNumber(selectedDay);
  }, [tripId, selectedDay, setItineraryAddDayNumber]);

  const subtitle = useMemo(
    () => formatItineraryDestinationSubtitle(activeTrip?.destination_label, activeTrip?.name),
    [activeTrip?.destination_label, activeTrip?.name],
  );

  const sectionForSelected = rawSections.find((s) => s.dayNumber === selectedDay);
  const dayItems = sectionForSelected?.data ?? [];
  const detailListIndex = detailRow ? dayItems.findIndex((r) => r.tripPlaceId === detailRow.tripPlaceId) : -1;
  const detailModalOrderIndex = detailRow ? (detailListIndex >= 0 ? detailListIndex : detailRow.orderIndex) : 0;

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
    <View
      style={{
        backgroundColor: COLORS.cardBg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingTop: insets.top + SPACING.sm,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          paddingHorizontal: SPACING.xl,
        }}
      >
        <View style={{ flex: 1, marginRight: SPACING.md, minWidth: 0 }}>
          <Text
            style={{
              fontSize: FONT.h1,
              fontWeight: FONT.extrabold,
              color: COLORS.textPrimary,
              letterSpacing: -0.5,
            }}
            numberOfLines={2}
          >
            {t('screenTitle')}
          </Text>
          {subtitle ? (
            <Text
              style={{
                marginTop: SPACING.xs,
                fontSize: FONT.base,
                color: COLORS.textSecondary,
              }}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/explore')}
          style={({ pressed }) => ({
            width: LAYOUT.itineraryHeaderFab,
            height: LAYOUT.itineraryHeaderFab,
            borderRadius: RADIUS.circle,
            backgroundColor: COLORS.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.92 : 1,
            ...SHADOW.md,
          })}
          accessibilityRole="button"
          accessibilityLabel={t('itineraryAddPlaceFabA11y')}
        >
          <Ionicons name="add" size={FONT.xxl + SPACING.xs} color={COLORS.textOnPrimary} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={{
          paddingHorizontal: SPACING.xl,
          paddingTop: SPACING.lg,
          paddingBottom: SPACING.sm,
          gap: SPACING.sm,
          flexDirection: 'row',
          alignItems: 'stretch',
        }}
        style={{ marginBottom: SPACING.sm }}
      >
        {dayNumbers.map((day) => {
          const selected = selectedDay === day;
          const dateShort = itineraryShortDateForDay(activeTrip.start_date ?? null, day, locale);
          const a11yLabel =
            dateShort.length > 0
              ? t('itineraryDayChipLabel', { date: dateShort, day })
              : t('itineraryDayChipDayOnly', { day });
          return (
            <Pressable
              key={day}
              onPress={() => setSelectedDay(day)}
              style={{
                minWidth: LAYOUT.itineraryDayPillMinWidth,
                paddingVertical: SPACING.sm,
                paddingHorizontal: SPACING.lg,
                borderRadius: RADIUS.xl,
                backgroundColor: selected ? COLORS.primary : COLORS.cardBg,
                borderWidth: selected ? 0 : 1,
                borderColor: COLORS.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={a11yLabel}
            >
              {dateShort ? (
                <Text
                  style={{
                    fontSize: FONT.sm,
                    fontWeight: FONT.medium,
                    color: selected ? COLORS.textOnPrimary : COLORS.textTertiary,
                    opacity: selected ? 0.9 : 1,
                    textAlign: 'center',
                  }}
                >
                  {dateShort}
                </Text>
              ) : null}
              <Text
                style={{
                  fontSize: FONT.md,
                  fontWeight: FONT.bold,
                  color: selected ? COLORS.textOnPrimary : COLORS.textPrimary,
                  textAlign: 'center',
                  marginTop: dateShort ? SPACING.xs : 0,
                }}
              >
                {t('itineraryDayChipDayOnly', { day })}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  if (rawSections.length === 0 || rawSections.every((s) => s.data.length === 0)) {
    return (
      <View style={{ flex: 1, backgroundColor: SCREEN_BG }}>
        {headerBlock}
        <AddCustomItineraryActivityModal
          visible={customActivityOpen}
          onClose={() => setCustomActivityOpen(false)}
          saving={addCustomActivity.isPending}
          onAdd={(title, notes) =>
            void addCustomActivity.mutateAsync({
              tripId: tripId!,
              title,
              notes: notes || null,
              dayNumber: selectedDay,
            })
          }
        />
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 }}>{t('itineraryEmptyTitle')}</Text>
          <Text style={{ fontSize: 16, color: colors.inactive, lineHeight: 24, marginBottom: 20 }}>{t('itineraryEmptyBody')}</Text>
          <View style={{ gap: 12 }}>
            <Pressable
              onPress={() => router.push('/(tabs)/explore')}
              style={{ alignSelf: 'stretch', paddingVertical: 14, paddingHorizontal: 22, backgroundColor: ORANGE, borderRadius: 14 }}
              accessibilityRole="button"
            >
              <Text style={{ color: colors.onPrimary, fontWeight: '700', textAlign: 'center' }}>{t('itineraryGoExplore')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setCustomActivityOpen(true)}
              style={{
                alignSelf: 'stretch',
                paddingVertical: 14,
                paddingHorizontal: 22,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: ORANGE,
                backgroundColor: '#FFFFFF',
              }}
              accessibilityRole="button"
              accessibilityLabel={t('itineraryAddCustomA11y')}
            >
              <Text style={{ color: ORANGE, fontWeight: '700', textAlign: 'center' }}>{t('itineraryAddCustomCta')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: SCREEN_BG }}>
      {headerBlock}

      <ItineraryActivityDetailModal
        visible={detailRow != null}
        row={detailRow}
        listOrderIndex={detailModalOrderIndex}
        accessToken={session?.access_token}
        locale={locale}
        onClose={() => setDetailRow(null)}
        saving={isSavingSchedule}
        onSave={(payload) =>
          void updateSchedule({
            tripPlaceId: payload.tripPlaceId,
            startTimeLocal: payload.startTimeLocal,
            durationMinutes: payload.durationMinutes,
            notes: payload.notes,
            ...(payload.customTitle !== undefined ? { customTitle: payload.customTitle } : {}),
          })
        }
        onRemove={(id) => void removePlace(id)}
      />

      <View style={{ flex: 1, minHeight: 0, zIndex: 0 }}>
        <DraggableFlatList
          containerStyle={{ flex: 1 }}
          style={{ flex: 1 }}
          data={dayItems}
          keyExtractor={(item) => item.tripPlaceId}
          onDragEnd={({ data }) => {
            void reorderDay({
              dayNumber: selectedDay,
              orderedTripPlaceIds: data.map((i) => i.tripPlaceId),
            });
          }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={ORANGE} />
          }
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 4,
            paddingBottom: ITINERARY_FLOATING_ACTIONS_CLEARANCE + insets.bottom + 12,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: colors.inactive, marginTop: 40, paddingHorizontal: 24 }}>
              {t('itineraryEmptyDay')}
            </Text>
          }
          renderItem={({ item, getIndex, drag, isActive }) => {
            const index = getIndex() ?? 0;
            return (
              <ScaleDecorator>
                <View style={{ marginBottom: 10, opacity: isActive ? 0.95 : 1 }}>
                  <ItineraryPlaceRow
                    row={item}
                    accessToken={session?.access_token}
                    orderIndex={index}
                    locale={locale}
                    drag={drag}
                    onOpenDetail={setDetailRow}
                  />
                </View>
              </ScaleDecorator>
            );
          }}
        />
      </View>

      <AddCustomItineraryActivityModal
        visible={customActivityOpen}
        onClose={() => setCustomActivityOpen(false)}
        saving={addCustomActivity.isPending}
        onAdd={(title, notes) =>
          void addCustomActivity.mutateAsync({
            tripId: tripId!,
            title,
            notes: notes || null,
            dayNumber: selectedDay,
          })
        }
      />

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: Math.max(insets.bottom, 10) + 6,
          zIndex: 100,
          elevation: 12,
          gap: 10,
        }}
      >
        <Pressable
          onPress={() => router.push('/(tabs)/explore')}
          style={{
            paddingVertical: 16,
            borderRadius: 9999,
            backgroundColor: ORANGE,
            alignItems: 'center',
            ...SHADOW.lg,
            elevation: 6,
          }}
          accessibilityRole="button"
          accessibilityLabel={t('itineraryAddActivity')}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>{t('itineraryAddActivity')}</Text>
        </Pressable>
        <Pressable
          onPress={() => setCustomActivityOpen(true)}
          style={{
            paddingVertical: 14,
            borderRadius: 9999,
            borderWidth: 1.5,
            borderColor: ORANGE,
            backgroundColor: COLORS.cardBg,
            alignItems: 'center',
            ...SHADOW.md,
            elevation: 5,
          }}
          accessibilityRole="button"
          accessibilityLabel={t('itineraryAddCustomA11y')}
        >
          <Text style={{ color: ORANGE, fontSize: 16, fontWeight: '700' }}>{t('itineraryAddCustomCta')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
