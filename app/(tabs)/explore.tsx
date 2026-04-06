import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { CategoryFilter } from '../../components/CategoryFilter';
import { PlaceCard } from '../../components/PlaceCard';
import { PlaceSkeleton } from '../../components/PlaceSkeleton';
import { TripSwitcher } from '../../components/TripSwitcher';
import { colors } from '../../constants/colors';
import { useAuth } from '../../lib/hooks/useAuth';
import { useDebouncedValue } from '../../lib/hooks/useDebouncedValue';
import { useSearchPlaces, useTripPlaceIds } from '../../lib/hooks/usePlaces';
import { useAppStore } from '../../lib/store/appStore';
import type { ExploreCategoryFilter } from '../../types/places';

const SCREEN_BG = '#F3F4F6';
const ORANGE = '#F05A1A';

export default function ExplorePlacesScreen() {
  const { t } = useTranslation(['explore', 'common', 'trips']);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const activeTrip = useAppStore((s) => s.activeTrip);
  const [searchText, setSearchText] = useState('');
  const [category, setCategory] = useState<ExploreCategoryFilter>('all');
  const debouncedSearch = useDebouncedValue(searchText, 400);

  const destination = useMemo(() => {
    const d = activeTrip?.destination_label?.trim() || activeTrip?.name?.trim() || '';
    return d;
  }, [activeTrip?.destination_label, activeTrip?.name]);

  const destinationTitle = destination || t('explore:unknownDestination');

  const { data: places = [], isPending, isError, error, refetch, isRefetching } = useSearchPlaces(
    destination || undefined,
    category,
  );

  const { data: placeIdSet } = useTripPlaceIds(activeTrip?.id);

  const filteredPlaces = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) {
      return places;
    }
    return places.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || (p.address?.toLowerCase().includes(q) ?? false),
    );
  }, [places, debouncedSearch]);

  if (!activeTrip) {
    return (
      <View style={{ flex: 1, backgroundColor: SCREEN_BG, paddingTop: insets.top + 24, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 }}>{t('explore:noTripTitle')}</Text>
        <Text style={{ fontSize: 16, color: colors.inactive, lineHeight: 24, marginBottom: 20 }}>{t('explore:noTripBody')}</Text>
        <Pressable
          onPress={() => router.push('/(tabs)/home')}
          style={{ alignSelf: 'flex-start', paddingVertical: 12, paddingHorizontal: 18, backgroundColor: ORANGE, borderRadius: 12 }}
          accessibilityRole="button"
        >
          <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{t('explore:noTripCta')}</Text>
        </Pressable>
      </View>
    );
  }

  const showSkeletons = isPending && places.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: SCREEN_BG, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 }}>
        <Text style={{ flex: 1, fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 }} numberOfLines={1}>
          {t('explore:screenTitle')}
        </Text>
        <TripSwitcher variant="icon" />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14, gap: 6 }}>
        <Ionicons name="location-outline" size={18} color="#6B7280" />
        <Text style={{ fontSize: 15, color: '#6B7280', flex: 1 }} numberOfLines={1}>
          {destinationTitle}
        </Text>
      </View>

      <View
        style={{
          marginHorizontal: 20,
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 4,
          minHeight: 48,
          borderRadius: 14,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: '#E5E7EB',
        }}
      >
        <Ionicons name="search-outline" size={20} color="#9CA3AF" style={{ marginRight: 10 }} />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder={t('explore:searchPlaceholder')}
          placeholderTextColor="#9CA3AF"
          style={{
            flex: 1,
            fontSize: 16,
            color: '#111827',
            paddingVertical: 10,
          }}
          accessibilityLabel={t('explore:searchPlaceholder')}
        />
      </View>

      <CategoryFilter value={category} onChange={setCategory} />

      {isError ? (
        <View style={{ paddingHorizontal: 24, paddingTop: 24, alignItems: 'center' }}>
          <Text style={{ color: colors.text, textAlign: 'center', marginBottom: 16 }}>
            {error instanceof Error ? error.message : t('explore:loadError')}
          </Text>
          <Pressable
            onPress={() => void refetch()}
            style={{ paddingVertical: 12, paddingHorizontal: 20, backgroundColor: ORANGE, borderRadius: 12 }}
            accessibilityRole="button"
          >
            <Text style={{ color: colors.onPrimary, fontWeight: '600' }}>{t('common:retry')}</Text>
          </Pressable>
        </View>
      ) : showSkeletons ? (
        <View style={{ paddingTop: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', paddingHorizontal: 20, marginBottom: 12 }}>
            {t('explore:topPlacesSection')}
          </Text>
          {Array.from({ length: 4 }).map((_, i) => (
            <PlaceSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredPlaces}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={ORANGE} />
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, flexGrow: 1 }}
          ListHeaderComponent={
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', paddingHorizontal: 20, marginBottom: 12, marginTop: 4 }}>
              {t('explore:topPlacesSection')}
            </Text>
          }
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: colors.inactive, marginTop: 32, paddingHorizontal: 24 }}>
              {t('explore:noResults')}
            </Text>
          }
          renderItem={({ item }) => (
            <PlaceCard
              place={item}
              tripId={activeTrip.id}
              accessToken={session?.access_token}
              isInItinerary={placeIdSet?.has(item.id) ?? false}
            />
          )}
        />
      )}
    </View>
  );
}
