import { View } from 'react-native';

import { colors } from '../constants/colors';

const CARD_RADIUS = 16;
const IMAGE_H = 200;

export function PlaceSkeleton() {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 20,
        borderRadius: CARD_RADIUS,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      <View style={{ height: IMAGE_H, width: '100%', backgroundColor: '#E5E7EB' }} />
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}>
        <View style={{ height: 20, width: '75%', borderRadius: 4, backgroundColor: '#E5E7EB' }} />
        <View style={{ height: 14, width: '100%', borderRadius: 4, backgroundColor: '#F3F4F6', marginTop: 10 }} />
        <View style={{ height: 14, width: '60%', borderRadius: 4, backgroundColor: '#F3F4F6', marginTop: 8 }} />
        <View style={{ height: 16, width: '45%', borderRadius: 4, backgroundColor: '#E5E7EB', marginTop: 12 }} />
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <View style={{ height: 48, borderRadius: 14, backgroundColor: '#F3F4F6' }} />
      </View>
    </View>
  );
}
