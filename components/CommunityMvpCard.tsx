import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { CommunityRouteVm } from '../lib/hooks/useCommunityRoutes';

const ORANGE = '#F05A1A';
const CARD_RADIUS = 12;
const COVER_H = 200;

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
  const coverUri = route.cover_photo_url?.trim() || null;

  return (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 16,
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
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 0 }}>
        {route.creatorAvatar ? (
          <Image source={{ uri: route.creatorAvatar }} style={{ width: 36, height: 36, borderRadius: 18 }} />
        ) : (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#E5E7EB',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151' }}>{initial}</Text>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }} numberOfLines={1}>
            {route.creatorName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>{durationLabel}</Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>•</Text>
            <Ionicons name={travelStyleIconName(route.travel_style)} size={14} color="#6B7280" />
            <Text style={{ fontSize: 12, color: '#6B7280' }}>{styleLabel}</Text>
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
            <ActivityIndicator size="small" color={ORANGE} />
          ) : (
            <Ionicons
              name={route.savedByMe ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={route.savedByMe ? ORANGE : '#9CA3AF'}
            />
          )}
        </Pressable>
      </View>

      <View style={{ marginTop: 12, height: COVER_H, width: '100%', backgroundColor: '#E5E7EB' }}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D1D5DB' }}>
            <Ionicons name="image-outline" size={48} color="#9CA3AF" />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.65)']}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 120,
            justifyContent: 'flex-end',
            paddingHorizontal: 12,
            paddingBottom: 12,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }} numberOfLines={2}>
            {title}
          </Text>
          {dest ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', flex: 1 }} numberOfLines={1}>
                {dest}
              </Text>
            </View>
          ) : null}
        </LinearGradient>
      </View>

      {tags.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingTop: 10 }}>
          {tags.map((tag) => (
            <View
              key={tag}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 100,
                backgroundColor: '#fff',
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
            >
              <Text style={{ fontSize: 12, color: '#374151', fontWeight: '500' }}>{tagLabel(tag)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Pressable
            onPress={onToggleHeart}
            disabled={heartBusy}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            accessibilityRole="button"
            accessibilityLabel={t('heartA11y')}
          >
            {heartBusy ? (
              <ActivityIndicator size="small" color={route.likedByMe ? '#EF4444' : '#6B7280'} />
            ) : (
              <Ionicons
                name={route.likedByMe ? 'heart' : 'heart-outline'}
                size={20}
                color={route.likedByMe ? '#EF4444' : '#6B7280'}
              />
            )}
            <Text style={{ fontSize: 14, color: '#6B7280', fontWeight: '600' }}>{route.likes_count ?? 0}</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name={route.savedByMe ? 'bookmark' : 'bookmark-outline'} size={20} color="#6B7280" />
            <Text style={{ fontSize: 14, color: '#6B7280', fontWeight: '600' }}>{route.saves_count ?? 0}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push(`/(stack)/community/${route.id}`)}
          style={{
            backgroundColor: ORANGE,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 100,
          }}
          accessibilityRole="button"
          accessibilityLabel={t('viewRoute')}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{t('viewRoute')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
