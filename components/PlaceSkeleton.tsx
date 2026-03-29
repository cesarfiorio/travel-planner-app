import { View } from 'react-native';

import { colors } from '../constants/colors';

export function PlaceSkeleton() {
  return (
    <View
      style={{
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 14,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#F9FAFB',
      }}
    >
      <View style={{ width: 88, height: 88, borderRadius: 10, backgroundColor: colors.border }} />
      <View style={{ flex: 1, marginLeft: 12, justifyContent: 'center', gap: 8 }}>
        <View style={{ height: 16, width: '70%', borderRadius: 4, backgroundColor: colors.border }} />
        <View style={{ height: 12, width: '40%', borderRadius: 4, backgroundColor: colors.border }} />
        <View style={{ height: 12, width: '90%', borderRadius: 4, backgroundColor: colors.border }} />
      </View>
    </View>
  );
}
