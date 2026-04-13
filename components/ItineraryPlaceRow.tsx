import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { getPlacePhotoSource } from '../lib/api/placePhoto';
import type { ItineraryPlaceVm } from '../lib/hooks/useItinerary';
import { itinerarySlotDisplay } from '../lib/itinerary/slotDisplayMeta';
import { firstPhotoReference } from '../lib/places/firstPhotoRef';

const THUMB = 88;
const CARD_RADIUS = 16;

type Props = {
  row: ItineraryPlaceVm;
  accessToken: string | null | undefined;
  orderIndex: number;
  locale: string;
  onOpenDetail: (row: ItineraryPlaceVm) => void;
  /** When set, long-press opens drag reorder (from `react-native-draggable-flatlist`). */
  drag?: () => void;
};

export function ItineraryPlaceRow({ row, accessToken, orderIndex, locale, onOpenDetail, drag }: Props) {
  const { t } = useTranslation('trips');

  const ref = firstPhotoReference(row.photos);
  const photoSource = getPlacePhotoSource(ref, accessToken);
  const { timeLabel, durationHours } = itinerarySlotDisplay(row, orderIndex, locale);
  const durStr = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: Number.isInteger(durationHours) ? 0 : 1 }).format(durationHours);
  const durationText =
    durationHours === 1 ? t('itineraryDurationOneHour') : t('itinerarySlotDurationHours', { hours: durStr });
  const tip = row.notes?.trim();

  const openDetail = () => onOpenDetail(row);

  return (
    <View
      style={{
        borderRadius: CARD_RADIUS,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 14,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {drag ? (
        <Pressable
          onLongPress={drag}
          delayLongPress={160}
          accessibilityRole="button"
          accessibilityLabel={t('itineraryDragHandleA11y')}
          hitSlop={6}
          style={{ justifyContent: 'center', paddingRight: 10, marginLeft: -4 }}
        >
          <Ionicons name="reorder-three-outline" size={26} color="#9CA3AF" />
        </Pressable>
      ) : null}

      <Pressable onPress={openDetail} accessibilityRole="button" accessibilityLabel={row.name}>
        <View style={{ width: THUMB, height: THUMB, borderRadius: 12, overflow: 'hidden', backgroundColor: '#E5E7EB' }}>
          {photoSource ? (
            <Image source={photoSource} style={{ width: THUMB, height: THUMB }} contentFit="cover" transition={150} />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="image-outline" size={32} color="#9CA3AF" />
            </View>
          )}
        </View>
      </Pressable>

      <View style={{ flex: 1, marginLeft: 14, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <Pressable onPress={openDetail} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={row.name}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }} numberOfLines={2}>
              {row.name}
            </Text>
          </Pressable>
          <Pressable onPress={openDetail} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('itineraryOpenPlaceA11y')}>
            <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 }}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={{ fontSize: 14, color: '#6B7280', flex: 1 }} numberOfLines={1}>
            {t('itineraryTimeDurationLine', { time: timeLabel, duration: durationText })}
          </Text>
        </View>

        {row.address ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, gap: 6 }}>
            <Ionicons name="location-outline" size={16} color="#6B7280" style={{ marginTop: 2 }} />
            <Text style={{ fontSize: 14, color: '#6B7280', flex: 1, lineHeight: 20 }} numberOfLines={2}>
              {row.address}
            </Text>
          </View>
        ) : null}

        {tip ? (
          <View
            style={{
              alignSelf: 'flex-start',
              marginTop: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: '#F3F4F6',
              maxWidth: '100%',
            }}
          >
            <Text style={{ fontSize: 13, color: '#4B5563', lineHeight: 18 }} numberOfLines={3}>
              {tip}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
