import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Localization from 'expo-localization';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import type ViewShot from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RouteShareCard, type RouteShareCardHandle } from '../../../components/share';
import { colors } from '../../../constants/colors';
import { formatErrorMessage } from '../../../lib/formatError';
import { useAuth } from '../../../lib/hooks/useAuth';
import { useAdoptCommunityRoute } from '../../../lib/hooks/useAdoptCommunityRoute';
import {
  useCommunityRoute,
  useCommunitySourceItinerary,
  useToggleRouteLike,
} from '../../../lib/hooks/useCommunityRoutes';
import { useDestinationCoverPhoto } from '../../../lib/hooks/useDestinationCoverPhoto';
import { FREE_OWNER_TRIP_LIMIT, useSubscription } from '../../../lib/hooks/useSubscription';
import { useMyTrips } from '../../../lib/hooks/useTrips';
import { hasSupabaseEnv, supabase } from '../../../lib/supabase';
import { tripRowToSnapshot, useAppStore } from '../../../lib/store/appStore';
import { parseRoutePins, splitPinsAcrossDays } from '../../../lib/utils/routeGeoJson';
import { captureAndShare } from '../../../lib/utils/shareCard';

const SCREEN_BG = '#F3F4F6';
const ORANGE = '#F05A1A';
const HERO_H = 280;
const CARD_RADIUS = 16;

function travelStyleIconName(style: string | null): keyof typeof Ionicons.glyphMap {
  switch (style) {
    case 'solo':
      return 'person-outline';
    case 'couple':
      return 'heart-outline';
    case 'family':
      return 'people-outline';
    case 'group':
      return 'people-outline';
    case 'backpacker':
      return 'walk-outline';
    default:
      return 'globe-outline';
  }
}

function tipBullets(tip: string | null | undefined, max = 10): string[] {
  if (!tip?.trim()) {
    return [];
  }
  const t = tip.trim();
  const lines = t
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length > 1) {
    return lines.slice(0, max);
  }
  const sentences = t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length > 1) {
    return sentences.slice(0, max);
  }
  return [t];
}

function slotTimeLabel(slotIndex: number, locale: string): string {
  const h = Math.min(9 + slotIndex * 2, 20);
  const d = new Date(2000, 0, 1, h, 0, 0, 0);
  return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}

function StatMiniCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: '28%',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: '#FFF7ED',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        }}
      >
        <Ionicons name={icon} size={18} color={ORANGE} />
      </View>
      <Text style={{ fontSize: 11, color: colors.inactive, marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export default function CommunityRouteDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const routeId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locale = Localization.getLocales()[0]?.languageTag ?? 'en-US';
  const { t } = useTranslation(['community', 'share', 'trips', 'common', 'memory']);
  const { data: route, isPending, isError } = useCommunityRoute(routeId);
  const { data: trips = [] } = useMyTrips();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { isExplorer } = useSubscription();
  const setActiveTrip = useAppStore((s) => s.setActiveTrip);
  const adoptRoute = useAdoptCommunityRoute();

  const destForCover = route?.destination?.trim() || route?.title?.trim() || '';
  const { data: freeCoverUrl, isFetching: freeCoverLoading } = useDestinationCoverPhoto(
    destForCover,
    Boolean(route) && destForCover.length >= 2,
  );
  const toggleLike = useToggleRouteLike();
  const routeCardRef = useRef<RouteShareCardHandle>(null);
  const [sharing, setSharing] = useState(false);

  const pins = useMemo(() => (route ? parseRoutePins(route.route_geojson) : []), [route?.route_geojson]);
  const itineraryDays = useMemo(() => {
    if (!route || pins.length === 0) {
      return [];
    }
    const days = Math.max(
      1,
      route.duration_days ??
        Math.min(7, Math.max(1, Math.ceil(pins.length / 2))),
    );
    return splitPinsAcrossDays(pins, days);
  }, [route, pins]);

  const tripIdForItinerary = route?.trip_id?.trim() || null;
  const { data: sourceDays = [], isPending: sourceItineraryPending } = useCommunitySourceItinerary(
    tripIdForItinerary || undefined,
  );

  const displayItinerary = useMemo(() => {
    if (tripIdForItinerary) {
      if (sourceItineraryPending) {
        return { kind: 'loading' as const };
      }
      if (sourceDays.length > 0) {
        return { kind: 'source' as const, days: sourceDays };
      }
    }
    if (itineraryDays.length > 0) {
      return { kind: 'geo' as const, days: itineraryDays };
    }
    return { kind: 'empty' as const };
  }, [tripIdForItinerary, sourceItineraryPending, sourceDays, itineraryDays]);

  const { data: placeRows = [] } = useQuery({
    queryKey: ['communityRoutePlaces', route?.id ?? '', pins.map((p) => p.id).join(',')],
    enabled: Boolean(route?.id && pins.length > 0 && supabase && hasSupabaseEnv),
    queryFn: async () => {
      const ids = pins.map((p) => p.id);
      const { data, error } = await supabase!
        .from('places')
        .select('id, name, rating, formatted_address, category')
        .in('id', ids);
      if (error) {
        throw error;
      }
      return data ?? [];
    },
  });

  const placeById = useMemo(() => new Map(placeRows.map((r) => [r.id, r])), [placeRows]);

  const bestSpotName = useMemo(() => {
    if (sourceDays.length > 0) {
      let best: { rating: number; name: string } | null = null;
      for (const d of sourceDays) {
        for (const s of d.stops) {
          const r = s.rating != null ? Number(s.rating) : NaN;
          if (!Number.isFinite(r)) {
            continue;
          }
          if (!best || r > best.rating) {
            best = { rating: r, name: s.name };
          }
        }
      }
      if (best) {
        return best.name;
      }
      const flat = sourceDays.flatMap((d) => d.stops);
      return flat[Math.floor(flat.length / 2)]?.name ?? null;
    }
    if (pins.length === 0) {
      return null;
    }
    let bestPin: { id: string; rating: number } | null = null;
    for (const pin of pins) {
      const row = placeById.get(pin.id);
      const r = row?.rating != null ? Number(row.rating) : NaN;
      if (!Number.isFinite(r)) {
        continue;
      }
      if (!bestPin || r > bestPin.rating) {
        bestPin = { id: pin.id, rating: r };
      }
    }
    if (bestPin) {
      return placeById.get(bestPin.id)?.name ?? pins.find((p) => p.id === bestPin!.id)?.name ?? null;
    }
    const mid = pins[Math.floor(pins.length / 2)];
    return mid?.name ?? null;
  }, [sourceDays, pins, placeById]);

  const tagLabel = (tag: string) => {
    const key = `tag_${tag}`;
    const label = (t as (k: string) => string)(`community:${key}`);
    if (label === `community:${key}` || label === key || label.startsWith('tag_')) {
      return tag.charAt(0).toUpperCase() + tag.slice(1);
    }
    return label;
  };

  const ownedTripCount = useMemo(() => trips.filter((tr) => tr.created_by === userId).length, [trips, userId]);

  const runAdopt = () => {
    if (!route) {
      return;
    }
    const existingId = route.adoptedTripId?.trim();
    if (existingId) {
      const row = trips.find((x) => x.id === existingId);
      if (row) {
        setActiveTrip(tripRowToSnapshot(row));
      }
      router.push(`/trip/${existingId}/edit?fromCommunityRoute=1`);
      return;
    }

    if (!isExplorer && ownedTripCount >= FREE_OWNER_TRIP_LIMIT) {
      Alert.alert(t('trips:tripLimitTitle'), t('trips:tripLimitMessage'), [
        { text: t('common:cancel'), style: 'cancel' },
        { text: t('trips:tripLimitUpgrade'), onPress: () => router.push('/(stack)/paywall') },
      ]);
      return;
    }

    adoptRoute.mutate(
      {
        routeId: route.id,
        title: route.title,
        destination: route.destination,
        durationDays: route.duration_days,
        routeGeoJson: route.route_geojson,
        sourceTripId: route.trip_id?.trim() || null,
      },
      {
        onSuccess: (tripId) => {
          router.push(`/trip/${tripId}/edit?fromCommunityRoute=1`);
        },
        onError: (e) =>
          Alert.alert(t('community:errorTitle'), formatErrorMessage(e, t('community:routeAdoptError'))),
      },
    );
  };

  if (isPending) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: SCREEN_BG }}>
        <ActivityIndicator color={ORANGE} size="large" />
      </View>
    );
  }

  if (isError || !route) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 20, backgroundColor: SCREEN_BG }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('community:backA11y')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ marginTop: 24, color: colors.inactive }}>{t('community:notFound')}</Text>
      </View>
    );
  }

  const names = pins.map((p) => p.name);
  const title = route.title?.trim() || route.destination?.trim() || 'Trip';
  const dest = route.destination?.trim() ?? '';
  const durationLabel =
    route.duration_days != null
      ? t('community:durationDays', { count: route.duration_days })
      : t('community:durationUnknown');
  const styleKey = route.travel_style ?? '';
  const styleLabel =
    styleKey === 'group'
      ? t('community:styleFriends')
      : styleKey
        ? (t as (k: string) => string)(`community:style_${styleKey}`)
        : '';
  const tags = (route.tags ?? []).slice(0, 6);
  const coverUri = freeCoverUrl || route.cover_photo_url?.trim() || null;
  const hotelNames = route.hotel_names?.trim() || '';
  const accommodationRating = route.accommodation_rating ?? null;
  const initial = route.creatorName?.trim()?.charAt(0)?.toUpperCase() || '?';
  const creatorSubtitle = route.creatorBio?.trim() || t('community:creatorDefaultBio');
  const description = route.description?.trim() || '';
  const styleLabelForShare = route.travel_style ? (t as (k: string) => string)(`community:style_${route.travel_style}`) : '';
  const proTips = tipBullets(route.tip);
  const busyAdopt = adoptRoute.isPending;

  const handleShareRoute = async () => {
    setSharing(true);
    try {
      await new Promise((r) => setTimeout(r, 100));
      await captureAndShare(routeCardRef as React.RefObject<ViewShot | null>, { saveToLibrary: true });
    } catch {
      Alert.alert(t('community:errorTitle'), t('share:errorCapture'));
    } finally {
      setSharing(false);
    }
  };

  const onToggleLike = () => {
    toggleLike.mutate(
      { routeId: route.id, liked: route.likedByMe },
      {
        onError: (e) => Alert.alert(t('community:errorTitle'), formatErrorMessage(e, t('community:errorGeneric'))),
      },
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: SCREEN_BG }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ position: 'relative' }}>
          <View style={{ height: HERO_H, width: '100%', backgroundColor: '#E5E7EB' }}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : freeCoverLoading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={ORANGE} />
              </View>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D1D5DB' }}>
                <Ionicons name="image-outline" size={52} color="#9CA3AF" />
              </View>
            )}
            <LinearGradient
              colors={['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.75)']}
              locations={[0, 0.4, 1]}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={{
                position: 'absolute',
                top: insets.top + 8,
                left: 16,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.92)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityRole="button"
              accessibilityLabel={t('community:backA11y')}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>
            <View style={{ position: 'absolute', left: 16, right: 16, bottom: 56 }}>
              <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }} numberOfLines={2}>
                {title}
              </Text>
              {dest ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Ionicons name="location-outline" size={18} color="rgba(255,255,255,0.95)" />
                  <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.95)', flex: 1 }} numberOfLines={2}>
                    {dest}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View
            style={{
              marginTop: -44,
              marginHorizontal: 16,
              borderRadius: CARD_RADIUS,
              backgroundColor: '#fff',
              padding: 16,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              {route.creatorAvatar ? (
                <Image source={{ uri: route.creatorAvatar }} style={{ width: 48, height: 48, borderRadius: 24 }} />
              ) : (
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#E5E7EB',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#374151' }}>{initial}</Text>
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                  {route.creatorName}
                </Text>
                <Text style={{ fontSize: 13, color: colors.inactive, marginTop: 2 }} numberOfLines={2}>
                  {creatorSubtitle}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  <Text style={{ fontSize: 13, color: colors.inactive }}>{durationLabel}</Text>
                  {styleLabel ? (
                    <>
                      <Text style={{ fontSize: 13, color: colors.inactive }}>•</Text>
                      <Ionicons name={travelStyleIconName(route.travel_style)} size={14} color={colors.inactive} />
                      <Text style={{ fontSize: 13, color: colors.inactive }}>{styleLabel}</Text>
                    </>
                  ) : null}
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Pressable
                  onPress={onToggleLike}
                  disabled={toggleLike.isPending}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('community:heartA11y')}
                >
                  {toggleLike.isPending ? (
                    <ActivityIndicator size="small" color={ORANGE} />
                  ) : (
                    <Ionicons name={route.likedByMe ? 'heart' : 'heart-outline'} size={22} color={route.likedByMe ? '#EF4444' : colors.text} />
                  )}
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{route.likes_count ?? 0}</Text>
                </Pressable>
              </View>
            </View>

            {description ? (
              <Text style={{ fontSize: 15, color: '#4B5563', lineHeight: 22, marginTop: 14 }}>{description}</Text>
            ) : null}

            {tags.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                {tags.map((tag) => (
                  <View
                    key={tag}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 100,
                      backgroundColor: '#FFF7ED',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: ORANGE }}>{tagLabel(tag)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 16, marginTop: 18 }}>
          <StatMiniCard icon="calendar-outline" label={t('community:routeStatDuration')} value={durationLabel} />
          <StatMiniCard icon="cash-outline" label={t('community:routeStatBudget')} value={t('community:routeBudgetUnknown')} />
          <StatMiniCard
            icon="location-outline"
            label={t('community:routeStatBestSpot')}
            value={bestSpotName ?? '—'}
          />
        </View>

        {hotelNames || accommodationRating ? (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 18,
              backgroundColor: '#fff',
              borderRadius: CARD_RADIUS,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: hotelNames ? 10 : 0 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#FFF7ED',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons name="bed-outline" size={22} color={ORANGE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: colors.inactive }}>{t('memory:accommodationTitle')}</Text>
                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>
                  {accommodationRating ? t('memory:accommodationRatingValue', { rating: accommodationRating }) : '—'}
                </Text>
              </View>
            </View>
            {hotelNames ? (
              <Text style={{ fontSize: 15, color: '#374151', lineHeight: 22 }}>{hotelNames}</Text>
            ) : null}
          </View>
        ) : null}

        {displayItinerary.kind !== 'empty' ? (
          <View style={{ marginHorizontal: 16, marginTop: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Ionicons name="paper-plane-outline" size={22} color={ORANGE} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{t('community:routeItineraryTitle')}</Text>
            </View>
            {displayItinerary.kind === 'loading' ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator color={ORANGE} />
              </View>
            ) : displayItinerary.kind === 'source' ? (
              displayItinerary.days.map((dayBlock) => {
                const dayNum = dayBlock.dayNumber;
                const subtitle = dayBlock.stops[0]?.name ?? '';
                return (
                  <View
                    key={`src-day-${dayNum}`}
                    style={{
                      backgroundColor: '#fff',
                      borderRadius: CARD_RADIUS,
                      padding: 16,
                      marginBottom: 14,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: ORANGE,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 10,
                        }}
                      >
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>{dayNum}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>
                          {t('community:routeDayTitle', { day: dayNum })}
                        </Text>
                        {subtitle ? (
                          <Text style={{ fontSize: 13, color: colors.inactive, marginTop: 2 }} numberOfLines={1}>
                            {t('community:routeDaySubtitle', { subtitle })}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={{ paddingLeft: 8 }}>
                      {dayBlock.stops.map((stop, idx) => {
                        const rating = stop.rating != null ? Number(stop.rating) : null;
                        const addr = stop.address?.trim() || '';
                        const desc =
                          stop.notes?.trim() ||
                          stop.category?.trim() ||
                          t('community:routeStopPlanned');
                        const timeLabel = slotTimeLabel(idx, locale);
                        const isLast = idx === dayBlock.stops.length - 1;
                        return (
                          <View key={`${stop.placeId}-${stop.orderIndex}-${idx}`} style={{ flexDirection: 'row' }}>
                            <View style={{ width: 20, alignItems: 'center' }}>
                              <View
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: 5,
                                  backgroundColor: stop.status === 'skipped' ? '#D1D5DB' : ORANGE,
                                  marginTop: 4,
                                }}
                              />
                              {!isLast ? (
                                <View style={{ width: 2, flex: 1, minHeight: 12, backgroundColor: '#E5E7EB', marginVertical: 4 }} />
                              ) : null}
                            </View>
                            <View style={{ flex: 1, paddingBottom: isLast ? 0 : 16, paddingLeft: 8 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: ORANGE }}>{timeLabel}</Text>
                                {rating != null && Number.isFinite(rating) ? (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="star" size={14} color="#F59E0B" />
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{rating.toFixed(1)}</Text>
                                  </View>
                                ) : null}
                                {stop.status === 'visited' ? (
                                  <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#047857' }}>{t('community:routeStopVisited')}</Text>
                                  </View>
                                ) : null}
                                {stop.status === 'skipped' ? (
                                  <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inactive }}>{t('community:routeStopSkipped')}</Text>
                                  </View>
                                ) : null}
                              </View>
                              <Text
                                style={{
                                  fontSize: 16,
                                  fontWeight: '800',
                                  color: stop.status === 'skipped' ? colors.inactive : colors.text,
                                  marginTop: 6,
                                }}
                              >
                                {stop.name}
                              </Text>
                              <Text style={{ fontSize: 14, color: colors.inactive, marginTop: 4, lineHeight: 20 }}>{desc}</Text>
                              {addr ? (
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 }}>
                                  <Ionicons name="location-outline" size={14} color={colors.inactive} style={{ marginTop: 2 }} />
                                  <Text style={{ fontSize: 13, color: colors.inactive, flex: 1, lineHeight: 18 }}>{addr}</Text>
                                </View>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            ) : (
              displayItinerary.days.map((dayPins, dayIdx) => {
                const dayNum = dayIdx + 1;
                const subtitle = dayPins[0]?.name ?? '';
                return (
                  <View
                    key={`geo-day-${dayNum}`}
                    style={{
                      backgroundColor: '#fff',
                      borderRadius: CARD_RADIUS,
                      padding: 16,
                      marginBottom: 14,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: ORANGE,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 10,
                        }}
                      >
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>{dayNum}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>
                          {t('community:routeDayTitle', { day: dayNum })}
                        </Text>
                        {subtitle ? (
                          <Text style={{ fontSize: 13, color: colors.inactive, marginTop: 2 }} numberOfLines={1}>
                            {t('community:routeDaySubtitle', { subtitle })}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={{ paddingLeft: 8 }}>
                      {dayPins.map((pin, idx) => {
                        const row = placeById.get(pin.id);
                        const rating = row?.rating != null ? Number(row.rating) : null;
                        const addr = row?.formatted_address?.trim() || '';
                        const desc = row?.category?.trim() || t('community:routeStopPlanned');
                        const timeLabel = slotTimeLabel(idx, locale);
                        const isLast = idx === dayPins.length - 1;
                        return (
                          <View key={`${pin.id}-${idx}`} style={{ flexDirection: 'row' }}>
                            <View style={{ width: 20, alignItems: 'center' }}>
                              <View
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: 5,
                                  backgroundColor: ORANGE,
                                  marginTop: 4,
                                }}
                              />
                              {!isLast ? (
                                <View style={{ width: 2, flex: 1, minHeight: 12, backgroundColor: '#E5E7EB', marginVertical: 4 }} />
                              ) : null}
                            </View>
                            <View style={{ flex: 1, paddingBottom: isLast ? 0 : 16, paddingLeft: 8 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: ORANGE }}>{timeLabel}</Text>
                                {rating != null && Number.isFinite(rating) ? (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="star" size={14} color="#F59E0B" />
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{rating.toFixed(1)}</Text>
                                  </View>
                                ) : null}
                              </View>
                              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 6 }}>{pin.name}</Text>
                              <Text style={{ fontSize: 14, color: colors.inactive, marginTop: 4, lineHeight: 20 }}>{desc}</Text>
                              {addr ? (
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 }}>
                                  <Ionicons name="location-outline" size={14} color={colors.inactive} style={{ marginTop: 2 }} />
                                  <Text style={{ fontSize: 13, color: colors.inactive, flex: 1, lineHeight: 18 }}>{addr}</Text>
                                </View>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : null}

        {proTips.length > 0 ? (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 8,
              backgroundColor: '#fff',
              borderRadius: CARD_RADIUS,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 12 }}>{t('community:routeProTips')}</Text>
            {proTips.map((line, i) => (
              <View key={`tip-${i}`} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: ORANGE,
                    marginTop: 7,
                    marginRight: 10,
                  }}
                />
                <Text style={{ flex: 1, fontSize: 15, color: '#374151', lineHeight: 22 }}>{line}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {route.likes_count >= 10 ? (
          <Pressable
            onPress={() => void handleShareRoute()}
            disabled={sharing}
            style={({ pressed }) => ({
              marginHorizontal: 16,
              marginTop: 16,
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: 'rgba(240,90,26,0.08)',
              borderWidth: 1,
              borderColor: colors.primarySolid,
              alignItems: 'center',
              opacity: sharing ? 0.5 : pressed ? 0.85 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel={t('share:shareRouteBtn')}
          >
            {sharing ? (
              <ActivityIndicator color={colors.primarySolid} size="small" />
            ) : (
              <Text style={{ color: colors.primarySolid, fontSize: 15, fontWeight: '700' }}>{t('share:shareRouteBtn')}</Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: SCREEN_BG,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          flexDirection: 'row',
          gap: 12,
        }}
      >
        <Pressable
          onPress={runAdopt}
          disabled={busyAdopt}
          style={{
            flex: 1,
            paddingVertical: 16,
            borderRadius: 14,
            backgroundColor: ORANGE,
            alignItems: 'center',
            opacity: busyAdopt ? 0.7 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel={t('community:useThisRouteCta')}
        >
          {busyAdopt ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{t('community:useThisRouteCta')}</Text>
          )}
        </Pressable>
      </View>

      <View style={{ position: 'absolute', left: -9999 }}>
        <RouteShareCard
          ref={routeCardRef}
          destination={route.destination ?? route.title}
          likesCount={route.likes_count}
          topPlaces={names.slice(0, 3)}
          travelStyle={styleLabelForShare}
        />
      </View>
    </View>
  );
}
