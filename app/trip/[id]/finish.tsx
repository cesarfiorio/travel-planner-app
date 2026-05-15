import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LockedBanner } from '../../../components/LockedBanner';
import { PlanGate } from '../../../components/PlanGate';
import { TripShareCard, type TripShareCardHandle, ShareFormatSheet } from '../../../components/share';
import { colors } from '../../../constants/colors';
import { COMMUNITY_TAG_IDS, TRAVEL_STYLE_IDS, type TravelStyleId } from '../../../lib/community/constants';
import { formatErrorMessage } from '../../../lib/formatError';
import { useAuth } from '../../../lib/hooks/useAuth';
import { useDestinationCoverPhoto } from '../../../lib/hooks/useDestinationCoverPhoto';
import { useFinishTrip, type MemoryMood } from '../../../lib/hooks/useFinishTrip';
import { useItinerary, type ItineraryPlaceVm } from '../../../lib/hooks/useItinerary';
import { useSubscription } from '../../../lib/hooks/useSubscription';
import { useTripExpenses } from '../../../lib/hooks/useExpenses';
import { useCommunityRouteForTrip, usePublishCompletedTripToCommunity } from '../../../lib/hooks/usePublishTripCommunity';
import { tripMemoryQueryKey, useTripMemoryByTripId, useUpdateTripMemory } from '../../../lib/hooks/useTripMemory';
import { useTrip } from '../../../lib/hooks/useTrips';
import { hasSupabaseEnv, supabase } from '../../../lib/supabase';
import { tripRowToSnapshot, useAppStore } from '../../../lib/store/appStore';
import { itinerarySnapshotFromPlaces } from '../../../lib/trips/memoryItinerary';
import { favoriteSpotInfo, mostActiveDayInfo, tripDurationDaysFromStrings } from '../../../lib/trips/completeTripInsights';
import { coverGradientFromDestination, isTripOnOrAfterEndDateLocal, primaryTripEntryPath } from '../../../lib/trips/tripUi';
import type { PlacePin } from '../../../lib/utils/routeGeoJson';
import { formatCurrency } from '../../../lib/utils/formatCurrency';
import { captureAndShare, type ShareFormat } from '../../../lib/utils/shareCard';

import * as Localization from 'expo-localization';

const MOODS: MemoryMood[] = ['amazing', 'great', 'good', 'mixed'];
const ACCOMMODATION_RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function memoryMoodText(mood: string, tm: TFunction<'memory'>): string {
  if (mood === 'amazing') {
    return tm('mood_amazing');
  }
  if (mood === 'great') {
    return tm('mood_great');
  }
  if (mood === 'good') {
    return tm('mood_good');
  }
  if (mood === 'mixed') {
    return tm('mood_mixed');
  }
  return mood;
}

function normalizeAccommodationRating(value: number | null): number | null {
  if (!Number.isInteger(value) || value == null) {
    return null;
  }
  return Math.min(10, Math.max(1, value));
}

export default function FinishTripScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const tripId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t: tt } = useTranslation('trips');
  const { t: tm } = useTranslation('memory');
  const { t: tc } = useTranslation('community');
  const { t: ts } = useTranslation('share');
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const locale = Localization.getLocales()[0]?.languageTag ?? 'en-US';
  const queryClient = useQueryClient();
  const setActiveTrip = useAppStore((s) => s.setActiveTrip);

  const { data: trip, isLoading: tripLoading } = useTrip(tripId);
  const { places: itineraryPlaces, isLoading: itineraryLoading } = useItinerary(tripId);
  const { data: expenses = [] } = useTripExpenses(tripId);
  const { data: memory, isLoading: memLoading } = useTripMemoryByTripId(tripId);
  const updateTripMemoryPlaces = useUpdateTripMemory();
  const { data: communityRoute } = useCommunityRouteForTrip(tripId);
  const publishCommunityMut = usePublishCompletedTripToCommunity();
  const finishMut = useFinishTrip();
  const { isExplorer: explorer } = useSubscription();

  const communityFormSeededRef = useRef<string>('');
  const memoryEnsureAttempted = useRef(false);
  const [memoryEnsureBusy, setMemoryEnsureBusy] = useState(false);

  const [shareOn, setShareOn] = useState(true);
  const [tip, setTip] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [travelStyle, setTravelStyle] = useState<TravelStyleId | null>('group');
  const [memoryOn, setMemoryOn] = useState(true);
  const [mood, setMood] = useState<MemoryMood>('great');

  const [publishTip, setPublishTip] = useState('');
  const [publishTags, setPublishTags] = useState<string[]>([]);
  const [publishTravelStyle, setPublishTravelStyle] = useState<TravelStyleId | null>('group');

  const shotRef = useRef<ViewShot | null>(null);
  const tripCardRef = useRef<TripShareCardHandle>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareFormat, setShareFormat] = useState<'story' | 'square'>('story');
  /** `null` = use suggested favorite (most stops); otherwise explicit `places.id`. */
  const [favoritePlaceId, setFavoritePlaceId] = useState<string | null>(null);
  const [hotelNamesDraft, setHotelNamesDraft] = useState('');
  const [accommodationRating, setAccommodationRating] = useState<number | null>(null);

  useEffect(() => {
    memoryEnsureAttempted.current = false;
  }, [tripId]);

  useEffect(() => {
    setFavoritePlaceId(null);
    setHotelNamesDraft('');
    setAccommodationRating(null);
  }, [tripId]);

  useEffect(() => {
    if (trip?.status === 'completed' && memory) {
      setFavoritePlaceId(memory.favorite_place_id ?? null);
      setHotelNamesDraft(memory.hotel_names ?? '');
      setAccommodationRating(memory.accommodation_rating ?? null);
    }
  }, [trip?.status, memory?.id, memory?.favorite_place_id, memory?.hotel_names, memory?.accommodation_rating]);

  useEffect(() => {
    communityFormSeededRef.current = '';
  }, [tripId]);

  useEffect(() => {
    if (trip) {
      setActiveTrip(tripRowToSnapshot(trip));
    }
  }, [trip, setActiveTrip]);

  useEffect(() => {
    if (!communityRoute?.id || !tripId) {
      return;
    }
    const mark = `${tripId}:${communityRoute.id}`;
    if (communityFormSeededRef.current === mark) {
      return;
    }
    communityFormSeededRef.current = mark;
    setPublishTip(communityRoute.tip?.trim() ?? '');
    const rawTags = communityRoute.tags ?? [];
    const allowedTags = COMMUNITY_TAG_IDS as readonly string[];
    const nextTags = rawTags.filter((x): x is string => typeof x === 'string' && allowedTags.includes(x)).slice(0, 3);
    setPublishTags(nextTags);
    const st = communityRoute.travel_style;
    if (st && (TRAVEL_STYLE_IDS as readonly string[]).includes(st)) {
      setPublishTravelStyle(st as TravelStyleId);
    }
  }, [tripId, communityRoute]);

  useEffect(() => {
    if (!memory?.id || !tripId || itineraryLoading || trip?.status !== 'completed') {
      return;
    }
    if (itineraryPlaces.length === 0) {
      return;
    }
    const snapshot = itinerarySnapshotFromPlaces(itineraryPlaces);
    const sameCount = memory.places_visited === itineraryPlaces.length;
    const sameSnap = JSON.stringify(memory.itinerary_snapshot ?? null) === JSON.stringify(snapshot);
    if (sameCount && sameSnap) {
      return;
    }
    updateTripMemoryPlaces.mutate({
      memoryId: memory.id,
      tripId,
      places_visited: itineraryPlaces.length,
      itinerary_snapshot: snapshot,
    });
  }, [
    memory?.id,
    memory?.places_visited,
    memory?.itinerary_snapshot,
    itineraryPlaces,
    itineraryLoading,
    tripId,
    trip?.status,
    updateTripMemoryPlaces,
  ]);

  useEffect(() => {
    if (!tripId || !trip || trip.status !== 'completed' || memLoading || memory) {
      return;
    }
    if (memoryEnsureAttempted.current || !supabase || !hasSupabaseEnv || !userId) {
      return;
    }
    memoryEnsureAttempted.current = true;
    setMemoryEnsureBusy(true);
    const now = new Date().toISOString();
    void (async () => {
      try {
        const { error } = await supabase.from('trip_memories').insert({
          trip_id: tripId,
          created_by: userId,
          mood: 'good',
          places_visited: 0,
          total_spent_cents: 0,
          travelers_count: 1,
          destination_label: trip.destination_label,
          start_date: trip.start_date,
          end_date: trip.end_date,
          updated_at: now,
        });
        if (error && (error as { code?: string }).code !== '23505') {
          throw error;
        }
        await queryClient.invalidateQueries({ queryKey: tripMemoryQueryKey(tripId) });
      } catch {
        memoryEnsureAttempted.current = false;
      } finally {
        setMemoryEnsureBusy(false);
      }
    })();
  }, [tripId, trip, memLoading, memory, userId, queryClient]);

  const isOwner = useMemo(
    () => Boolean(trip?.trip_members.some((m) => m.user_id === userId && m.role === 'owner')),
    [trip?.trip_members, userId],
  );

  const isCompleted = trip?.status === 'completed';
  const canFinishPlanningTrip = useMemo(
    () => (trip ? isTripOnOrAfterEndDateLocal(trip) : false),
    [trip],
  );
  /** Allow finish + community when active, or planning but calendar end has arrived (or passed). */
  const isActiveFinish = Boolean(
    trip && (trip.status === 'active' || (trip.status === 'planning' && canFinishPlanningTrip)),
  );

  const visitedPlaces = useMemo(
    () => itineraryPlaces.filter((r: ItineraryPlaceVm) => r.status === 'visited'),
    [itineraryPlaces],
  );
  const placesForCount = visitedPlaces.length > 0 ? visitedPlaces : itineraryPlaces;
  const placesVisited = visitedPlaces.length > 0 ? visitedPlaces.length : itineraryPlaces.length;
  const placeIds = useMemo(
    () => itineraryPlaces.map((r) => r.placeId).filter((id): id is string => id != null && id.length > 0),
    [itineraryPlaces],
  );

  const placesDisplayCount = useMemo(() => {
    if (itineraryPlaces.length > 0) {
      return itineraryPlaces.length;
    }
    return memory?.places_visited ?? 0;
  }, [itineraryPlaces, memory?.places_visited]);

  const communityRoutePins = useMemo((): PlacePin[] => {
    const ids = [
      ...new Set(
        itineraryPlaces.map((p) => p.placeId).filter((id): id is string => id != null && id.length > 0),
      ),
    ];
    const rowByPlace = new Map<string, ItineraryPlaceVm>();
    for (const p of itineraryPlaces) {
      if (p.placeId && !rowByPlace.has(p.placeId)) {
        rowByPlace.set(p.placeId, p);
      }
    }
    return ids
      .map((id) => {
        const p = rowByPlace.get(id)!;
        return {
          id: p.placeId as string,
          name: p.name,
          latitude: p.latitude,
          longitude: p.longitude,
        };
      })
      .filter((pin) => pin.latitude != null && pin.longitude != null);
  }, [itineraryPlaces]);

  const travelersCount = useMemo(() => {
    if (isCompleted && memory?.travelers_count != null) {
      return memory.travelers_count;
    }
    if (!trip) {
      return 0;
    }
    const ids = new Set<string>();
    ids.add(trip.created_by);
    for (const m of trip.trip_members ?? []) {
      ids.add(m.user_id);
    }
    return Math.max(1, ids.size);
  }, [isCompleted, memory?.travelers_count, trip]);

  const totalSpentCents = useMemo(() => expenses.reduce((a, e) => a + e.amount_cents, 0), [expenses]);

  const totalSpentFromExpenses = useMemo(
    () => expenses.reduce((acc, e) => acc + e.amount_cents, 0),
    [expenses],
  );
  const tripCurrency = useMemo(
    () => trip?.default_currency?.trim() || expenses[0]?.currency || 'EUR',
    [trip?.default_currency, expenses],
  );
  const spentCentsForDisplay = useMemo(
    () => (expenses.length > 0 ? totalSpentFromExpenses : (memory?.total_spent_cents ?? totalSpentCents)),
    [expenses.length, totalSpentFromExpenses, memory?.total_spent_cents, totalSpentCents],
  );
  const spentLabel = useMemo(
    () => formatCurrency(spentCentsForDisplay, tripCurrency, locale),
    [spentCentsForDisplay, tripCurrency, locale],
  );

  const durationDays = useMemo(
    () => tripDurationDaysFromStrings(trip?.start_date ?? null, trip?.end_date ?? null),
    [trip?.start_date, trip?.end_date],
  );

  const heroTitle = useMemo(
    () => trip?.destination_label?.trim() || trip?.name || '',
    [trip?.destination_label, trip?.name],
  );

  const destLabel = useMemo(
    () => trip?.destination_label?.trim() || trip?.name?.trim() || '',
    [trip?.destination_label, trip?.name],
  );
  const { data: destinationHeroUrl } = useDestinationCoverPhoto(destLabel, destLabel.length >= 2);
  const heroImageSource = useMemo(
    () => (destinationHeroUrl?.trim() ? { uri: destinationHeroUrl.trim() } : null),
    [destinationHeroUrl],
  );

  const mostActive = useMemo(
    () => mostActiveDayInfo(itineraryPlaces, trip?.start_date ?? null, locale),
    [itineraryPlaces, trip?.start_date, locale],
  );
  const favoriteSpotAuto = useMemo(() => favoriteSpotInfo(itineraryPlaces), [itineraryPlaces]);

  const uniquePlacesForFavorite = useMemo(() => {
    const seen = new Set<string>();
    const out: { placeId: string; name: string }[] = [];
    for (const p of itineraryPlaces) {
      if (!p.placeId || seen.has(p.placeId)) {
        continue;
      }
      seen.add(p.placeId);
      out.push({ placeId: p.placeId, name: p.name });
    }
    return out;
  }, [itineraryPlaces]);

  const displayFavorite = useMemo(() => {
    if (favoritePlaceId) {
      const rows = itineraryPlaces.filter((p) => p.placeId === favoritePlaceId);
      if (rows.length > 0) {
        return { name: rows[0].name, visits: rows.length };
      }
    }
    return favoriteSpotAuto ? { name: favoriteSpotAuto.name, visits: favoriteSpotAuto.visits } : null;
  }, [favoritePlaceId, itineraryPlaces, favoriteSpotAuto]);

  const canPickFavoriteSpot = useMemo(
    () =>
      isOwner &&
      uniquePlacesForFavorite.length > 0 &&
      (isActiveFinish || (isCompleted && Boolean(memory))),
    [isOwner, uniquePlacesForFavorite.length, isActiveFinish, isCompleted, memory],
  );

  const applyFavoritePlaceSelection = useCallback(
    (placeId: string | null) => {
      setFavoritePlaceId(placeId);
      if (isCompleted && memory?.id && isOwner) {
        updateTripMemoryPlaces.mutate({
          memoryId: memory.id,
          tripId: tripId!,
          favorite_place_id: placeId,
        });
      }
    },
    [isCompleted, memory?.id, isOwner, tripId, updateTripMemoryPlaces],
  );

  const saveAccommodationDetails = useCallback((nextHotelNames = hotelNamesDraft, nextRating = accommodationRating) => {
    if (!isCompleted || !memory?.id || !isOwner || !tripId) {
      return;
    }
    updateTripMemoryPlaces.mutate({
      memoryId: memory.id,
      tripId,
      hotel_names: nextHotelNames,
      accommodation_rating: normalizeAccommodationRating(nextRating),
    });
  }, [accommodationRating, hotelNamesDraft, isCompleted, isOwner, memory?.id, tripId, updateTripMemoryPlaces]);

  const perPersonCents =
    travelersCount > 0 ? Math.round(spentCentsForDisplay / travelersCount) : spentCentsForDisplay;
  const perPersonLabel = useMemo(
    () => formatCurrency(perPersonCents, tripCurrency, locale),
    [perPersonCents, tripCurrency, locale],
  );

  const showCommunitySection = useMemo(
    () => isOwner && isCompleted,
    [isOwner, isCompleted],
  );

  const heroGradient = useMemo(
    () => coverGradientFromDestination(trip?.destination_label ?? trip?.name),
    [trip?.destination_label, trip?.name],
  );

  const publicUrl = memory ? `https://routeflow.app/trip/${memory.share_token}` : '';

  const togglePublishTag = useCallback((id: string) => {
    setPublishTags((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  const toggleTag = (id: string) => {
    setTags((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const onPublishToCommunity = useCallback(() => {
    if (!trip || !memory || !tripId) {
      return;
    }
    const placeIdsUniq = [
      ...new Set(
        itineraryPlaces.map((p) => p.placeId).filter((id): id is string => id != null && id.length > 0),
      ),
    ];
    if (placeIdsUniq.length === 0) {
      Alert.alert(tm('errorTitle'), tm('communityPlacesRequired'));
      return;
    }
    if (!publishTip.trim()) {
      Alert.alert(tm('errorTitle'), tm('communityTipRequired'));
      return;
    }
    if (!publishTravelStyle) {
      Alert.alert(tm('errorTitle'), tm('communityStyleRequired'));
      return;
    }
    const isCommunityUpdate = Boolean(communityRoute?.id);
    router.back();
    publishCommunityMut.mutate(
      {
        tripId: trip.id,
        tripName: trip.name,
        destinationLabel: trip.destination_label,
        startDate: trip.start_date,
        endDate: trip.end_date,
        placeIds: placeIdsUniq,
        routePins: communityRoutePins,
        tip: publishTip,
        tags: publishTags,
        travelStyle: publishTravelStyle,
        coverPhotoUrl: destinationHeroUrl?.trim() || memory.cover_photo_url,
        hotelNames: hotelNamesDraft,
        accommodationRating: normalizeAccommodationRating(accommodationRating),
      },
      {
        onSuccess: () => {
          if (!isCommunityUpdate) {
            Alert.alert(tm('communityPublishedTitle'), tm('communityPublishedBody'));
          }
        },
        onError: (e) => {
          Alert.alert(tm('errorTitle'), formatErrorMessage(e, tm('communityPublishError')));
        },
      },
    );
  }, [
    trip,
    memory,
    tripId,
    publishTip,
    publishTravelStyle,
    itineraryPlaces,
    publishTags,
    communityRoutePins,
    publishCommunityMut,
    communityRoute?.id,
    router,
    tm,
    destinationHeroUrl,
    hotelNamesDraft,
    accommodationRating,
  ]);

  const buildPayload = () => ({
    mode: 'publish' as const,
    tripId: tripId!,
    tripName: trip!.name,
    destinationLabel: trip!.destination_label,
    startDate: trip!.start_date,
    endDate: trip!.end_date,
    placeIds,
    shareToCommunity: shareOn,
    tip,
    tags,
    travelStyle: shareOn ? travelStyle : null,
    createMemory: explorer && memoryOn,
    explorer,
    mood,
    coverPlaceId: null,
    coverLocalUri: null,
    favoritePlaceId,
    hotelNames: hotelNamesDraft,
    accommodationRating: normalizeAccommodationRating(accommodationRating),
    placesVisited,
    totalSpentCents,
    travelersCount,
  });

  const onPublish = () => {
    if (!trip || !tripId) {
      return;
    }
    if (shareOn) {
      if (!tip.trim()) {
        Alert.alert(tt('finishErrorTitle'), tt('finishTipRequired'));
        return;
      }
      if (!travelStyle) {
        Alert.alert(tt('finishErrorTitle'), tt('finishStyleRequired'));
        return;
      }
    }
    finishMut.mutate(buildPayload(), {
      onSuccess: () => {
        router.replace(tripId ? primaryTripEntryPath({ id: tripId, status: 'completed' }) : '/(tabs)/home');
      },
      onError: (e) => Alert.alert(tt('finishErrorTitle'), formatErrorMessage(e, tt('errorUpdateFailed'))),
    });
  };

  const onCompleteOnly = () => {
    if (!tripId) {
      return;
    }
    finishMut.mutate(
      {
        mode: 'complete_only',
        tripId,
        tripName: trip?.name ?? '',
        destinationLabel: trip?.destination_label ?? null,
        startDate: trip?.start_date ?? null,
        endDate: trip?.end_date ?? null,
        placeIds,
        shareToCommunity: false,
        tip: '',
        tags: [],
        travelStyle: null,
        createMemory: false,
        explorer: false,
        mood: 'good',
        coverPlaceId: null,
        coverLocalUri: null,
        favoritePlaceId: null,
        hotelNames: null,
        accommodationRating: null,
        placesVisited,
        totalSpentCents,
        travelersCount,
      },
      {
        onSuccess: () => router.replace(tripId ? primaryTripEntryPath({ id: tripId, status: 'completed' }) : '/(tabs)/home'),
        onError: (e) => Alert.alert(tt('finishErrorTitle'), formatErrorMessage(e, tt('errorUpdateFailed'))),
      },
    );
  };

  const handleShareFormat = async (fmt: ShareFormat) => {
    if (fmt === 'link') {
      await Clipboard.setStringAsync(publicUrl);
      Alert.alert(tm('linkCopiedTitle'), tm('linkCopiedBody'));
      return;
    }
    setShareFormat(fmt === 'story' ? 'story' : 'square');
    setShareBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 100));
      await captureAndShare(tripCardRef as React.RefObject<ViewShot | null>, {
        saveToLibrary: true,
        instagramStory: fmt === 'story',
      });
    } catch (e) {
      Alert.alert(tm('errorTitle'), formatErrorMessage(e, tm('errorShare')));
    } finally {
      setShareBusy(false);
    }
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(publicUrl);
    Alert.alert(tm('linkCopiedTitle'), tm('linkCopiedBody'));
  };

  if (tripLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
        <ActivityIndicator color={colors.primarySolid} size="large" />
      </View>
    );
  }

  if (!trip || !tripId) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 20, backgroundColor: '#F3F4F6' }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ marginTop: 20, color: colors.inactive }}>{tt('notFound')}</Text>
      </View>
    );
  }

  if (isCompleted && (memLoading || memoryEnsureBusy)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
        <ActivityIndicator color={colors.primarySolid} size="large" />
      </View>
    );
  }

  if (isCompleted && !memory) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 20, backgroundColor: '#F3F4F6' }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ marginTop: 20, color: colors.inactive }}>{tm('notFound')}</Text>
      </View>
    );
  }

  if (isActiveFinish && !isOwner) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 20, backgroundColor: '#F3F4F6' }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ marginTop: 20, color: colors.inactive }}>{tt('finishNotAllowed')}</Text>
      </View>
    );
  }

  const busy = finishMut.isPending;
  const cardBg = '#FFFFFF';
  const screenBg = '#F3F4F6';

  return (
    <View style={{ flex: 1, backgroundColor: screenBg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 8,
          backgroundColor: screenBg,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={tt('detailBackA11y')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, marginLeft: 12, fontSize: 18, fontWeight: '700', color: colors.text }} numberOfLines={1}>
          {tt('completeScreenTitle')}
        </Text>
        <Pressable
          onPress={() => router.push(`/trip/${tripId}`)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={tt('completeTripHubA11y')}
        >
          <Ionicons name="grid-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View style={{ position: 'relative' }}>
          {heroImageSource ? (
            <Image source={heroImageSource} style={{ width: '100%', height: 220 }} contentFit="cover" />
          ) : (
            <LinearGradient colors={heroGradient} style={{ width: '100%', height: 220 }} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 140,
              justifyContent: 'flex-end',
              paddingHorizontal: 20,
              paddingBottom: 20,
            }}
          >
            <View style={{ alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 10 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                {isCompleted ? tt('completeBadgeCompleted') : tt('completeBadgeActive')}
              </Text>
            </View>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' }} numberOfLines={2}>
              {heroTitle}
            </Text>
          </LinearGradient>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 12 }}>{tt('completeSummaryTitle')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[
              {
                icon: 'calendar-outline' as const,
                label: tt('completeDuration'),
                value:
                  durationDays != null ?
                    tt('completeDurationDays', { count: durationDays })
                  : '—',
              },
              {
                icon: 'location-outline' as const,
                label: tt('completePlacesVisited'),
                value: String(placesDisplayCount),
              },
              {
                icon: 'people-outline' as const,
                label: tt('completeTravelers'),
                value: String(travelersCount),
              },
              {
                icon: 'trending-up-outline' as const,
                label: tt('completeTotalSpent'),
                value: spentLabel,
              },
            ].map((cell) => (
              <View
                key={cell.label}
                style={{
                  width: '48%',
                  flexGrow: 1,
                  backgroundColor: cardBg,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={cell.icon} size={18} color={colors.primarySolid} />
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: colors.inactive, marginBottom: 4 }}>{cell.label}</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{cell.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 12 }}>{tt('completeInsightsTitle')}</Text>
          <View style={{ gap: 10 }}>
            <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="stats-chart-outline" size={22} color={colors.primarySolid} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: colors.inactive }}>{tt('completeInsightMostActive')}</Text>
                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{mostActive?.dateLabel ?? '—'}</Text>
                {mostActive ? (
                  <Text style={{ fontSize: 12, color: colors.inactive, marginTop: 2 }}>
                    {tt('completeInsightPlacesCount', { count: mostActive.count })}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="location-outline" size={22} color={colors.primarySolid} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, color: colors.inactive }}>{tt('completeInsightFavorite')}</Text>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{displayFavorite?.name ?? '—'}</Text>
                  {displayFavorite ? (
                    <Text style={{ fontSize: 12, color: colors.inactive, marginTop: 2 }}>
                      {tt('completeInsightVisitedCount', { count: displayFavorite.visits })}
                    </Text>
                  ) : null}
                </View>
              </View>
              {canPickFavoriteSpot ? (
                <View style={{ marginTop: 14 }}>
                  <Text style={{ fontSize: 13, color: colors.inactive, marginBottom: 8 }}>{tt('completeFavoriteHint')}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <Pressable
                      onPress={() => applyFavoritePlaceSelection(null)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: favoritePlaceId === null }}
                      accessibilityLabel={tt('completeFavoriteSuggested')}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 20,
                        backgroundColor: favoritePlaceId === null ? '#E0E7FF' : '#F3F4F6',
                        borderWidth: 1,
                        borderColor: favoritePlaceId === null ? '#6366F1' : colors.border,
                        maxWidth: '100%',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: favoritePlaceId === null ? '#3730A3' : colors.text,
                        }}
                        numberOfLines={1}
                      >
                        {tt('completeFavoriteSuggested')}
                      </Text>
                    </Pressable>
                    {uniquePlacesForFavorite.map((pl) => {
                      const selected = favoritePlaceId === pl.placeId;
                      return (
                        <Pressable
                          key={pl.placeId}
                          onPress={() => applyFavoritePlaceSelection(pl.placeId)}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          accessibilityLabel={pl.name}
                          style={{
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 20,
                            backgroundColor: selected ? '#E0E7FF' : '#F3F4F6',
                            borderWidth: 1,
                            borderColor: selected ? '#6366F1' : colors.border,
                            maxWidth: '100%',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '600',
                              color: selected ? '#3730A3' : colors.text,
                            }}
                            numberOfLines={2}
                          >
                            {pl.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
            {isCompleted && memory ? (
              <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Ionicons name="bed-outline" size={22} color={colors.primarySolid} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: colors.inactive }}>{tm('accommodationTitle')}</Text>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>
                      {accommodationRating ? tm('accommodationRatingValue', { rating: accommodationRating }) : '—'}
                    </Text>
                  </View>
                </View>
                {isOwner ? (
                  <>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 6 }}>{tm('hotelNamesLabel')}</Text>
                    <TextInput
                      value={hotelNamesDraft}
                      onChangeText={setHotelNamesDraft}
                      onBlur={() => saveAccommodationDetails()}
                      multiline
                      maxLength={500}
                      placeholder={tm('hotelNamesPlaceholder')}
                      placeholderTextColor={colors.inactive}
                      style={{
                        minHeight: 72,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 16,
                        color: colors.text,
                        textAlignVertical: 'top',
                        marginBottom: 12,
                        backgroundColor: '#fff',
                      }}
                    />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 8 }}>{tm('accommodationRatingLabel')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {ACCOMMODATION_RATINGS.map((rating) => {
                        const selected = accommodationRating === rating;
                        return (
                          <Pressable
                            key={rating}
                            onPress={() => {
                              setAccommodationRating(rating);
                              saveAccommodationDetails(hotelNamesDraft, rating);
                            }}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            accessibilityLabel={tm('accommodationRatingValue', { rating })}
                            style={{
                              width: 42,
                              height: 38,
                              borderRadius: 12,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: selected ? colors.primarySolid : '#F3F4F6',
                              borderWidth: 1,
                              borderColor: selected ? colors.primarySolid : colors.border,
                            }}
                          >
                            <Text style={{ fontWeight: '800', color: selected ? colors.onPrimary : colors.text }}>{rating}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Pressable
                      onPress={() => saveAccommodationDetails()}
                      disabled={updateTripMemoryPlaces.isPending}
                      style={{
                        alignSelf: 'flex-start',
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: 12,
                        backgroundColor: colors.primarySolid,
                        opacity: updateTripMemoryPlaces.isPending ? 0.7 : 1,
                      }}
                    >
                      <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>{tm('accommodationSave')}</Text>
                    </Pressable>
                  </>
                ) : (
                  <Text style={{ fontSize: 15, color: colors.text, lineHeight: 22 }}>
                    {memory.hotel_names?.trim() || tm('accommodationEmpty')}
                  </Text>
                )}
              </View>
            ) : null}
            <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="wallet-outline" size={22} color={colors.primarySolid} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: colors.inactive }}>{tt('completeInsightBudget')}</Text>
                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{perPersonLabel}</Text>
                <Text style={{ fontSize: 12, color: colors.inactive, marginTop: 2 }}>{tt('completeInsightBudgetSub')}</Text>
              </View>
            </View>
          </View>
        </View>

        {isCompleted && memory ? (
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <Text style={{ fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: 8 }}>{memoryMoodText(memory.mood, tm)}</Text>
          </View>
        ) : null}

        {isActiveFinish ? (
          <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 12 }}>{tt('completeFinishSection')}</Text>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 10 }}>{tt('finishShareSection')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ flex: 1, fontSize: 15, color: colors.text, marginRight: 12 }}>{tt('finishShareToggle')}</Text>
              <Switch value={shareOn} onValueChange={setShareOn} />
            </View>

            {shareOn ? (
              <>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 6 }}>{tt('finishBestTip')}</Text>
                <TextInput
                  value={tip}
                  onChangeText={(x) => setTip(x.slice(0, 600))}
                  multiline
                  maxLength={600}
                  placeholder={tt('finishTipPlaceholder')}
                  placeholderTextColor={colors.inactive}
                  style={{
                    minHeight: 88,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 16,
                    color: colors.text,
                    textAlignVertical: 'top',
                    marginBottom: 8,
                    backgroundColor: cardBg,
                  }}
                />
                <Text style={{ fontSize: 12, color: colors.inactive, marginBottom: 14 }}>{tip.length}/600</Text>

                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 8 }}>{tt('finishTags')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {COMMUNITY_TAG_IDS.map((id) => {
                    const on = tags.includes(id);
                    return (
                      <Pressable
                        key={id}
                        onPress={() => toggleTag(id)}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 20,
                          backgroundColor: on ? '#E0E7FF' : '#F3F4F6',
                          borderWidth: 1,
                          borderColor: on ? '#6366F1' : colors.border,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: on ? '#3730A3' : colors.text }}>
                          {(tc as (k: string) => string)(`tag_${id}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 8 }}>{tt('finishTravelStyle')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {TRAVEL_STYLE_IDS.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setTravelStyle(s)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 20,
                        backgroundColor: travelStyle === s ? colors.primarySolid : '#F3F4F6',
                      }}
                    >
                      <Text style={{ fontWeight: '700', color: travelStyle === s ? colors.onPrimary : colors.text }}>
                        {(tc as (k: string) => string)(`style_${s}`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            <PlanGate
              requires="explorer"
              feature="finishMemory"
              fallback={<LockedBanner message={tm('lockedMessage')} featureId="finishMemory" />}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ flex: 1, fontSize: 15, color: colors.text, marginRight: 12 }}>{tt('completeMemoryToggle')}</Text>
                <Switch value={memoryOn} onValueChange={setMemoryOn} />
              </View>

              {memoryOn ? (
                <>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 8 }}>{tm('moodLabel')}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {MOODS.map((m) => (
                      <Pressable
                        key={m}
                        onPress={() => setMood(m)}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          backgroundColor: mood === m ? '#FEF3C7' : '#F3F4F6',
                          borderWidth: 1,
                          borderColor: mood === m ? '#F59E0B' : colors.border,
                        }}
                      >
                        <Text style={{ fontWeight: '700' }}>{(tm as (k: string) => string)(`mood_${m}`)}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 6 }}>{tm('hotelNamesLabel')}</Text>
                  <TextInput
                    value={hotelNamesDraft}
                    onChangeText={setHotelNamesDraft}
                    multiline
                    maxLength={500}
                    placeholder={tm('hotelNamesPlaceholder')}
                    placeholderTextColor={colors.inactive}
                    style={{
                      minHeight: 72,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 16,
                      color: colors.text,
                      textAlignVertical: 'top',
                      marginBottom: 12,
                      backgroundColor: cardBg,
                    }}
                  />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 8 }}>{tm('accommodationRatingLabel')}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {ACCOMMODATION_RATINGS.map((rating) => {
                      const selected = accommodationRating === rating;
                      return (
                        <Pressable
                          key={rating}
                          onPress={() => setAccommodationRating(rating)}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          accessibilityLabel={tm('accommodationRatingValue', { rating })}
                          style={{
                            width: 42,
                            height: 38,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: selected ? colors.primarySolid : '#F3F4F6',
                            borderWidth: 1,
                            borderColor: selected ? colors.primarySolid : colors.border,
                          }}
                        >
                          <Text style={{ fontWeight: '800', color: selected ? colors.onPrimary : colors.text }}>{rating}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}
            </PlanGate>
          </View>
        ) : null}

        {showCommunitySection && memory ? (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 6 }}>{tm('communitySectionTitle')}</Text>
            {communityRoute?.id ? (
              <View
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: '#ECFDF5',
                  borderWidth: 1,
                  borderColor: '#A7F3D0',
                }}
              >
                <Text style={{ fontSize: 14, color: '#047857', lineHeight: 20 }}>{tm('communityPublishedBadgeBody')}</Text>
              </View>
            ) : null}
            <Text style={{ fontSize: 14, color: colors.inactive, marginBottom: 14, lineHeight: 20 }}>
              {communityRoute?.id ? tm('communitySectionSubtitleUpdate') : tm('communitySectionSubtitle')}
            </Text>

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 6 }}>{tm('communityTipLabel')}</Text>
            <TextInput
              value={publishTip}
              onChangeText={(x) => setPublishTip(x.slice(0, 600))}
              multiline
              maxLength={600}
              placeholder={tm('communityTipPlaceholder')}
              placeholderTextColor={colors.inactive}
              style={{
                minHeight: 88,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 12,
                fontSize: 16,
                color: colors.text,
                textAlignVertical: 'top',
                marginBottom: 8,
                backgroundColor: cardBg,
              }}
            />
            <Text style={{ fontSize: 12, color: colors.inactive, marginBottom: 14 }}>{publishTip.length}/600</Text>

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 8 }}>{tm('communityTagsLabel')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {COMMUNITY_TAG_IDS.map((id) => {
                const on = publishTags.includes(id);
                return (
                  <Pressable
                    key={id}
                    onPress={() => togglePublishTag(id)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 20,
                      backgroundColor: on ? '#E0E7FF' : '#F3F4F6',
                      borderWidth: 1,
                      borderColor: on ? '#6366F1' : colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: on ? '#3730A3' : colors.text }}>
                      {(tc as (k: string) => string)(`tag_${id}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 8 }}>{tm('communityTravelStyleLabel')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {TRAVEL_STYLE_IDS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setPublishTravelStyle(s)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 20,
                    backgroundColor: publishTravelStyle === s ? colors.primarySolid : '#F3F4F6',
                  }}
                >
                  <Text style={{ fontWeight: '700', color: publishTravelStyle === s ? colors.onPrimary : colors.text }}>
                    {(tc as (k: string) => string)(`style_${s}`)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={onPublishToCommunity}
              disabled={publishCommunityMut.isPending}
              style={{
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: colors.primarySolid,
                alignItems: 'center',
                opacity: publishCommunityMut.isPending ? 0.7 : 1,
              }}
            >
              {publishCommunityMut.isPending ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 16 }}>
                  {communityRoute?.id ? tm('communityUpdate') : tm('communityPublish')}
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {isCompleted && memory ? (
          <>
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 6 }}>{tm('publicLink')}</Text>
              <Pressable onPress={copyLink}>
                <Text style={{ fontSize: 14, color: colors.primarySolid, textDecorationLine: 'underline' }} numberOfLines={2}>
                  {publicUrl}
                </Text>
                <Text style={{ fontSize: 13, color: colors.inactive, marginTop: 4 }}>{tm('tapToCopy')}</Text>
              </Pressable>
            </View>

            <PlanGate
              requires="explorer"
              feature="shareJournal"
              fallback={<LockedBanner message={tm('upgradeShareJournal')} featureId="shareJournal" />}
            >
              <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
                <View style={{ marginBottom: 8, borderRadius: 16, overflow: 'hidden' }}>
                  <ViewShot ref={shotRef} options={{ format: 'png', quality: 0.95 }} style={{ borderRadius: 16, overflow: 'hidden' }}>
                    <LinearGradient colors={['#1e293b', '#334155']} style={{ padding: 24, minHeight: 200 }}>
                      <Text style={{ color: '#f97316', fontSize: 14, fontWeight: '800', marginBottom: 8 }}>RouteFlow</Text>
                      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 6 }}>{trip.name}</Text>
                      {memory.destination_label ? (
                        <Text style={{ color: '#cbd5e1', fontSize: 15, marginBottom: 12 }}>{memory.destination_label}</Text>
                      ) : null}
                      <Text style={{ color: '#94a3b8', fontSize: 13 }}>{tm('cardPlaces', { count: placesDisplayCount })}</Text>
                      <Text style={{ color: '#94a3b8', fontSize: 13 }}>{tm('cardSpent', { amount: spentLabel })}</Text>
                      <Text style={{ color: '#94a3b8', fontSize: 13 }}>{tm('cardMood', { mood: memoryMoodText(memory.mood, tm) })}</Text>
                    </LinearGradient>
                  </ViewShot>
                </View>
                <Pressable
                  onPress={() => setShareSheetOpen(true)}
                  disabled={shareBusy}
                  style={{
                    paddingVertical: 14,
                    borderRadius: 14,
                    backgroundColor: colors.primarySolid,
                    alignItems: 'center',
                    marginBottom: 16,
                    opacity: shareBusy ? 0.7 : 1,
                  }}
                >
                  {shareBusy ? (
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : (
                    <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 16 }}>{tm('shareCard')}</Text>
                  )}
                </Pressable>
              </View>
            </PlanGate>
          </>
        ) : null}

        {isActiveFinish ? (
          <View style={{ paddingHorizontal: 16, marginTop: 24, gap: 10 }}>
            <Pressable
              onPress={onPublish}
              disabled={busy}
              style={{
                paddingVertical: 16,
                borderRadius: 14,
                backgroundColor: colors.primarySolid,
                alignItems: 'center',
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={{ color: colors.onPrimary, fontSize: 17, fontWeight: '700' }}>{tt('finishPublish')}</Text>
              )}
            </Pressable>
            <Pressable onPress={onCompleteOnly} disabled={busy} style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.inactive, fontSize: 15, fontWeight: '600' }}>{tt('finishCompleteOnly')}</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          onPress={() => router.replace('/(tabs)/home')}
          style={{
            marginHorizontal: 16,
            marginTop: 28,
            paddingVertical: 16,
            borderRadius: 14,
            backgroundColor: colors.primarySolid,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.onPrimary, fontSize: 17, fontWeight: '700' }}>{tt('completeBackToTrips')}</Text>
        </Pressable>
      </ScrollView>

      <ShareFormatSheet
        visible={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        onPick={(fmt) => void handleShareFormat(fmt)}
      />

      <View style={{ position: 'absolute', left: -9999 }}>
        <TripShareCard
          ref={tripCardRef}
          destination={memory?.destination_label ?? trip?.name ?? ''}
          days={
            trip?.start_date && trip?.end_date ?
              Math.max(
                1,
                Math.ceil(
                  (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (24 * 60 * 60 * 1000),
                ),
              )
            : 0
          }
          travelers={memory?.travelers_count ?? travelersCount}
          spentLabel={spentLabel}
          placesVisited={placesDisplayCount}
          mood={memoryMoodText(memory?.mood ?? 'good', tm)}
          moodEmoji={
            memory?.mood === 'amazing' ? '😍'
            : memory?.mood === 'great' ? '🤩'
            : memory?.mood === 'good' ? '😊'
            : '🤔'
          }
          labels={{
            wordmark: ts('wordmark'),
            days: ts('daysLabel'),
            travelers: ts('travelersLabel'),
            totalSpent: ts('totalSpent'),
            placesVisited: ts('placesVisited'),
            planYourOwn: ts('planYourOwn'),
            siteDomain: ts('siteDomain'),
          }}
          format={shareFormat}
        />
      </View>
    </View>
  );
}
