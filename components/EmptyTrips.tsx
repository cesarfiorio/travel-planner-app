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
        <Ionicons name="map-outline" size={56} color={colors.primarySolid} />
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
          color: colors.text,
          textAlign: 'center',
          lineHeight: 24,
          marginBottom: 12,
          opacity: 0.85,
        }}
      >
        {t('emptySubtitle')}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          color: colors.primarySolid,
          textAlign: 'center',
          marginBottom: 20,
        }}
      >
        {t('emptyTapBelow')}
      </Text>
      <Pressable
        onPress={onCreatePress}
        style={({ pressed }) => ({
          minWidth: 260,
          paddingVertical: 16,
          paddingHorizontal: 32,
          borderRadius: 14,
          backgroundColor: colors.primarySolid,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.92 : 1,
          borderWidth: 2,
          borderColor: '#7C2D12',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 6,
        })}
        accessibilityRole="button"
        accessibilityLabel={t('emptyCta')}
      >
        <Text style={{ color: colors.onPrimary, fontSize: 18, fontWeight: '700' }}>{t('emptyCta')}</Text>
      </Pressable>
    </View>
  );
}
