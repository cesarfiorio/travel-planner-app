import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LockedBanner } from '../../../components/LockedBanner';
import { PlanGate } from '../../../components/PlanGate';
import { colors } from '../../../constants/colors';
import { getPlacePhotoSource } from '../../../lib/api/placePhoto';
import { COMMUNITY_TAG_IDS, TRAVEL_STYLE_IDS, type TravelStyleId } from '../../../lib/community/constants';
import { formatErrorMessage } from '../../../lib/formatError';
import { useAuth } from '../../../lib/hooks/useAuth';
import { useFinishTrip, type MemoryMood } from '../../../lib/hooks/useFinishTrip';
import { useItinerary, type ItineraryPlaceVm } from '../../../lib/hooks/useItinerary';
import { useSubscription } from '../../../lib/hooks/useSubscription';
import { useTripExpenses } from '../../../lib/hooks/useExpenses';
import { useTrip } from '../../../lib/hooks/useTrips';
import { firstPhotoReference } from '../../../lib/places/firstPhotoRef';
import { formatCurrency } from '../../../lib/utils/formatCurrency';

import * as Localization from 'expo-localization';

const MOODS: MemoryMood[] = ['amazing', 'great', 'good', 'mixed'];

export default function FinishTripScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const tripId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t: tt } = useTranslation('trips');
  const { t: tm } = useTranslation('memory');
  const { t: tc } = useTranslation('community');
  const { user, session } = useAuth();
  const userId = user?.id ?? '';
  const locale = Localization.getLocales()[0]?.languageTag ?? 'en-US';
  const { data: trip, isLoading } = useTrip(tripId);
  const { sections } = useItinerary(tripId);
  const itinerary = useMemo(() => sections.flatMap((s) => s.data), [sections]);
  const { data: expenses = [] } = useTripExpenses(tripId);
  const finishMut = useFinishTrip();
  const { isExplorer: explorer } = useSubscription();

  const [shareOn, setShareOn] = useState(true);
  const [tip, setTip] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [travelStyle, setTravelStyle] = useState<TravelStyleId | null>('group');
  const [memoryOn, setMemoryOn] = useState(true);
  const [mood, setMood] = useState<MemoryMood>('great');
  const [coverPlaceId, setCoverPlaceId] = useState<string | null>(null);
  const [coverLocalUri, setCoverLocalUri] = useState<string | null>(null);

  const isOwner = useMemo(() => {
    return Boolean(trip?.trip_members.some((m) => m.user_id === userId && m.role === 'owner'));
  }, [trip, userId]);

  const visitedPlaces = useMemo(() => itinerary.filter((r: ItineraryPlaceVm) => r.status === 'visited'), [itinerary]);
  const placesForCount = visitedPlaces.length > 0 ? visitedPlaces : itinerary;
  const placesVisited = visitedPlaces.length > 0 ? visitedPlaces.length : itinerary.length;
  const placeIds = useMemo(() => itinerary.map((r) => r.placeId), [itinerary]);

  const totalSpentCents = useMemo(() => expenses.reduce((a, e) => a + e.amount_cents, 0), [expenses]);
  const currency = expenses[0]?.currency ?? 'EUR';
  const travelersCount = useMemo(() => {
    if (!trip) {
      return 0;
    }
    const ids = new Set<string>();
    ids.add(trip.created_by);
    for (const m of trip.trip_members ?? []) {
      ids.add(m.user_id);
    }
    return ids.size;
  }, [trip]);

  const summaryLine = useMemo(() => {
    if (!trip) {
      return '';
    }
    const dest = trip.destination_label?.trim() || trip.name;
    const dates =
      trip.start_date && trip.end_date ? `${trip.start_date} → ${trip.end_date}` : tt('finishDatesUnknown');
    return tt('finishSummaryLine', {
      destination: dest,
      dates,
      places: placesVisited,
      spent: formatCurrency(totalSpentCents, currency, locale),
      travelers: travelersCount,
    });
  }, [trip, placesVisited, totalSpentCents, currency, locale, tt]);

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

  const pickImage = async () => {
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
        router.replace(`/trip/${tripId}`);
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
        onSuccess: () => router.replace(`/trip/${tripId}`),
        onError: (e) => Alert.alert(tt('finishErrorTitle'), formatErrorMessage(e, tt('errorUpdateFailed'))),
      },
    );
  };

  if (isLoading || !trip) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primarySolid} size="large" />
      </View>
    );
  }

  if (!isOwner || trip.status !== 'active') {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 20, backgroundColor: colors.background }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ marginTop: 20, color: colors.inactive }}>{tt('finishNotAllowed')}</Text>
      </View>
    );
  }

  const busy = finishMut.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={tt('detailBackA11y')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, marginLeft: 12, fontSize: 20, fontWeight: '700', color: colors.text }} numberOfLines={1}>
          {tt('finishTrip')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: 20 }}>{summaryLine}</Text>

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
                minHeight: 100,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 12,
                fontSize: 16,
                color: colors.text,
                textAlignVertical: 'top',
                marginBottom: 8,
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
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

        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 10 }}>{tm('sectionTitle')}</Text>
        <PlanGate
          requires="explorer"
          feature="finishMemory"
          fallback={<LockedBanner message={tm('lockedMessage')} featureId="finishMemory" />}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ flex: 1, fontSize: 15, color: colors.text, marginRight: 12 }}>{tm('createToggle')}</Text>
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
                    <Text style={{ fontWeight: '700' }}>
                      {(tm as (k: string) => string)(`mood_${m}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 8 }}>{tm('coverLabel')}</Text>
              <Pressable
                onPress={pickImage}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  backgroundColor: '#F3F4F6',
                  marginBottom: 12,
                  alignSelf: 'flex-start',
                }}
              >
                <Text style={{ fontWeight: '700', color: colors.primarySolid }}>{tm('uploadPhoto')}</Text>
              </Pressable>
              {coverLocalUri ? (
                <Image source={{ uri: coverLocalUri }} style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 12 }} />
              ) : null}

              <Text style={{ fontSize: 13, color: colors.inactive, marginBottom: 8 }}>{tm('orPickPlace')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
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
                      style={{ marginRight: 10, width: 100 }}
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
                          <Image source={src} style={{ width: 100, height: 72 }} />
                        ) : (
                          <View style={{ width: 100, height: 72, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="image-outline" size={24} color={colors.inactive} />
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
        </PlanGate>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: Math.max(12, insets.bottom + 8),
          gap: 10,
        }}
      >
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
        <Pressable
          onPress={onCompleteOnly}
          disabled={busy}
          style={{ paddingVertical: 14, alignItems: 'center' }}
        >
          <Text style={{ color: colors.inactive, fontSize: 15, fontWeight: '600' }}>{tt('finishCompleteOnly')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
