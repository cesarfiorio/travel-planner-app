import { Pressable, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { signOut } from '../../lib/supabase/auth';

export default function ProfileScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        backgroundColor: colors.background,
      }}
    >
      <Text style={{ fontSize: 18, color: colors.text, marginBottom: 24 }}>Profile</Text>
      <Pressable
        onPress={() => void signOut()}
        style={({ pressed }) => ({
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 12,
          backgroundColor: colors.primary,
          opacity: pressed ? 0.9 : 1,
        })}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 16 }}>Sign out</Text>
      </Pressable>
    </View>
  );
}
