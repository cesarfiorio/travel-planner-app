import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import type ViewShot from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RouteShareCard, type RouteShareCardHandle } from '../../../components/share';
import { colors } from '../../../constants/colors';
import { formatErrorMessage } from '../../../lib/formatError';
import {
  useCommunityRoute,
  useToggleRouteLike,
  useToggleRouteSave,
} from '../../../lib/hooks/useCommunityRoutes';
import { captureAndShare } from '../../../lib/utils/shareCard';
import { parseRoutePlaceNames } from '../../../lib/utils/routeGeoJson';

const SCREEN_BG = '#F9FAFB';
const ORANGE = '#F05A1A';
const COVER_H = 220;
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

export default function CommunityRouteDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const routeId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['community', 'share']);
  const { data: route, isPending, isError } = useCommunityRoute(routeId);
  const toggleLike = useToggleRouteLike();
  const toggleSave = useToggleRouteSave();
  const routeCardRef = useRef<RouteShareCardHandle>(null);
  const [sharing, setSharing] = useState(false);

  const tagLabel = (tag: string) => {
    const key = `tag_${tag}`;
    const label = (t as (k: string) => string)(`community:${key}`);
    if (label === `community:${key}` || label === key || label.startsWith('tag_')) {
      return tag.charAt(0).toUpperCase() + tag.slice(1);
    }
    return label;
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

  const names = parseRoutePlaceNames(route.route_geojson);
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
  const tags = (route.tags ?? []).slice(0, 3);
  const coverUri = route.cover_photo_url?.trim() || null;
  const initial = route.creatorName?.trim()?.charAt(0)?.toUpperCase() || '?';

  const styleLabelForShare = route.travel_style ? (t as (k: string) => string)(`community:style_${route.travel_style}`) : '';

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

  const onToggleSave = () => {
    toggleSave.mutate(
      { routeId: route.id, saved: route.savedByMe },
      {
        onError: (e) => Alert.alert(t('community:errorTitle'), formatErrorMessage(e, t('community:errorGeneric'))),
      },
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: SCREEN_BG, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('community:backA11y')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={onToggleLike}
          disabled={toggleLike.isPending}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('community:heartA11y')}
          style={{ marginRight: 4, padding: 8 }}
        >
          {toggleLike.isPending ? (
            <ActivityIndicator size="small" color={route.likedByMe ? '#EF4444' : colors.inactive} />
          ) : (
            <Ionicons name={route.likedByMe ? 'heart' : 'heart-outline'} size={26} color={route.likedByMe ? '#EF4444' : colors.text} />
          )}
        </Pressable>
        <Pressable
          onPress={onToggleSave}
          disabled={toggleSave.isPending}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('community:saveA11y')}
          style={{ padding: 8 }}
        >
          {toggleSave.isPending ? (
            <ActivityIndicator size="small" color={ORANGE} />
          ) : (
            <Ionicons name={route.savedByMe ? 'bookmark' : 'bookmark-outline'} size={24} color={route.savedByMe ? ORANGE : colors.text} />
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            borderRadius: CARD_RADIUS,
            overflow: 'hidden',
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: '#E5E7EB',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 }}>
            {route.creatorAvatar ? (
              <Image source={{ uri: route.creatorAvatar }} style={{ width: 40, height: 40, borderRadius: 20 }} />
            ) : (
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#E5E7EB',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#374151' }}>{initial}</Text>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                {route.creatorName}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
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
          </View>

          <View style={{ marginTop: 10, marginHorizontal: 14, height: COVER_H, borderRadius: 12, overflow: 'hidden', backgroundColor: '#E5E7EB' }}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D1D5DB' }}>
                <Ionicons name="image-outline" size={52} color="#9CA3AF" />
              </View>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 130,
                justifyContent: 'flex-end',
                paddingHorizontal: 14,
                paddingBottom: 14,
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }} numberOfLines={2}>
                {title}
              </Text>
              {dest ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', flex: 1 }} numberOfLines={2}>
                    {dest}
                  </Text>
                </View>
              ) : null}
            </LinearGradient>
          </View>

          {tags.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingTop: 14 }}>
              {tags.map((tag) => (
                <View
                  key={tag}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 100,
                    backgroundColor: '#F9FAFB',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>{tagLabel(tag)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 14,
              paddingTop: 16,
              paddingBottom: 16,
              borderTopWidth: 1,
              borderTopColor: '#F3F4F6',
              marginTop: tags.length > 0 ? 12 : 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="heart" size={20} color="#9CA3AF" />
                <Text style={{ fontSize: 15, color: '#374151', fontWeight: '600' }}>{route.likes_count ?? 0}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="bookmark-outline" size={20} color="#9CA3AF" />
                <Text style={{ fontSize: 15, color: '#374151', fontWeight: '600' }}>{route.saves_count ?? 0}</Text>
              </View>
              {(route.used_count ?? 0) > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-done-outline" size={20} color="#9CA3AF" />
                  <Text style={{ fontSize: 15, color: '#374151', fontWeight: '600' }}>{route.used_count}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: CARD_RADIUS,
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 }}>{t('community:bestTip')}</Text>
          <Text style={{ fontSize: 16, color: colors.text, lineHeight: 24 }}>{route.tip || route.description || '—'}</Text>
        </View>

        <View
          style={{
            marginTop: 12,
            padding: 16,
            borderRadius: CARD_RADIUS,
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 }}>{t('community:placesOnRoute')}</Text>
          {names.length === 0 ? (
            <Text style={{ color: colors.inactive }}>{t('community:noPlaces')}</Text>
          ) : (
            names.map((n, i) => (
              <View key={`${i}-${n}`} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                <Text style={{ fontSize: 16, color: ORANGE, marginRight: 10, lineHeight: 22 }}>•</Text>
                <Text style={{ flex: 1, fontSize: 16, color: colors.text, lineHeight: 22 }}>{n}</Text>
              </View>
            ))
          )}
        </View>

        {route.likes_count >= 10 ? (
          <Pressable
            onPress={() => void handleShareRoute()}
            disabled={sharing}
            style={({ pressed }) => ({
              marginTop: 16,
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: 'rgba(234,88,12,0.08)',
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

      <View style={{ position: 'absolute', left: 20, right: 20, bottom: Math.max(16, insets.bottom + 8) }}>
        <Pressable
          onPress={() => router.push('/trip/new')}
          style={{
            paddingVertical: 16,
            borderRadius: 14,
            backgroundColor: ORANGE,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 6,
            elevation: 4,
          }}
          accessibilityRole="button"
        >
          <Text style={{ color: colors.onPrimary, fontSize: 17, fontWeight: '700' }}>{t('community:planTripCta')}</Text>
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
