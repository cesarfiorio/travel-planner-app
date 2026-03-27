import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../constants/colors';

export default function PaywallScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 56 }}>
      <Pressable
        onPress={() => router.back()}
        style={{ marginBottom: 24, alignSelf: 'flex-start' }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 16 }}>← Back</Text>
      </Pressable>
      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
        Manage Subscription
      </Text>
      <Text style={{ fontSize: 16, color: colors.inactive, lineHeight: 22 }}>
        Subscription and billing will be available here in a future update.
      </Text>
    </View>
  );
}
