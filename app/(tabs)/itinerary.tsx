import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

export default function ItineraryScreen() {
  const { t } = useTranslation('trips');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{t('screenTitle')}</Text>
    </View>
  );
}
