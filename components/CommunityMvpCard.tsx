import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { COLORS, FONT, RADIUS, SHADOW } from '../constants/theme';
import type { CommunityRouteVm } from '../lib/hooks/useCommunityRoutes';
import { useDestinationCoverPhoto } from '../lib/hooks/useDestinationCoverPhoto';

const CARD_RADIUS = RADIUS.xl;
const COVER_H = 228;
const INNER_PAD = 16;

type Props = {
  route: CommunityRouteVm;
  onToggleHeart: () => void;
  onToggleSave: () => void;
  heartBusy: boolean;
  saveBusy: boolean;
};

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

export function CommunityMvpCard({
  route,
  onToggleHeart,
  onToggleSave,
  heartBusy,
  saveBusy,
}: Props) {
  const { t } = useTranslation('community');
  const router = useRouter();

  const title = route.title?.trim() || route.destination?.trim() || 'Trip';
  const dest = route.destination?.trim() ?? '';
  const durationLabel =
    route.duration_days != null
      ? t('durationDays', { count: route.duration_days })
      : t('durationUnknown');
  const styleKey = route.travel_style ?? '';
  const styleLabel =
    styleKey === 'group'
      ? t('styleFriends')
      : styleKey
        ? (t as (k: string) => string)(`style_${styleKey}`)
        : '—';
  const tags = (route.tags ?? []).slice(0, 3);
  const tagLabel = (tag: string) => {
    const key = `tag_${tag}`;
    const label = (t as (k: string) => string)(key);
    if (label === key || label.startsWith('tag_')) {
      return tag.charAt(0).toUpperCase() + tag.slice(1);
    }
    return label;
  };
  const initial = route.creatorName?.trim()?.charAt(0)?.toUpperCase() || '?';
  const storedCover = route.cover_photo_url?.trim() || null;
  const destForCover = dest || title;
  const { data: freeCoverUrl, isFetching: freeCoverLoading } = useDestinationCoverPhoto(
    destForCover,
    !storedCover && destForCover.trim().length >= 2,
  );
  const coverUri = storedCover || freeCoverUrl || null;

  return (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: CARD_RADIUS,
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOW.md,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: INNER_PAD,
          paddingTop: INNER_PAD,
          paddingBottom: INNER_PAD,
        }}
      >
        {route.creatorAvatar ? (
          <Image source={{ uri: route.creatorAvatar }} style={{ width: 40, height: 40, borderRadius: 20 }} />
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: COLORS.pageBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: FONT.md, fontWeight: FONT.bold, color: COLORS.textSecondary }}>{initial}</Text>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: FONT.base, fontWeight: FONT.bold, color: COLORS.textPrimary }} numberOfLines={1}>
            {route.creatorName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Text style={{ fontSize: FONT.sm, color: COLORS.textSecondary }}>{durationLabel}</Text>
            <Text style={{ fontSize: FONT.sm, color: COLORS.textSecondary }}>•</Text>
            <Ionicons name={travelStyleIconName(route.travel_style)} size={14} color={COLORS.textSecondary} />
            <Text style={{ fontSize: FONT.sm, color: COLORS.textSecondary }}>{styleLabel}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => onToggleSave()}
          disabled={saveBusy}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('saveA11y')}
        >
          {saveBusy ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons
              name={route.savedByMe ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={route.savedByMe ? COLORS.primary : COLORS.textTertiary}
            />
          )}
        </Pressable>
      </View>

      <View
        style={{
          height: COVER_H,
          marginHorizontal: INNER_PAD,
          borderRadius: RADIUS.lg,
          overflow: 'hidden',
          backgroundColor: COLORS.border,
        }}
      >
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : freeCoverLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.pageBg }}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.pageBg }}>
            <Ionicons name="image-outline" size={48} color={COLORS.textTertiary} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 112,
            justifyContent: 'flex-end',
            paddingHorizontal: 14,
            paddingBottom: 14,
          }}
        >
          <Text style={{ fontSize: FONT.xl, fontWeight: FONT.bold, color: COLORS.textOnPrimary }} numberOfLines={2}>
            {title}
          </Text>
          {dest ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <Ionicons name="location" size={15} color="rgba(255,255,255,0.95)" />
              <Text style={{ fontSize: FONT.md, color: 'rgba(255,255,255,0.92)', flex: 1 }} numberOfLines={1}>
                {dest}
              </Text>
            </View>
          ) : null}
        </LinearGradient>
      </View>

      {tags.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            paddingHorizontal: INNER_PAD,
            paddingTop: 14,
          }}
        >
          {tags.map((tag) => (
            <View
              key={tag}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: RADIUS.pill,
                backgroundColor: COLORS.pageBg,
              }}
            >
              <Text style={{ fontSize: FONT.sm, color: COLORS.textSecondary, fontWeight: FONT.medium }}>
                {tagLabel(tag)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: INNER_PAD,
          paddingTop: 14,
          paddingBottom: INNER_PAD,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <Pressable
            onPress={onToggleHeart}
            disabled={heartBusy}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            accessibilityRole="button"
            accessibilityLabel={t('heartA11y')}
          >
            {heartBusy ? (
              <ActivityIndicator size="small" color={route.likedByMe ? COLORS.danger : COLORS.textSecondary} />
            ) : (
              <Ionicons
                name={route.likedByMe ? 'heart' : 'heart-outline'}
                size={22}
                color={route.likedByMe ? COLORS.danger : COLORS.textSecondary}
              />
            )}
            <Text style={{ fontSize: FONT.base, color: COLORS.textSecondary, fontWeight: FONT.semibold }}>
              {route.likes_count ?? 0}
            </Text>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="bookmark-outline" size={22} color={COLORS.textSecondary} />
            <Text style={{ fontSize: FONT.base, color: COLORS.textSecondary, fontWeight: FONT.semibold }}>
              {route.saves_count ?? 0}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push(`/(stack)/community/${route.id}`)}
          style={{
            backgroundColor: COLORS.primary,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: RADIUS.pill,
          }}
          accessibilityRole="button"
          accessibilityLabel={t('viewRoute')}
        >
          <Text style={{ fontSize: FONT.base, fontWeight: FONT.semibold, color: COLORS.textOnPrimary }}>
            {t('viewRoute')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
