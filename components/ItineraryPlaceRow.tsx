import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { colors } from '../constants/colors';
import { getPlacePhotoSource } from '../lib/api/placePhoto';
import type { ItineraryPlaceVm, ItineraryStatus } from '../lib/hooks/useItinerary';
import { firstPhotoReference } from '../lib/places/firstPhotoRef';

type Props = {
  row: ItineraryPlaceVm;
  accessToken: string | null | undefined;
  onCycleStatus: (tripPlaceId: string, next: ItineraryStatus) => void;
  onRemove: (tripPlaceId: string) => void;
  onNotesChange: (tripPlaceId: string, notes: string) => void;
};

function nextStatus(current: ItineraryStatus): ItineraryStatus {
  if (current === 'planned') {
    return 'visited';
  }
  if (current === 'visited') {
    return 'skipped';
  }
  return 'planned';
}

export function ItineraryPlaceRow({ row, accessToken, onCycleStatus, onRemove, onNotesChange }: Props) {
  const { t } = useTranslation('trips');
  const router = useRouter();
  const [notesOpen, setNotesOpen] = useState(false);
  const [draftNotes, setDraftNotes] = useState(row.notes ?? '');

  useEffect(() => {
    setDraftNotes(row.notes ?? '');
  }, [row.notes, row.tripPlaceId]);

  const ref = firstPhotoReference(row.photos);
  const photoSource = getPlacePhotoSource(ref, accessToken);

  const renderRight = () => (
    <Pressable
      onPress={() => onRemove(row.tripPlaceId)}
      style={{
        backgroundColor: '#DC2626',
        justifyContent: 'center',
        paddingHorizontal: 18,
        marginLeft: 8,
        borderRadius: 12,
        minHeight: 72,
      }}
      accessibilityRole="button"
      accessibilityLabel={t('itineraryRemoveA11y')}
    >
      <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
    </Pressable>
  );

  const inner = (
    <View
      style={{
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
      }}
    >
      <Pressable
        onPress={() => router.push(`/(stack)/place/${row.placeId}`)}
        style={{ flexDirection: 'row' }}
        accessibilityRole="button"
        accessibilityLabel={row.name}
      >
        <View style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.border }}>
          {photoSource ? (
            <Image source={photoSource} style={{ width: 56, height: 56 }} contentFit="cover" transition={150} />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="image-outline" size={22} color={colors.inactive} />
            </View>
          )}
        </View>
        <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={2}>
            {row.name}
          </Text>
          <Text style={{ fontSize: 12, color: colors.inactive, marginTop: 4, textTransform: 'capitalize' }}>
            {row.category ?? t('itineraryCategoryUnknown')}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => onCycleStatus(row.tripPlaceId, nextStatus(row.status))}
        style={{ marginTop: 10, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#F3F4F6' }}
        accessibilityRole="button"
        accessibilityLabel={t('itineraryCycleStatusA11y')}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primarySolid }}>
          {t(`itineraryStatus_${row.status}`)}
        </Text>
      </Pressable>
      <Pressable onPress={() => setNotesOpen((o) => !o)} style={{ marginTop: 8 }} accessibilityRole="button">
        <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>
          {notesOpen ? t('itineraryNotesHide') : t('itineraryNotesShow')}
        </Text>
      </Pressable>
      {notesOpen ? (
        <TextInput
          value={draftNotes}
          onChangeText={(text) => {
            setDraftNotes(text);
            onNotesChange(row.tripPlaceId, text);
          }}
          placeholder={t('itineraryNotesPlaceholder')}
          placeholderTextColor={colors.inactive}
          multiline
          style={{
            marginTop: 8,
            minHeight: 72,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            padding: 10,
            fontSize: 15,
            color: colors.text,
            textAlignVertical: 'top',
          }}
        />
      ) : null}
    </View>
  );

  return (
    <Swipeable renderRightActions={renderRight} overshootRight={false} friction={2}>
      {inner}
    </Swipeable>
  );
}
