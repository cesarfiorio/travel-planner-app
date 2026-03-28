import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

export default function CommunityScreen() {
  const { t } = useTranslation('community');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{t('screenTitle')}</Text>
    </View>
  );
}
