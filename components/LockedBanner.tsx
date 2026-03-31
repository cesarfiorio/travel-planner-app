import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { colors } from '../constants/colors';

type LockedBannerProps = {
  message: string;
};

export function LockedBanner({ message }: LockedBannerProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 16,
        marginBottom: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Ionicons name="lock-closed" size={22} color={colors.inactive} />
      <Text style={{ flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 }}>{message}</Text>
    </View>
  );
}
