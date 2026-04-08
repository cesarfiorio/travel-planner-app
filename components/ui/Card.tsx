import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { COLORS, RADIUS, SHADOW, SPACING } from '../../constants/theme';

export interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  padding?: number;
  onPress?: () => void;
}

export function Card({ children, style, padding = SPACING.lg, onPress }: CardProps) {
  const baseStyle: ViewStyle = {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding,
    ...SHADOW.sm,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [baseStyle, { opacity: pressed ? 0.96 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[baseStyle, style]}>{children}</View>;
}
