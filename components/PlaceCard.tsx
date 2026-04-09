import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { placeCategoryBadgeKey } from '../lib/exploreCategory';
import { getPlacePhotoSource } from '../lib/api/placePhoto';
import { useAddTripPlace } from '../lib/hooks/useItinerary';
import { firstPhotoReference } from '../lib/places/firstPhotoRef';
import type { Place } from '../types/places';

const ORANGE = '#F05A1A';
const CARD_RADIUS = 16;
const IMAGE_H = 200;

type Props = {
  place: Place;
  tripId: string;
  accessToken: string | null | undefined;
  isInItinerary: boolean;
};

export function PlaceCard({ place, tripId, accessToken, isInItinerary }: Props) {
  const { t } = useTranslation('explore');
  const router = useRouter();
  const addMut = useAddTripPlace();

  const ref = firstPhotoReference(place.photos);
  const photoSource = getPlacePhotoSource(ref, accessToken);

  const onToggleItinerary = () => {
    if (isInItinerary || addMut.isPending) {
      return;
    }
    void addMut.mutateAsync({ tripId, placeId: place.id }).catch(() => {});
  };

  const openDetail = () => {
    router.push(`/(stack)/place/${place.id}`);
  };

  const rating =
    place.rating != null && !Number.isNaN(Number(place.rating)) ? Number(place.rating).toFixed(1) : null;
  const reviewsCount = place.user_ratings_total;
  const badgeKey = placeCategoryBadgeKey(place.category);
  const description = place.address?.trim() || '';

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 20,
        borderRadius: CARD_RADIUS,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      <View style={{ height: IMAGE_H, width: '100%', backgroundColor: '#E5E7EB' }}>
        <Pressable onPress={openDetail} accessibilityRole="button" accessibilityLabel={place.name} style={{ flex: 1 }}>
          {photoSource ? (
            <Image source={photoSource} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="image-outline" size={48} color="#9CA3AF" />
            </View>
          )}
        </Pressable>
        {badgeKey ? (
          <View
            style={{
              position: 'absolute',
              left: 12,
              bottom: 12,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.95)',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827' }}>{t(badgeKey)}</Text>
          </View>
        ) : null}
        <Pressable
          onPress={onToggleItinerary}
          disabled={isInItinerary || addMut.isPending}
          hitSlop={8}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.95)',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.12,
            shadowRadius: 3,
            elevation: 2,
          }}
          accessibilityRole="button"
          accessibilityLabel={isInItinerary ? t('addedToItineraryA11y') : t('addToItineraryA11y')}
        >
          {addMut.isPending ? (
            <ActivityIndicator size="small" color="#6B7280" />
          ) : (
            <Ionicons
              name={isInItinerary ? 'heart' : 'heart-outline'}
              size={22}
              color={isInItinerary ? ORANGE : '#4B5563'}
            />
          )}
        </Pressable>
      </View>

      <Pressable onPress={openDetail} accessibilityRole="button" accessibilityLabel={place.name}>
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }} numberOfLines={2}>
            {place.name}
          </Text>
          {description ? (
            <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 6, lineHeight: 20 }} numberOfLines={2}>
              {description}
            </Text>
          ) : null}
          {rating != null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 }}>
              <Ionicons name="star" size={18} color={ORANGE} />
              <Text style={{ fontSize: 14, color: '#6B7280' }}>
                {reviewsCount != null && reviewsCount > 0
                  ? t('ratingReviewsLine', { rating, count: reviewsCount.toLocaleString() })
                  : rating}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
        <Pressable
          onPress={onToggleItinerary}
          disabled={isInItinerary || addMut.isPending}
          style={({ pressed }) => ({
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: isInItinerary ? '#F3F4F6' : ORANGE,
            alignItems: 'center',
            opacity: pressed && !isInItinerary && !addMut.isPending ? 0.92 : 1,
          })}
          accessibilityRole="button"
          accessibilityLabel={isInItinerary ? t('addedToItineraryA11y') : t('placeAddItinerary')}
        >
          {addMut.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: isInItinerary ? '#9CA3AF' : '#FFFFFF',
              }}
            >
              {isInItinerary ? t('placeAddedItinerary') : t('placeAddItinerary')}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
