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
  spacing,
  radius,
  typography,
  elevation,
  scale,
  useTheme,
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
  const { colors } = useTheme();
  const accentColor = colors.accent.primary;
  const textOnAccent = colors.accent.textOnAccent;
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (!noHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  // Get variant-specific colors
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: accentColor,
          borderColor: 'transparent',
          textColor: textOnAccent,
        };
      case 'secondary':
        return {
          backgroundColor: colors.background.elevated,
          borderColor: colors.border.default,
          textColor: colors.text.primary,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: accentColor,
          textColor: accentColor,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textColor: accentColor,
        };
      case 'danger':
        return {
          backgroundColor: colors.semantic.error,
          borderColor: 'transparent',
          textColor: colors.text.inverse,
        };
      default:
        return {
          backgroundColor: accentColor,
          borderColor: 'transparent',
          textColor: textOnAccent,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const loaderColor = variant === 'primary' || variant === 'danger' ? textOnAccent : accentColor;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          borderWidth: variant === 'secondary' || variant === 'outline' ? 1 : 0,
        },
        (variant === 'primary' || variant === 'danger') && elevation.small,
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
          color={loaderColor}
          size="small"
        />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <Text
            style={[
              styles.text,
              styles[`${size}Text`],
              { color: variantStyles.textColor },
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

  // Sizes
  smallSize: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: scale(36),
  },
  mediumSize: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    minHeight: scale(44),
  },
  largeSize: {
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.lg,
    minHeight: scale(52),
  },

  // Text base
  text: {
    ...typography.labelLarge,
    fontWeight: '600',
    textAlign: 'center',
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
