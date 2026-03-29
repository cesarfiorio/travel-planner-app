import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../../constants/colors';

export default function FinishTripScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('trips');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('detailBackA11y')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, marginLeft: 12, fontSize: 20, fontWeight: '700', color: colors.text }} numberOfLines={1}>
          {t('finishTrip')}
        </Text>
      </View>
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 16, color: colors.inactive, lineHeight: 24 }}>{t('finishTripPlaceholder')}</Text>
      </View>
    </View>
  );
}
