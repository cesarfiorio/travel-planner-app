import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { COLORS, FONT, RADIUS, SPACING } from '../constants/theme';
import { getPlacePhotoSource } from '../lib/api/placePhoto';
import type { ItineraryPlaceVm } from '../lib/hooks/useItinerary';
import { itineraryPresetClock, itinerarySlotDisplay } from '../lib/itinerary/slotDisplayMeta';
import { firstPhotoReference } from '../lib/places/firstPhotoRef';

const IMG_H = 180;

function timeLocalToDate(hhmm: string | null): Date | null {
  if (hhmm?.trim()) {
    const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      const h = Number(m[1]);
      const min = Number(m[2]);
      if (Number.isInteger(h) && Number.isInteger(min) && h >= 0 && h <= 23 && min >= 0 && min <= 59) {
        return new Date(2000, 0, 1, h, min, 0);
      }
    }
  }
  return null;
}

function dateToHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function parseDurationMinutes(raw: string): number | null {
  const t = raw.trim();
  if (!t) {
    return null;
  }
  const n = Number(t);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    return NaN;
  }
  return n;
}

type Props = {
  visible: boolean;
  row: ItineraryPlaceVm | null;
  /** Index within the current day list (for time/duration display fallback). */
  listOrderIndex: number;
  accessToken: string | null | undefined;
  locale: string;
  onClose: () => void;
  onSave: (payload: {
    tripPlaceId: string;
    startTimeLocal: string | null;
    durationMinutes: number | null;
    notes: string;
    customTitle?: string;
  }) => void | Promise<void>;
  onRemove: (tripPlaceId: string) => void | Promise<void>;
  saving?: boolean;
};

export function ItineraryActivityDetailModal({
  visible,
  row,
  listOrderIndex,
  accessToken,
  locale,
  onClose,
  onSave,
  onRemove,
  saving,
}: Props) {
  const { t } = useTranslation(['trips', 'common']);
  const [notesDraft, setNotesDraft] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [timeValue, setTimeValue] = useState(() => new Date(2000, 0, 1, 9, 0, 0));
  const [durationDraft, setDurationDraft] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (!row || !visible) {
      return;
    }
    setTitleDraft(row.isCustom ? row.name : '');
    setNotesDraft(row.notes ?? '');
    const fromDb = timeLocalToDate(row.startTimeLocal);
    if (fromDb) {
      setTimeValue(fromDb);
    } else {
      const { h, m } = itineraryPresetClock(listOrderIndex);
      setTimeValue(new Date(2000, 0, 1, h, m, 0));
    }
    setDurationDraft(row.durationMinutes != null && row.durationMinutes > 0 ? String(row.durationMinutes) : '');
    setShowTimePicker(false);
  }, [row?.tripPlaceId, visible, row, listOrderIndex]);

  const ref = row ? firstPhotoReference(row.photos) : undefined;
  const photoSource = getPlacePhotoSource(ref, accessToken);

  const timeDisplay = useMemo(() => {
    if (!row) {
      return '';
    }
    return timeValue.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  }, [row, timeValue, locale]);

  const durationDisplayHours = useMemo(() => {
    if (!row) {
      return 0;
    }
    const parsed = parseDurationMinutes(durationDraft);
    if (parsed != null && !Number.isNaN(parsed)) {
      return parsed / 60;
    }
    return itinerarySlotDisplay(row, listOrderIndex, locale).durationHours;
  }, [row, listOrderIndex, locale, durationDraft]);

  const durationSummary = useMemo(() => {
    const durStr = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
      minimumFractionDigits: Number.isInteger(durationDisplayHours) ? 0 : 1,
    }).format(durationDisplayHours);
    return durationDisplayHours === 1 ? t('itineraryDurationOneHour') : t('itinerarySlotDurationHours', { hours: durStr });
  }, [durationDisplayHours, locale, t]);

  const openMaps = () => {
    if (!row) {
      return;
    }
    if (row.latitude != null && row.longitude != null) {
      void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${row.latitude},${row.longitude}`);
      return;
    }
    const q = row.address?.trim() || row.name?.trim();
    if (q) {
      void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`);
    }
  };

  const confirmRemove = () => {
    if (!row) {
      return;
    }
    Alert.alert(t('itineraryRemoveActivityConfirmTitle'), t('itineraryRemoveActivityConfirmBody'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('itineraryRemoveFromItinerary'),
        style: 'destructive',
        onPress: () => {
          void Promise.resolve(onRemove(row.tripPlaceId)).then(() => onClose());
        },
      },
    ]);
  };

  const handleSave = () => {
    if (!row) {
      return;
    }
    if (row.isCustom && !titleDraft.trim()) {
      Alert.alert(t('errorTitle'), t('itineraryCustomTitleRequired'));
      return;
    }
    const dm = parseDurationMinutes(durationDraft);
    if (Number.isNaN(dm)) {
      Alert.alert(t('errorTitle'), t('itineraryActivityInvalidDuration'));
      return;
    }
    void Promise.resolve(
      onSave({
        tripPlaceId: row.tripPlaceId,
        startTimeLocal: dateToHHMM(timeValue),
        durationMinutes: dm,
        notes: notesDraft,
        ...(row.isCustom ? { customTitle: titleDraft.trim() } : {}),
      }),
    ).then(() => onClose());
  };

  if (!row) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: SPACING.lg }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            maxHeight: '92%',
            backgroundColor: COLORS.cardBg,
            borderRadius: RADIUS.xl,
            overflow: 'hidden',
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: SPACING.xl }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                paddingHorizontal: SPACING.lg,
                paddingTop: SPACING.lg,
                gap: SPACING.sm,
              }}
            >
              {row.isCustom ? (
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: FONT.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs }}>
                    {t('itineraryActivityTitleCustom')}
                  </Text>
                  <TextInput
                    value={titleDraft}
                    onChangeText={setTitleDraft}
                    placeholder={t('itineraryAddCustomTitlePlaceholder')}
                    placeholderTextColor={COLORS.textTertiary}
                    style={{
                      fontSize: FONT.h2,
                      fontWeight: FONT.extrabold,
                      color: COLORS.textPrimary,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: RADIUS.md,
                      paddingHorizontal: SPACING.md,
                      paddingVertical: SPACING.sm,
                    }}
                  />
                </View>
              ) : (
                <Text style={{ flex: 1, fontSize: FONT.h2, fontWeight: FONT.extrabold, color: COLORS.textPrimary }} numberOfLines={2}>
                  {row.name}
                </Text>
              )}
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('closeA11y')}>
                <Ionicons name="close" size={26} color={COLORS.textTertiary} />
              </Pressable>
            </View>

            {row.isCustom ? null : (
              <View style={{ marginTop: SPACING.md, paddingHorizontal: SPACING.lg }}>
                <View style={{ borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: COLORS.border, height: IMG_H }}>
                  {photoSource ? (
                    <Image source={photoSource} style={{ width: '100%', height: IMG_H }} contentFit="cover" transition={150} />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="image-outline" size={40} color={COLORS.textTertiary} />
                    </View>
                  )}
                </View>
              </View>
            )}

            <View style={{ paddingHorizontal: SPACING.lg, marginTop: SPACING.lg, gap: SPACING.md }}>
              <Pressable onPress={() => setShowTimePicker((s) => !s)} accessibilityRole="button">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                  <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FONT.sm, fontWeight: FONT.semibold, color: COLORS.textPrimary }}>
                      {t('itineraryActivityTime')}
                    </Text>
                    <Text style={{ fontSize: FONT.lg, fontWeight: FONT.bold, color: COLORS.textPrimary, marginTop: 2 }}>
                      {timeDisplay}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={COLORS.textTertiary} />
                </View>
              </Pressable>
              {showTimePicker ? (
                <DateTimePicker
                  value={timeValue}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant="light"
                  textColor={COLORS.textPrimary}
                  onChange={(_, d) => {
                    if (Platform.OS !== 'ios') {
                      setShowTimePicker(false);
                    }
                    if (d) {
                      setTimeValue(d);
                    }
                  }}
                />
              ) : null}

              {row.address ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm }}>
                  <Ionicons name="location-outline" size={20} color={COLORS.primary} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FONT.sm, color: COLORS.textSecondary }}>{t('itineraryActivityLocation')}</Text>
                    <Text style={{ fontSize: FONT.lg, fontWeight: FONT.bold, color: COLORS.textPrimary, marginTop: 2, lineHeight: 22 }}>
                      {row.address}
                    </Text>
                  </View>
                </View>
              ) : null}

              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs }}>
                  <Ionicons name="hourglass-outline" size={20} color={COLORS.primary} />
                  <Text style={{ fontSize: FONT.sm, color: COLORS.textSecondary }}>{t('itineraryActivityDuration')}</Text>
                </View>
                <TextInput
                  value={durationDraft}
                  onChangeText={setDurationDraft}
                  placeholder={t('itineraryActivityDurationHint')}
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="number-pad"
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: RADIUS.md,
                    paddingHorizontal: SPACING.md,
                    paddingVertical: SPACING.sm,
                    fontSize: FONT.lg,
                    color: COLORS.textPrimary,
                  }}
                />
                <Text style={{ fontSize: FONT.sm, color: COLORS.textTertiary, marginTop: SPACING.xs }}>{durationSummary}</Text>
              </View>

              <View
                style={{
                  backgroundColor: COLORS.pageBg,
                  borderRadius: RADIUS.lg,
                  padding: SPACING.md,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.sm }}>
                  <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                  <Text style={{ fontSize: FONT.sm, color: COLORS.textSecondary }}>{t('itineraryActivityNotes')}</Text>
                </View>
                <TextInput
                  value={notesDraft}
                  onChangeText={setNotesDraft}
                  placeholder={t('itineraryNotesPlaceholder')}
                  placeholderTextColor={COLORS.textTertiary}
                  multiline
                  style={{
                    minHeight: 72,
                    fontSize: FONT.base,
                    color: COLORS.textPrimary,
                    textAlignVertical: 'top',
                  }}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, marginTop: SPACING.lg }}>
              <Pressable
                onPress={openMaps}
                style={{
                  flex: 1,
                  paddingVertical: SPACING.md,
                  borderRadius: RADIUS.pill,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  alignItems: 'center',
                }}
                accessibilityRole="button"
              >
                <Text style={{ fontSize: FONT.base, fontWeight: FONT.semibold, color: COLORS.textPrimary }}>{t('itineraryOpenInMaps')}</Text>
              </Pressable>
              <Pressable
                onPress={confirmRemove}
                style={{
                  flex: 1,
                  paddingVertical: SPACING.md,
                  borderRadius: RADIUS.pill,
                  borderWidth: 1,
                  borderColor: COLORS.dangerBorder,
                  alignItems: 'center',
                  backgroundColor: COLORS.dangerLight,
                }}
                accessibilityRole="button"
              >
                <Text style={{ fontSize: FONT.base, fontWeight: FONT.semibold, color: COLORS.danger }}>{t('itineraryRemoveFromItinerary')}</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, marginTop: SPACING.md }}>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  paddingVertical: SPACING.md,
                  borderRadius: RADIUS.pill,
                  backgroundColor: COLORS.primary,
                  alignItems: 'center',
                  opacity: saving ? 0.7 : 1,
                }}
                accessibilityRole="button"
              >
                <Text style={{ fontSize: FONT.md, fontWeight: FONT.bold, color: COLORS.textOnPrimary }}>{t('itineraryActivitySave')}</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1,
                  paddingVertical: SPACING.md,
                  borderRadius: RADIUS.pill,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  alignItems: 'center',
                  backgroundColor: COLORS.cardBg,
                }}
                accessibilityRole="button"
              >
                <Text style={{ fontSize: FONT.md, fontWeight: FONT.bold, color: COLORS.textPrimary }}>{t('itineraryActivityClose')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
