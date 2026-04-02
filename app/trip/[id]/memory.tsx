import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
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
import { getPlacePhotoSource } from '../../../lib/api/placePhoto';
import { formatErrorMessage } from '../../../lib/formatError';
import { useAuth } from '../../../lib/hooks/useAuth';
import { usePlaceById } from '../../../lib/hooks/usePlaceDetail';
import {
  useAddJournalEntry,
  useDeleteJournalEntry,
  useTripJournal,
  useTripMemoryByTripId,
  useUpdateJournalEntry,
} from '../../../lib/hooks/useTripMemory';
import { useTripExpenses } from '../../../lib/hooks/useExpenses';
import { useTrip } from '../../../lib/hooks/useTrips';
import { firstPhotoReference } from '../../../lib/places/firstPhotoRef';
import { formatCurrency } from '../../../lib/utils/formatCurrency';
import { captureAndShare, type ShareFormat } from '../../../lib/utils/shareCard';

import * as Localization from 'expo-localization';

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

export default function TripMemoryScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const tripId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t: tm } = useTranslation('memory');
  const { t: tt } = useTranslation('trips');
  const { t: ts } = useTranslation('share');
  const { user, session } = useAuth();
  const userId = user?.id ?? '';
  const locale = Localization.getLocales()[0]?.languageTag ?? 'en-US';
  const { data: trip, isLoading: tripLoading } = useTrip(tripId);
  const { data: expenses = [] } = useTripExpenses(tripId);
  const { data: memory, isLoading: memLoading } = useTripMemoryByTripId(tripId);
  const { data: journal = [] } = useTripJournal(memory?.id);
  const { data: coverPlace } = usePlaceById(memory?.cover_place_id ?? undefined);

  const addJ = useAddJournalEntry();
  const updJ = useUpdateJournalEntry();
  const delJ = useDeleteJournalEntry();

  const shotRef = useRef<ViewShot | null>(null);
  const tripCardRef = useRef<TripShareCardHandle>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareFormat, setShareFormat] = useState<'story' | 'square'>('story');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const publicUrl = memory ? `https://routeflow.app/trip/${memory.share_token}` : '';

  const coverRef = memory?.cover_place_id ? firstPhotoReference(coverPlace?.photos) : undefined;
  const coverSrc =
    memory?.cover_photo_url?.trim() ?
      { uri: memory.cover_photo_url.trim() }
    : getPlacePhotoSource(coverRef, session?.access_token ?? null);

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

  const captureShare = async () => {
    setShareBusy(true);
    try {
      const uri = await shotRef.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png' });
      }
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

  if (tripLoading || memLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primarySolid} size="large" />
      </View>
    );
  }

  if (!trip || !memory) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 20, backgroundColor: colors.background }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ marginTop: 20, color: colors.inactive }}>{tm('notFound')}</Text>
      </View>
    );
  }

  const tripCurrency = expenses[0]?.currency ?? 'EUR';
  const spentLabel = formatCurrency(memory.total_spent_cents, tripCurrency, locale);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={tt('detailBackA11y')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, marginLeft: 12, fontSize: 20, fontWeight: '700', color: colors.text }} numberOfLines={1}>
          {tm('screenTitle')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {coverSrc ? (
          <Image source={coverSrc} style={{ width: '100%', height: 200 }} contentFit="cover" />
        ) : (
          <LinearGradient colors={['#FF6B35', '#F7931E']} style={{ width: '100%', height: 160, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>{trip.name}</Text>
          </LinearGradient>
        )}

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 8 }}>{trip.name}</Text>
          <Text style={{ fontSize: 15, color: colors.inactive, marginBottom: 16 }}>
            {memoryMoodText(memory.mood, tm)}
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <View style={{ padding: 12, borderRadius: 12, backgroundColor: '#F3F4F6', minWidth: '45%', flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.inactive }}>{tm('statPlaces')}</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{memory.places_visited}</Text>
            </View>
            <View style={{ padding: 12, borderRadius: 12, backgroundColor: '#F3F4F6', minWidth: '45%', flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.inactive }}>{tm('statSpent')}</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{spentLabel}</Text>
            </View>
            <View style={{ padding: 12, borderRadius: 12, backgroundColor: '#F3F4F6', minWidth: '45%', flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.inactive }}>{tm('statTravelers')}</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{memory.travelers_count}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 6 }}>{tm('publicLink')}</Text>
          <Pressable onPress={copyLink} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: colors.primarySolid, textDecorationLine: 'underline' }} numberOfLines={2}>
              {publicUrl}
            </Text>
            <Text style={{ fontSize: 13, color: colors.inactive, marginTop: 4 }}>{tm('tapToCopy')}</Text>
          </Pressable>

          <PlanGate
            requires="explorer"
            feature="shareJournal"
            fallback={<LockedBanner message={tm('upgradeShareJournal')} featureId="shareJournal" />}
          >
            <>
            <View style={{ marginBottom: 8 }}>
              <ViewShot ref={shotRef} options={{ format: 'png', quality: 0.95 }} style={{ borderRadius: 16, overflow: 'hidden' }}>
                <LinearGradient colors={['#1e293b', '#334155']} style={{ padding: 24, minHeight: 220 }}>
                  <Text style={{ color: '#f97316', fontSize: 14, fontWeight: '800', marginBottom: 8 }}>RouteFlow</Text>
                  <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', marginBottom: 6 }}>{trip.name}</Text>
                  {memory.destination_label ? (
                    <Text style={{ color: '#cbd5e1', fontSize: 16, marginBottom: 16 }}>{memory.destination_label}</Text>
                  ) : null}
                  <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>
                    {tm('cardPlaces', { count: memory.places_visited })}
                  </Text>
                  <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>
                    {tm('cardSpent', { amount: spentLabel })}
                  </Text>
                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                    {tm('cardMood', { mood: memoryMoodText(memory.mood, tm) })}
                  </Text>
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
                marginBottom: 24,
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
                  backgroundColor: '#F9FAFB',
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
                            onError: (e) =>
                              Alert.alert(tm('errorTitle'), formatErrorMessage(e, tm('errorSave'))),
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
            </>
          </PlanGate>
        </View>
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
            trip?.start_date && trip?.end_date
              ? Math.max(
                  1,
                  Math.ceil(
                    (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) /
                      (24 * 60 * 60 * 1000),
                  ),
                )
              : 0
          }
          travelers={memory?.travelers_count ?? 1}
          spentLabel={spentLabel}
          placesVisited={memory?.places_visited ?? 0}
          mood={memoryMoodText(memory?.mood ?? 'good', tm)}
          moodEmoji={memory?.mood === 'amazing' ? '😍' : memory?.mood === 'great' ? '🤩' : memory?.mood === 'good' ? '😊' : '🤔'}
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
