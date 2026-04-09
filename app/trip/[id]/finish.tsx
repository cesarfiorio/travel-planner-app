import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { getPlacePhotoSource } from '../../../lib/api/placePhoto';
import { formatErrorMessage } from '../../../lib/formatError';
import { useAuth } from '../../../lib/hooks/useAuth';
import { useFinishTrip, type MemoryMood } from '../../../lib/hooks/useFinishTrip';
import { useItinerary, type ItineraryPlaceVm } from '../../../lib/hooks/useItinerary';
import { usePlaceById } from '../../../lib/hooks/usePlaceDetail';
import { useSubscription } from '../../../lib/hooks/useSubscription';
import { useTripExpenses } from '../../../lib/hooks/useExpenses';
import { useCommunityRouteForTrip, usePublishCompletedTripToCommunity } from '../../../lib/hooks/usePublishTripCommunity';
import {
  tripMemoryQueryKey,
  useAddJournalEntry,
  useDeleteJournalEntry,
  useTripJournal,
  useTripMemoryByTripId,
  useUpdateJournalEntry,
  useUpdateTripMemory,
} from '../../../lib/hooks/useTripMemory';
import { useTrip } from '../../../lib/hooks/useTrips';
import { hasSupabaseEnv, supabase } from '../../../lib/supabase';
import { tripRowToSnapshot, useAppStore } from '../../../lib/store/appStore';
import { firstPhotoReference } from '../../../lib/places/firstPhotoRef';
import { uploadMemoryCover } from '../../../lib/storage/uploadMemoryCover';
import { itinerarySnapshotFromPlaces } from '../../../lib/trips/memoryItinerary';
import { favoriteSpotInfo, mostActiveDayInfo, tripDurationDaysFromStrings } from '../../../lib/trips/completeTripInsights';
import { coverGradientFromDestination, parseLocalDate, primaryTripEntryPath } from '../../../lib/trips/tripUi';
import type { PlacePin } from '../../../lib/utils/routeGeoJson';
import { formatCurrency } from '../../../lib/utils/formatCurrency';
import { captureAndShare, type ShareFormat } from '../../../lib/utils/shareCard';

import * as Localization from 'expo-localization';

const MOODS: MemoryMood[] = ['amazing', 'great', 'good', 'mixed'];

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

function formatTripDateRange(start: string | null, end: string | null, locale: string, fallback: string): string {
  const a = parseLocalDate(start);
  const b = parseLocalDate(end);
  if (!a || !b) {
    return fallback;
  }
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${a.toLocaleDateString(locale, opts)} – ${b.toLocaleDateString(locale, opts)}`;
}

function formatYmdDisplay(ymd: string | null, locale: string): string {
  const d = parseLocalDate(ymd);
  if (!d) {
    return '—';
  }
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
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
  const { user, session } = useAuth();
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
  const [coverPlaceId, setCoverPlaceId] = useState<string | null>(null);
  const [coverLocalUri, setCoverLocalUri] = useState<string | null>(null);
  const [memoryCoverLocalUri, setMemoryCoverLocalUri] = useState<string | null>(null);
  const [coverUploadBusy, setCoverUploadBusy] = useState(false);

  const [publishTip, setPublishTip] = useState('');
  const [publishTags, setPublishTags] = useState<string[]>([]);
  const [publishTravelStyle, setPublishTravelStyle] = useState<TravelStyleId | null>('group');

  const shotRef = useRef<ViewShot | null>(null);
  const tripCardRef = useRef<TripShareCardHandle>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareFormat, setShareFormat] = useState<'story' | 'square'>('story');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    memoryEnsureAttempted.current = false;
  }, [tripId]);

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
  const isActiveFinish = trip?.status === 'active';

  const visitedPlaces = useMemo(
    () => itineraryPlaces.filter((r: ItineraryPlaceVm) => r.status === 'visited'),
    [itineraryPlaces],
  );
  const placesForCount = visitedPlaces.length > 0 ? visitedPlaces : itineraryPlaces;
  const placesVisited = visitedPlaces.length > 0 ? visitedPlaces.length : itineraryPlaces.length;
  const placeIds = useMemo(() => itineraryPlaces.map((r) => r.placeId), [itineraryPlaces]);

  const placesDisplayCount = useMemo(() => {
    if (itineraryPlaces.length > 0) {
      return itineraryPlaces.length;
    }
    return memory?.places_visited ?? 0;
  }, [itineraryPlaces, memory?.places_visited]);

  const communityRoutePins = useMemo((): PlacePin[] => {
    const ids = [...new Set(itineraryPlaces.map((p) => p.placeId))];
    const rowByPlace = new Map<string, ItineraryPlaceVm>();
    for (const p of itineraryPlaces) {
      if (!rowByPlace.has(p.placeId)) {
        rowByPlace.set(p.placeId, p);
      }
    }
    return ids.map((id) => {
      const p = rowByPlace.get(id)!;
      return {
        id: p.placeId,
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
      };
    });
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

  const heroDateRange = useMemo(
    () => formatTripDateRange(trip?.start_date ?? null, trip?.end_date ?? null, locale, tt('finishDatesUnknown')),
    [trip?.start_date, trip?.end_date, locale, tt],
  );

  const heroTitle = useMemo(
    () => trip?.destination_label?.trim() || trip?.name || '',
    [trip?.destination_label, trip?.name],
  );

  const mostActive = useMemo(
    () => mostActiveDayInfo(itineraryPlaces, trip?.start_date ?? null, locale),
    [itineraryPlaces, trip?.start_date, locale],
  );
  const favoriteSpot = useMemo(() => favoriteSpotInfo(itineraryPlaces), [itineraryPlaces]);
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

  const { data: coverPlace } = usePlaceById(memory?.cover_place_id ?? undefined);
  const { data: journal = [] } = useTripJournal(memory?.id);
  const addJ = useAddJournalEntry();
  const updJ = useUpdateJournalEntry();
  const delJ = useDeleteJournalEntry();

  const coverRef = memory?.cover_place_id ? firstPhotoReference(coverPlace?.photos) : undefined;
  const memoryCoverRemote =
    memory?.cover_photo_url?.trim() ?
      { uri: memory.cover_photo_url.trim() }
    : getPlacePhotoSource(coverRef, session?.access_token ?? null);

  const activeHeroExtra = useMemo(() => {
    if (!coverPlaceId) {
      return null;
    }
    const row = itineraryPlaces.find((p) => p.placeId === coverPlaceId);
    const ref = row ? firstPhotoReference(row.photos) : undefined;
    return getPlacePhotoSource(ref, session?.access_token ?? null);
  }, [coverPlaceId, itineraryPlaces, session?.access_token]);

  const heroImageSource = useMemo(() => {
    if (isActiveFinish) {
      if (coverLocalUri) {
        return { uri: coverLocalUri };
      }
      if (activeHeroExtra) {
        return activeHeroExtra;
      }
      return null;
    }
    if (memoryCoverLocalUri) {
      return { uri: memoryCoverLocalUri };
    }
    return memoryCoverRemote;
  }, [isActiveFinish, coverLocalUri, activeHeroExtra, memoryCoverLocalUri, memoryCoverRemote]);

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

  const pickImageActive = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!res.canceled && res.assets[0]?.uri) {
      setCoverLocalUri(res.assets[0].uri);
      setCoverPlaceId(null);
    }
  };

  const pickMemoryCoverPhoto = useCallback(async () => {
    if (!memory || !tripId || !userId) {
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (res.canceled || !res.assets[0]?.uri) {
      return;
    }
    const uri = res.assets[0].uri;
    setMemoryCoverLocalUri(uri);
    setCoverUploadBusy(true);
    try {
      const url = await uploadMemoryCover(uri, userId);
      if (!url) {
        throw new Error('upload');
      }
      updateTripMemoryPlaces.mutate(
        {
          memoryId: memory.id,
          tripId,
          cover_photo_url: url,
          cover_place_id: null,
        },
        {
          onSuccess: () => setMemoryCoverLocalUri(null),
          onError: (e) => {
            setMemoryCoverLocalUri(null);
            Alert.alert(tm('errorTitle'), formatErrorMessage(e, tm('errorSave')));
          },
          onSettled: () => setCoverUploadBusy(false),
        },
      );
    } catch (e) {
      setMemoryCoverLocalUri(null);
      setCoverUploadBusy(false);
      Alert.alert(tm('errorTitle'), formatErrorMessage(e, tt('communityCoverUploadError')));
    }
  }, [memory, tripId, userId, updateTripMemoryPlaces, tm, tt]);

  const clearMemoryCoverPhoto = useCallback(() => {
    if (!memory || !tripId) {
      return;
    }
    setMemoryCoverLocalUri(null);
    updateTripMemoryPlaces.mutate(
      {
        memoryId: memory.id,
        tripId,
        cover_photo_url: null,
      },
      {
        onError: (e) => Alert.alert(tm('errorTitle'), formatErrorMessage(e, tm('errorSave'))),
      },
    );
  }, [memory, tripId, updateTripMemoryPlaces, tm]);

  const onPublishToCommunity = useCallback(() => {
    if (!trip || !memory || !tripId) {
      return;
    }
    const placeIdsUniq = [...new Set(itineraryPlaces.map((p) => p.placeId))];
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
        coverPhotoUrl: memory.cover_photo_url,
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
    coverPlaceId: coverLocalUri ? null : coverPlaceId,
    coverLocalUri,
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

  const openAdd = () => {
    setEditId(null);
    setDraft('');
    setModalOpen(true);
  };

  const openEdit = (id: string, content: string) => {
    setEditId(id);
    setDraft(content);
    setModalOpen(true);
  };

  const saveJournal = () => {
    if (!memory || !draft.trim()) {
      return;
    }
    if (editId) {
      updJ.mutate(
        { id: editId, memoryId: memory.id, content: draft },
        {
          onSuccess: () => setModalOpen(false),
          onError: (e) => Alert.alert(tm('errorTitle'), formatErrorMessage(e, tm('errorSave'))),
        },
      );
    } else {
      addJ.mutate(
        { memoryId: memory.id, content: draft },
        {
          onSuccess: () => setModalOpen(false),
          onError: (e) => Alert.alert(tm('errorTitle'), formatErrorMessage(e, tm('errorSave'))),
        },
      );
    }
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

  const tipCards: { title: string; body: string }[] = [];
  if (isCompleted && memory) {
    const commTip = publishTip.trim() || communityRoute?.tip?.trim() || '';
    if (commTip) {
      tipCards.push({ title: tc('bestTip'), body: commTip });
    }
    for (const j of journal) {
      if (tipCards.length >= 3) {
        break;
      }
      const body = j.content?.trim();
      if (body) {
        tipCards.push({ title: tm('journalTitle'), body });
      }
    }
    while (tipCards.length < 3) {
      tipCards.push({
        title: tt('completeTipsTitle'),
        body: tt('completeTipPlaceholder'),
      });
    }
  }

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
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, textAlign: 'center', marginTop: 6 }}>{heroDateRange}</Text>
          </LinearGradient>
        </View>

        {isOwner ? (
          <View
            style={{
              marginTop: -28,
              marginHorizontal: 16,
              backgroundColor: cardBg,
              borderRadius: 16,
              padding: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="camera" size={20} color={colors.primarySolid} style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{tt('completeCoverTitle')}</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.inactive, marginBottom: 12 }}>{tt('completeCoverHint')}</Text>
            <Pressable
              onPress={() => void (isActiveFinish ? pickImageActive() : pickMemoryCoverPhoto())}
              disabled={!isActiveFinish && coverUploadBusy}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderStyle: 'dashed',
                borderRadius: 12,
                paddingVertical: 28,
                alignItems: 'center',
                backgroundColor: '#FAFAFA',
              }}
            >
              {isCompleted && coverUploadBusy ? (
                <ActivityIndicator color={colors.primarySolid} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={32} color={colors.inactive} />
                  <Text style={{ marginTop: 8, fontWeight: '700', color: colors.text }}>{tt('completeCoverTap')}</Text>
                  <Text style={{ marginTop: 4, fontSize: 12, color: colors.inactive }}>{tt('completeCoverFormats')}</Text>
                </>
              )}
            </Pressable>
            {isActiveFinish && (coverLocalUri ? (
              <Image source={{ uri: coverLocalUri }} style={{ width: '100%', height: 140, borderRadius: 12, marginTop: 12 }} contentFit="cover" />
            ) : null)}
            {isCompleted && memory?.cover_photo_url?.trim() ? (
              <Pressable onPress={clearMemoryCoverPhoto} style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>{tt('communityCoverRemove')}</Text>
              </Pressable>
            ) : null}

            {isActiveFinish ? (
              <>
                <Text style={{ fontSize: 13, color: colors.inactive, marginTop: 14, marginBottom: 8 }}>{tt('completeOrPickPlace')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {placesForCount.map((p: ItineraryPlaceVm) => {
                    const ref = firstPhotoReference(p.photos);
                    const src = getPlacePhotoSource(ref, session?.access_token ?? null);
                    const selected = coverPlaceId === p.placeId;
                    return (
                      <Pressable
                        key={p.placeId}
                        onPress={() => {
                          setCoverPlaceId(p.placeId);
                          setCoverLocalUri(null);
                        }}
                        style={{ marginRight: 10, width: 88 }}
                      >
                        <View
                          style={{
                            borderRadius: 12,
                            overflow: 'hidden',
                            borderWidth: 2,
                            borderColor: selected ? colors.primarySolid : 'transparent',
                          }}
                        >
                          {src ? (
                            <Image source={src} style={{ width: 88, height: 64 }} contentFit="cover" />
                          ) : (
                            <View style={{ width: 88, height: 64, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }}>
                              <Ionicons name="image-outline" size={22} color={colors.inactive} />
                            </View>
                          )}
                        </View>
                        <Text numberOfLines={2} style={{ fontSize: 11, marginTop: 4, color: colors.text }}>
                          {p.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}
          </View>
        ) : null}

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

        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 8 }}>{tt('completeDatesTitle')}</Text>
          <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.inactive, marginBottom: 4 }}>{tt('completeDateStart')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, backgroundColor: '#F9FAFB' }}>
                <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{formatYmdDisplay(trip.start_date, locale)}</Text>
                <Ionicons name="calendar-outline" size={18} color={colors.inactive} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.inactive, marginBottom: 4 }}>{tt('completeDateEnd')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, backgroundColor: '#F9FAFB' }}>
                <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{formatYmdDisplay(trip.end_date, locale)}</Text>
                <Ionicons name="calendar-outline" size={18} color={colors.inactive} />
              </View>
            </View>
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
            <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="location-outline" size={22} color={colors.primarySolid} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: colors.inactive }}>{tt('completeInsightFavorite')}</Text>
                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{favoriteSpot?.name ?? '—'}</Text>
                {favoriteSpot ? (
                  <Text style={{ fontSize: 12, color: colors.inactive, marginTop: 2 }}>
                    {tt('completeInsightVisitedCount', { count: favoriteSpot.visits })}
                  </Text>
                ) : null}
              </View>
            </View>
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

        {isCompleted ? (
          <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name="bulb-outline" size={22} color={colors.primarySolid} style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{tt('completeTipsTitle')}</Text>
            </View>
            {tipCards.slice(0, 3).map((card, i) => (
              <View
                key={`${card.title}-${i}`}
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 10,
                  borderLeftWidth: 3,
                  borderLeftColor: colors.primarySolid,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 6 }}>{card.title}</Text>
                <Text style={{ fontSize: 14, color: colors.inactive, lineHeight: 20 }}>{card.body}</Text>
              </View>
            ))}
          </View>
        ) : null}

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
                  onChangeText={(x) => setTip(x.slice(0, 280))}
                  multiline
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
                <Text style={{ fontSize: 12, color: colors.inactive, marginBottom: 14 }}>{tip.length}/280</Text>

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
              onChangeText={(x) => setPublishTip(x.slice(0, 280))}
              multiline
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
            <Text style={{ fontSize: 12, color: colors.inactive, marginBottom: 14 }}>{publishTip.length}/280</Text>

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

                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 10 }}>{tm('journalTitle')}</Text>
                <Pressable
                  onPress={openAdd}
                  style={{
                    alignSelf: 'flex-start',
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    backgroundColor: '#E0E7FF',
                    borderRadius: 12,
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ fontWeight: '700', color: '#3730A3' }}>{tm('addEntry')}</Text>
                </Pressable>

                {journal.map((row) => (
                  <View
                    key={row.id}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: cardBg,
                      borderWidth: 1,
                      borderColor: colors.border,
                      marginBottom: 10,
                    }}
                  >
                    <Text style={{ fontSize: 15, color: colors.text, lineHeight: 22 }}>{row.content}</Text>
                    {row.user_id === userId ? (
                      <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                        <Pressable onPress={() => openEdit(row.id, row.content)}>
                          <Text style={{ color: colors.primarySolid, fontWeight: '700' }}>{tm('edit')}</Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            delJ.mutate(
                              { id: row.id, memoryId: memory.id },
                              {
                                onError: (e) => Alert.alert(tm('errorTitle'), formatErrorMessage(e, tm('errorSave'))),
                              },
                            )
                          }
                        >
                          <Text style={{ color: '#DC2626', fontWeight: '700' }}>{tm('delete')}</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ))}
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

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }} onPress={() => setModalOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', marginBottom: 12 }}>{editId ? tm('editEntry') : tm('newEntry')}</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              placeholder={tm('entryPlaceholder')}
              style={{
                minHeight: 100,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 12,
                fontSize: 16,
                color: colors.text,
                textAlignVertical: 'top',
                marginBottom: 16,
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <Pressable onPress={() => setModalOpen(false)}>
                <Text style={{ color: colors.inactive, fontWeight: '700' }}>{tm('cancel')}</Text>
              </Pressable>
              <Pressable onPress={saveJournal}>
                <Text style={{ color: colors.primarySolid, fontWeight: '800' }}>{tm('save')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
