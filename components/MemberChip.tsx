import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Pressable, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { colors } from '../constants/colors';
type Props = {
  displayName: string;
  avatarUrl: string | null;
  role: string;
  joinedLabel: string;
  roleLabel: string;
  ownerBadgeA11y: string;
  swipeToRemoveEnabled: boolean;
  onRemove: () => void;
  removeActionA11y: string;
};

export function MemberChip({
  displayName,
  avatarUrl,
  role,
  joinedLabel,
  roleLabel,
  ownerBadgeA11y,
  swipeToRemoveEnabled,
  onRemove,
  removeActionA11y,
}: Props) {
  const row = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
      }}
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }} />
      ) : (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            marginRight: 12,
            backgroundColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }} numberOfLines={1}>
            {displayName}
          </Text>
          {role === 'owner' ? (
            <MaterialCommunityIcons name="crown" size={18} color="#CA8A04" accessibilityLabel={ownerBadgeA11y} />
          ) : null}
        </View>
        <Text style={{ fontSize: 13, color: colors.inactive, marginTop: 2 }}>{joinedLabel}</Text>
        <Text style={{ fontSize: 12, color: colors.inactive, marginTop: 2 }}>{roleLabel}</Text>
      </View>
    </View>
  );

  if (!swipeToRemoveEnabled) {
    return row;
  }

  const renderRightActions = () => (
    <Pressable
      onPress={onRemove}
      style={{
        backgroundColor: '#DC2626',
        justifyContent: 'center',
        paddingHorizontal: 20,
        marginLeft: 8,
        borderRadius: 12,
        minHeight: 72,
      }}
      accessibilityRole="button"
      accessibilityLabel={removeActionA11y}
    >
      <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
    </Pressable>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false} friction={2}>
      {row}
    </Swipeable>
  );
}
