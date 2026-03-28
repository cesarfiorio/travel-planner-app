import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../constants/colors';

type Props = {
  onCreatePress: () => void;
};

export function EmptyTrips({ onCreatePress }: Props) {
  const { t } = useTranslation('trips');

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 32,
        paddingTop: 48,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: '#FFF3EC',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <Ionicons name="map-outline" size={56} color={colors.primary} />
      </View>
      <Text
        style={{
          fontSize: 22,
          fontWeight: '700',
          color: colors.text,
          textAlign: 'center',
          marginBottom: 12,
        }}
      >
        {t('emptyTitle')}
      </Text>
      <Text
        style={{
          fontSize: 16,
          color: colors.inactive,
          textAlign: 'center',
          lineHeight: 24,
          marginBottom: 32,
        }}
      >
        {t('emptySubtitle')}
      </Text>
      <Pressable
        onPress={onCreatePress}
        style={({ pressed }) => ({
          paddingVertical: 14,
          paddingHorizontal: 28,
          borderRadius: 12,
          backgroundColor: colors.primary,
          opacity: pressed ? 0.9 : 1,
        })}
        accessibilityRole="button"
        accessibilityLabel={t('emptyCta')}
      >
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{t('emptyCta')}</Text>
      </Pressable>
    </View>
  );
}
