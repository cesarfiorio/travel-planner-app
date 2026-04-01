import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { colors } from '../constants/colors';
import { Button } from './ui';

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
      <View style={{ alignSelf: 'center' }}>
        <Button label={t('emptyCta')} onPress={onCreatePress} variant="primary" size="lg" accessibilityLabel={t('emptyCta')} />
      </View>
    </View>
  );
}
