/**
 * Icon-only button component with various sizes and variants
 * Includes haptic feedback for better tactile response
 */

import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, elevation, useTheme } from '../../theme';

type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type IconButtonSize = 'small' | 'medium' | 'large';

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  disabled?: boolean;
  loading?: boolean;
  rounded?: boolean;
  style?: ViewStyle;
  accessibilityLabel: string;
  /** Disable haptic feedback (default: enabled) */
  noHaptics?: boolean;
  /** Custom hit slop for touch area */
  hitSlop?: { top?: number; bottom?: number; left?: number; right?: number };
}

const SIZE_MAP = {
  small: { button: 32, icon: 16 },
  medium: { button: 44, icon: 20 },
  large: { button: 56, icon: 24 },
};

/**
 * Icon-only button for toolbars, actions, etc.
 */
export function IconButton({
  icon,
  onPress,
  variant = 'ghost',
  size = 'medium',
  disabled = false,
  loading = false,
  rounded = true,
  style,
  accessibilityLabel,
  noHaptics = false,
  hitSlop,
}: IconButtonProps) {
  const { colors: themeColors } = useTheme();
  const isDisabled = disabled || loading;
  const dimensions = SIZE_MAP[size];

  const handlePress = () => {
    if (!noHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  // Default hit slop for small buttons to ensure 44pt touch target
  const defaultHitSlop = size === 'small'
    ? { top: 6, bottom: 6, left: 6, right: 6 }
    : undefined;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        {
          width: dimensions.button,
          height: dimensions.button,
          borderRadius: rounded ? dimensions.button / 2 : radius.md,
        },
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      hitSlop={hitSlop || defaultHitSlop}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger'
            ? themeColors.text.inverse
            : themeColors.accent.primary}
          size={size === 'large' ? 'small' : 'small'}
        />
      ) : (
        icon
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  // Variants
  primary: {
    backgroundColor: colors.accent.primary,
    ...elevation.small,
  } as ViewStyle,
  secondary: {
    backgroundColor: colors.progressTrack,
    borderWidth: 1,
    borderColor: colors.border.light,
  } as ViewStyle,
  ghost: {
    backgroundColor: 'transparent',
  } as ViewStyle,
  danger: {
    backgroundColor: colors.error,
    ...elevation.small,
  } as ViewStyle,

  // States
  disabled: {
    opacity: 0.5,
  } as ViewStyle,
});
