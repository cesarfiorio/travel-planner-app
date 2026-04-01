import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { colors } from '../constants/colors';
import { Button } from './ui';

type LockedBannerProps = {
  message: string;
  /** Optional feature key for default copy when message is empty. */
  featureId?: string;
  /** When false, hide the paywall CTA (rare). */
  showUnlock?: boolean;
};

export function LockedBanner({ message, featureId, showUnlock = true }: LockedBannerProps) {
  const router = useRouter();
  const { t } = useTranslation('paywall');

  const title =
    message.trim() ||
    (featureId ? t(`featureTitles.${featureId}`, { defaultValue: t('featureTitles.default') }) : t('featureTitles.default'));

  const openPaywall = () => {
    router.push('/(stack)/paywall');
  };

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 10,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <Ionicons name="lock-closed" size={22} color={colors.inactive} style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 }}>{title}</Text>
          {showUnlock ? (
            <View style={{ alignSelf: 'flex-start', marginTop: 8 }}>
              <Button
                label={t('unlockExplorer')}
                onPress={openPaywall}
                variant="primary"
                size="sm"
                accessibilityLabel={t('unlockExplorerA11y')}
              />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
