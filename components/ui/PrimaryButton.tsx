import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { COLORS, FONT, RADIUS, SHADOW } from '../../constants/theme';

export interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'filled' | 'outline' | 'ghost';
  leftIcon?: ReactNode;
  /** Soft drop shadow (account-style floating capsule). */
  floating?: boolean;
}

const SIZE_STYLES = {
  sm: { height: 36, fontSize: 13, paddingHorizontal: 14 },
  md: { height: 48, fontSize: 15, paddingHorizontal: 20 },
  lg: { height: 52, fontSize: 16, paddingHorizontal: 24 },
} as const;

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  size = 'md',
  variant = 'filled',
  leftIcon,
  floating = false,
}: PrimaryButtonProps) {
  const s = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === 'filled' ? COLORS.primary : 'transparent';
  const borderWidth = variant === 'outline' ? 1.5 : 0;
  const borderColor = variant === 'outline' ? COLORS.primary : 'transparent';
  const textColor = variant === 'filled' ? COLORS.textOnPrimary : COLORS.primary;

  return (
    <Pressable
      // NativeWind replaces Pressable; without this, `style` (background, etc.) may not apply.
      {...{ cssInterop: false }}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => ({
        height: s.height,
        paddingHorizontal: s.paddingHorizontal,
        borderRadius: RADIUS.circle,
        backgroundColor,
        borderWidth,
        borderColor,
        width: fullWidth ? '100%' : undefined,
        alignSelf: fullWidth ? 'stretch' : undefined,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: disabled ? 0.5 : pressed && !isDisabled ? 0.92 : 1,
        ...(floating ? SHADOW.pill : {}),
      })}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {leftIcon ?? null}
          <Text
            style={{
              fontSize: s.fontSize,
              fontWeight: FONT.bold,
              color: textColor,
            }}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
