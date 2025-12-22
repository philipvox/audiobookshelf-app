/**
 * Standard button component with variants and states
 *
 * Variants: primary, secondary, outline, ghost, danger
 * Sizes: small, medium, large
 * States: loading, disabled
 * Features: haptic feedback, optional icons
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  colors,
  spacing,
  radius,
  typography,
  elevation,
  scale,
} from '@/shared/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  /** Icon component to render on the left */
  leftIcon?: React.ReactNode;
  /** Icon component to render on the right */
  rightIcon?: React.ReactNode;
  /** Disable haptic feedback (default: enabled) */
  noHaptics?: boolean;
  /** Accessibility label override */
  accessibilityLabel?: string;
}

/**
 * Button component with consistent styling
 */
export function Button({
  onPress,
  title,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  leftIcon,
  rightIcon,
  noHaptics = false,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (!noHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const textColor = variant === 'primary' || variant === 'danger'
    ? colors.backgroundPrimary
    : variant === 'outline'
      ? colors.accent
      : colors.textPrimary;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[`${size}Size`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? colors.backgroundPrimary : colors.accent}
          size="small"
        />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <Text
            style={[
              styles.text,
              styles[`${variant}Text`],
              styles[`${size}Text`],
              isDisabled && styles.disabledText,
            ]}
          >
            {title}
          </Text>
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Base styles
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    borderWidth: 0,
  },

  // Content container for icon + text layout
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: scale(8),
  },
  rightIcon: {
    marginLeft: scale(8),
  },

  // Variants
  primary: {
    backgroundColor: colors.accent,
    ...elevation.small,
  },
  secondary: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.error,
    ...elevation.small,
  },

  // Sizes
  smallSize: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 36,
  },
  mediumSize: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  largeSize: {
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.lg,
    minHeight: 52,
  },

  // Text base
  text: {
    textAlign: 'center',
  },

  // Text variants
  primaryText: {
    ...typography.labelLarge,
    fontWeight: '600',
    color: colors.backgroundPrimary,
  },
  secondaryText: {
    ...typography.labelLarge,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  outlineText: {
    ...typography.labelLarge,
    fontWeight: '600',
    color: colors.accent,
  },
  ghostText: {
    ...typography.labelLarge,
    fontWeight: '600',
    color: colors.accent,
  },
  dangerText: {
    ...typography.labelLarge,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Text sizes
  smallText: {
    ...typography.labelMedium,
  },
  mediumText: {
    ...typography.labelLarge,
  },
  largeText: {
    ...typography.bodyLarge,
    fontWeight: '600',
  },

  // States
  disabled: {
    opacity: 0.5,
    ...elevation.none,
  },
  disabledText: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
});
