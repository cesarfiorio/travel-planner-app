import type { ReactNode } from 'react';
import { Pressable, type ViewStyle } from 'react-native';

import { colors } from '../../constants/colors';

export type IconButtonVariant = 'primary' | 'ghost' | 'outline';

export interface IconButtonProps {
  icon: ReactNode;
  onPress: () => void;
  variant?: IconButtonVariant;
  size?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const BG: Record<IconButtonVariant, string> = {
  primary: colors.primarySolid,
  ghost: 'transparent',
  outline: 'transparent',
};

const BORDER: Record<IconButtonVariant, string | undefined> = {
  primary: undefined,
  ghost: undefined,
  outline: colors.primarySolid,
};

export function IconButton({
  icon,
  onPress,
  variant = 'ghost',
  size = 44,
  disabled = false,
  accessibilityLabel,
}: IconButtonProps) {
  const container: ViewStyle = {
    width: size,
    height: size,
    minWidth: 44,
    minHeight: 44,
    borderRadius: size / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG[variant],
    borderWidth: BORDER[variant] ? 1.5 : 0,
    borderColor: BORDER[variant],
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={Math.max(0, (44 - size) / 2)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        container,
        {
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !disabled ? 0.95 : 1 }],
        },
      ]}
    >
      {icon}
    </Pressable>
  );
}
