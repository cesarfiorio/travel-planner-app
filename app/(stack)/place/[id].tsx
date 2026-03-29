import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../../constants/colors';
import { getPlacePhotoSource } from '../../../lib/api/placePhoto';
import { useAddTripPlace, useItinerary } from '../../../lib/hooks/useItinerary';
import { usePlaceById, useTripPlaceLink } from '../../../lib/hooks/usePlaceDetail';
import { firstPhotoReference } from '../../../lib/places/firstPhotoRef';
import { formatPriceLevel } from '../../../lib/places/priceLevel';
import { placeCategoryExploreKey } from '../../../lib/exploreCategory';
import { useAuth } from '../../../lib/hooks/useAuth';
import { useAppStore } from '../../../lib/store/appStore';

function weekdayLines(oh: unknown): string[] {
  if (!oh || typeof oh !== 'object') {
    return [];
  }
  const w = (oh as { weekday_text?: unknown }).weekday_text;
  if (!Array.isArray(w)) {
    return [];
  }
  return w.filter((x): x is string => typeof x === 'string');
}

export default function PlaceDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const placeId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['explore', 'common']);
  const { session } = useAuth();
  const activeTrip = useAppStore((s) => s.activeTrip);

  const { data: place, isLoading, isError, error } = usePlaceById(placeId);
  const { data: tripPlaceLinkId } = useTripPlaceLink(activeTrip?.id, placeId);
  const addMut = useAddTripPlace();
  const { removePlace } = useItinerary(activeTrip?.id);

  const [hoursOpen, setHoursOpen] = useState(false);

  const photoRef = place ? firstPhotoReference(place.photos) : undefined;
  const photoSource = getPlacePhotoSource(photoRef, session?.access_token);

  const hoursLines = useMemo(() => (place ? weekdayLines(place.opening_hours) : []), [place]);

  const onToggleItinerary = async () => {
    if (!activeTrip || !place) {
      return;
    }
    try {
      if (tripPlaceLinkId) {
        await removePlace(tripPlaceLinkId);
      } else {
        await addMut.mutateAsync({ tripId: activeTrip.id, placeId: place.id });
      }
    } catch {
      /* handled by mutation */
    }
  };

  const openMaps = () => {
    if (!place?.latitude || !place?.longitude) {
      return;
    }
    const lat = Number(place.latitude);
    const lng = Number(place.longitude);
    const label = encodeURIComponent(place.name);
    void Linking.openURL(
      place.google_place_id
        ? `https://www.google.com/maps/search/?api=1&query=${label}&query_place_id=${encodeURIComponent(place.google_place_id)}`
        : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    );
  };

  const openWebsite = () => {
    if (place?.website) {
      void Linking.openURL(place.website.startsWith('http') ? place.website : `https://${place.website}`);
    }
  };

  const dialPhone = () => {
    if (place?.phone) {
      void Linking.openURL(`tel:${place.phone.replace(/\s/g, '')}`);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !place) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 20, backgroundColor: colors.background }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ marginTop: 24, color: colors.inactive }}>{error instanceof Error ? error.message : t('explore:placeNotFound')}</Text>
      </View>
    );
  }

  const rating =
    place.rating != null && !Number.isNaN(Number(place.rating)) ? Number(place.rating).toFixed(1) : null;
  const price = formatPriceLevel(place.price_level == null ? null : Number(place.price_level));
  const categoryExploreKey = placeCategoryExploreKey(place.category);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 240, backgroundColor: colors.border }}>
          {photoSource ? (
            <Image source={photoSource} style={{ width: '100%', height: 240 }} contentFit="cover" transition={200} />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="image-outline" size={48} color={colors.inactive} />
            </View>
          )}
          <Pressable
            onPress={() => router.back()}
            style={{
              position: 'absolute',
              top: insets.top + 8,
              left: 16,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.9)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityRole="button"
            accessibilityLabel={t('explore:placeBackA11y')}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>{place.name}</Text>
          {place.formatted_address ? (
            <Text style={{ fontSize: 15, color: colors.inactive, marginTop: 8, lineHeight: 22 }}>{place.formatted_address}</Text>
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
            {rating != null ? (
              <View>
                <Text style={{ fontSize: 12, color: colors.inactive }}>{t('explore:placeRating')}</Text>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 2 }}>{rating}</Text>
              </View>
            ) : null}
            {price ? (
              <View>
                <Text style={{ fontSize: 12, color: colors.inactive }}>{t('explore:placePrice')}</Text>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 2 }}>{price}</Text>
              </View>
            ) : null}
          </View>

          {categoryExploreKey ? (
            <View style={{ marginTop: 14, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#F3F4F6' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inactive, textTransform: 'capitalize' }}>
                {t(categoryExploreKey)}
              </Text>
            </View>
          ) : place.category ? (
            <View style={{ marginTop: 14, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#F3F4F6' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inactive, textTransform: 'capitalize' }}>
                {place.category}
              </Text>
            </View>
          ) : null}

          {activeTrip ? (
            <Pressable
              onPress={() => void onToggleItinerary()}
              disabled={addMut.isPending}
              style={{
                marginTop: 20,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: tripPlaceLinkId ? '#FEE2E2' : colors.primarySolid,
                alignItems: 'center',
              }}
              accessibilityRole="button"
            >
              <Text style={{ color: tripPlaceLinkId ? '#B91C1C' : colors.onPrimary, fontWeight: '700', fontSize: 16 }}>
                {tripPlaceLinkId ? t('explore:placeRemoveItinerary') : t('explore:placeAddItinerary')}
              </Text>
            </Pressable>
          ) : null}

          {place.latitude && place.longitude ? (
            <Pressable
              onPress={openMaps}
              style={{ marginTop: 12, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
              accessibilityRole="button"
            >
              <Text style={{ fontWeight: '700', color: colors.primarySolid }}>{t('explore:placeOpenMaps')}</Text>
            </Pressable>
          ) : null}

          {place.website ? (
            <Pressable onPress={openWebsite} style={{ marginTop: 12 }}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('explore:placeWebsite')}</Text>
            </Pressable>
          ) : null}

          {place.phone ? (
            <Pressable onPress={dialPhone} style={{ marginTop: 8 }}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('explore:placePhone')}</Text>
              <Text style={{ color: colors.text, marginTop: 4 }}>{place.phone}</Text>
            </Pressable>
          ) : null}

          {hoursLines.length > 0 ? (
            <View style={{ marginTop: 20 }}>
              <Pressable onPress={() => setHoursOpen((o) => !o)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{t('explore:placeHoursTitle')}</Text>
                <Ionicons name={hoursOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.inactive} />
              </Pressable>
              {hoursOpen ? (
                <View style={{ marginTop: 10 }}>
                  {hoursLines.map((line) => (
                    <Text key={line} style={{ fontSize: 14, color: colors.inactive, marginBottom: 6 }}>
                      {line}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={{ marginTop: 28, padding: 14, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 }}>{t('explore:communityTipsTitle')}</Text>
            <Text style={{ fontSize: 14, color: colors.inactive, lineHeight: 20 }}>{t('explore:communityTipsPhase5')}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
