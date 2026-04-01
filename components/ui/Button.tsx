import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, type TextStyle, type ViewStyle } from 'react-native';

import { colors } from '../../constants/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  accessibilityLabel?: string;
}

const BG: Record<ButtonVariant, string> = {
  primary: colors.primarySolid,
  secondary: '#F0F0F0',
  outline: 'transparent',
  ghost: 'transparent',
  destructive: '#DC2626',
};

const TEXT_COLOR: Record<ButtonVariant, string> = {
  primary: '#FFFFFF',
  secondary: colors.text,
  outline: colors.primarySolid,
  ghost: colors.primarySolid,
  destructive: '#FFFFFF',
};

const BORDER: Record<ButtonVariant, string | undefined> = {
  primary: undefined,
  secondary: undefined,
  outline: colors.primarySolid,
  ghost: undefined,
  destructive: undefined,
};

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 44, lg: 52 };
const FONT_SIZE: Record<ButtonSize, number> = { sm: 13, md: 15, lg: 17 };
const PADDING_H: Record<ButtonSize, number> = { sm: 12, md: 16, lg: 20 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  accessibilityLabel,
}: ButtonProps) {
  const textColor = TEXT_COLOR[variant];

  const container: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: HEIGHT[size],
    paddingHorizontal: PADDING_H[size],
    borderRadius: size === 'lg' ? 14 : 12,
    backgroundColor: BG[variant],
    borderWidth: BORDER[variant] ? 1.5 : 0,
    borderColor: BORDER[variant],
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
  };

  const labelStyle: TextStyle = {
    fontSize: FONT_SIZE[size],
    fontWeight: '700',
    color: textColor,
    textAlign: 'center',
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        container,
        {
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size={size === 'sm' ? 'small' : 'small'} />
      ) : (
        <>
          {leftIcon ?? null}
          <Text style={labelStyle}>{label}</Text>
          {rightIcon ?? null}
        </>
      )}
    </Pressable>
  );
}
