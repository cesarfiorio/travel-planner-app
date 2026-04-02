import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import type ViewShot from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RouteShareCard, type RouteShareCardHandle } from '../../../components/share';
import { colors } from '../../../constants/colors';
import { formatErrorMessage } from '../../../lib/formatError';
import { useCommunityRoute, useToggleRouteLike } from '../../../lib/hooks/useCommunityRoutes';
import { captureAndShare } from '../../../lib/utils/shareCard';
import { parseRoutePlaceNames } from '../../../lib/utils/routeGeoJson';

export default function CommunityRouteDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const routeId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['community', 'share']);
  const { data: route, isPending, isError } = useCommunityRoute(routeId);
  const toggleLike = useToggleRouteLike();
  const routeCardRef = useRef<RouteShareCardHandle>(null);
  const [sharing, setSharing] = useState(false);

  if (isPending) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primarySolid} size="large" />
      </View>
    );
  }

  if (isError || !route) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 20, backgroundColor: colors.background }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backA11y')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ marginTop: 24, color: colors.inactive }}>{t('notFound')}</Text>
      </View>
    );
  }

  const names = parseRoutePlaceNames(route.route_geojson);
  const styleLabel = route.travel_style ? (t as (k: string) => string)(`community:style_${route.travel_style}`) : '';

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('backA11y')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, marginLeft: 12, fontSize: 20, fontWeight: '700', color: colors.text }} numberOfLines={1}>
          {route.destination?.trim() || route.title}
        </Text>
        <Pressable
          onPress={() =>
            toggleLike.mutate(
              { routeId: route.id, liked: route.likedByMe },
              {
                onError: (e) => Alert.alert(t('errorTitle'), formatErrorMessage(e, t('errorGeneric'))),
              },
            )
          }
          disabled={toggleLike.isPending}
          hitSlop={8}
        >
          <Ionicons
            name={route.likedByMe ? 'heart' : 'heart-outline'}
            size={26}
            color={route.likedByMe ? '#EF4444' : colors.text}
          />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        {styleLabel ? (
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primarySolid, marginBottom: 12 }}>{styleLabel}</Text>
        ) : null}
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 }}>{t('bestTip')}</Text>
        <Text style={{ fontSize: 16, color: colors.text, lineHeight: 24, marginBottom: 20 }}>{route.tip || route.description || '—'}</Text>

        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 }}>{t('placesOnRoute')}</Text>
        {names.length === 0 ? (
          <Text style={{ color: colors.inactive, marginBottom: 20 }}>{t('noPlaces')}</Text>
        ) : (
          names.map((n, i) => (
            <Text key={`${i}-${n}`} style={{ fontSize: 15, color: colors.text, marginBottom: 6 }}>
              • {n}
            </Text>
          ))
        )}
        {route.likes_count >= 10 ? (
          <Pressable
            onPress={() => void handleShareRoute()}
            disabled={sharing}
            style={({ pressed }) => ({
              marginTop: 20,
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: 'rgba(234,88,12,0.1)',
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
              <Text style={{ color: colors.primarySolid, fontSize: 15, fontWeight: '700' }}>
                {t('share:shareRouteBtn')}
              </Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: Math.max(16, insets.bottom + 8),
        }}
      >
        <Pressable
          onPress={() => router.push('/trip/new')}
          style={{
            paddingVertical: 16,
            borderRadius: 14,
            backgroundColor: colors.primarySolid,
            alignItems: 'center',
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
          travelStyle={styleLabel}
        />
      </View>
    </View>
  );
}
