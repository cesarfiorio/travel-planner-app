import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, Text, View } from 'react-native';

/** Solid fill on a View (not only Pressable) so Android / layered views always paint orange. */
const FAB_ORANGE = '#F05A1A';

type Props = {
  bottom: number;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  onLongPress?: () => void;
};

export function NewTripFab({ bottom, label, accessibilityLabel, onPress, onLongPress }: Props) {
  const shadowWrap = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === 'ios' ? 0.2 : 0.35,
    shadowRadius: 10,
    elevation: Platform.OS === 'android' ? 10 : 6,
  } as const;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        top: 0,
        zIndex: 999,
      }}
      collapsable={false}
    >
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom,
          alignItems: 'center',
        }}
        collapsable={false}
      >
        <View
          style={{
            borderRadius: 999,
            backgroundColor: FAB_ORANGE,
            alignSelf: 'flex-end',
            paddingVertical: 16,
            paddingHorizontal: 24,
            ...shadowWrap,
          }}
          collapsable={false}
        >
          <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 16,
              paddingHorizontal: 20,
              opacity: pressed ? 0.92 : 1,
              flexWrap: 'nowrap',
            })}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
          >
            <Text 
            numberOfLines={1}
            style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3, flexShrink: 1 }}>{label}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
