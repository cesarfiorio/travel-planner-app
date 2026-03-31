import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../constants/colors';
import type { CommunityRouteVm } from '../lib/hooks/useCommunityRoutes';

type CommunityRouteCardProps = {
  route: CommunityRouteVm;
  onToggleHeart?: () => void;
  heartBusy?: boolean;
};

export function CommunityRouteCard({ route, onToggleHeart, heartBusy }: CommunityRouteCardProps) {
  const { t } = useTranslation('community');
  const router = useRouter();
  const tipPreview = route.tip?.trim() ? (route.tip.length > 100 ? `${route.tip.slice(0, 100)}…` : route.tip) : '';
  const duration =
    route.duration_days != null ? t('durationDays', { count: route.duration_days }) : t('durationUnknown');

  return (
    <Pressable
      onPress={() => router.push(`/(stack)/community/${route.id}`)}
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        padding: 14,
        borderRadius: 16,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }} numberOfLines={2}>
            {route.destination?.trim() || route.title}
          </Text>
          <Text style={{ fontSize: 13, color: colors.inactive, marginTop: 4 }}>{duration}</Text>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onToggleHeart?.();
          }}
          disabled={heartBusy || !onToggleHeart}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('heartA11y')}
        >
          <Ionicons
            name={route.likedByMe ? 'heart' : 'heart-outline'}
            size={24}
            color={route.likedByMe ? '#EF4444' : colors.inactive}
          />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 }}>
        {route.creatorAvatar ? (
          <Image source={{ uri: route.creatorAvatar }} style={{ width: 28, height: 28, borderRadius: 14 }} />
        ) : (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: '#E5E7EB',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="person" size={16} color={colors.inactive} />
          </View>
        )}
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>
          {route.creatorName}
        </Text>
      </View>

      {tipPreview ? (
        <Text style={{ fontSize: 14, color: colors.text, marginTop: 10, lineHeight: 20 }} numberOfLines={3}>
          {tipPreview}
        </Text>
      ) : null}

      {route.tags?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {route.tags.map((tag) => (
            <View key={tag} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F3F4F6' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
              {(t as (k: string) => string)(`tag_${tag}`)}
            </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={{ fontSize: 12, color: colors.inactive, marginTop: 8 }}>
        {t('heartsCount', { count: route.likes_count ?? 0 })}
      </Text>
    </Pressable>
  );
}
