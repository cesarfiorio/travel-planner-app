import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../constants/colors';
import { getPlacePhotoSource } from '../lib/api/placePhoto';
import { useAddTripPlace } from '../lib/hooks/useItinerary';
import { firstPhotoReference } from '../lib/places/firstPhotoRef';
import { formatPriceLevel } from '../lib/places/priceLevel';
import { placeCategoryExploreKey } from '../lib/exploreCategory';
import type { Place } from '../types/places';

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
    void addMut.mutateAsync({ tripId, placeId: place.id });
  };

  const price = formatPriceLevel(place.price_level);
  const rating =
    place.rating != null && !Number.isNaN(Number(place.rating)) ? Number(place.rating).toFixed(1) : null;

  const categoryExploreKey = placeCategoryExploreKey(place.category);

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        flexDirection: 'row',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
      }}
    >
      <Pressable
        onPress={() => router.push(`/(stack)/place/${place.id}`)}
        style={({ pressed }) => ({ flexDirection: 'row', flex: 1, opacity: pressed ? 0.92 : 1 })}
        accessibilityRole="button"
        accessibilityLabel={place.name}
      >
        <View style={{ width: 88, height: 88, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.border }}>
          {photoSource ? (
            <Image source={photoSource} style={{ width: 88, height: 88 }} contentFit="cover" transition={200} />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="image-outline" size={28} color={colors.inactive} />
            </View>
          )}
        </View>
        <View style={{ flex: 1, marginLeft: 12, minWidth: 0, paddingRight: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={2}>
            {place.name}
          </Text>
          <View style={{ alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#F3F4F6' }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.inactive, textTransform: 'capitalize' }}>
              {categoryExploreKey ? t(categoryExploreKey) : place.category}
            </Text>
          </View>
          {place.address ? (
            <Text style={{ fontSize: 13, color: colors.inactive, marginTop: 6 }} numberOfLines={2}>
              {place.address}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 }}>
            {rating != null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="star" size={14} color="#CA8A04" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{rating}</Text>
              </View>
            ) : null}
            {price ? <Text style={{ fontSize: 13, color: colors.text }}>{price}</Text> : null}
          </View>
        </View>
      </Pressable>
      <Pressable
        onPress={onToggleItinerary}
        hitSlop={10}
        disabled={isInItinerary || addMut.isPending}
        style={{ justifyContent: 'flex-start', paddingTop: 4 }}
        accessibilityRole="button"
        accessibilityLabel={isInItinerary ? t('addedToItineraryA11y') : t('addToItineraryA11y')}
      >
        <Ionicons
          name={isInItinerary ? 'heart' : 'heart-outline'}
          size={26}
          color={isInItinerary ? colors.primarySolid : colors.inactive}
        />
      </Pressable>
    </View>
  );
}
