/**
 * Icon system constants
 * Based on Lucide Icons with consistent sizing and colors
 */

import { colors } from '@/shared/theme';

// Icon sizes - use these for consistency
export const ICON_SIZES = {
  xs: 12,      // Badges, inline metadata
  sm: 16,      // Pills, compact UI
  md: 20,      // Default, cards
  lg: 24,      // Navigation, buttons
  xl: 32,      // Hero elements
  xxl: 48,     // Player transport
} as const;

// Default stroke weight for Lucide icons
export const ICON_STROKE_WIDTH = 2;

// Icon colors - derived from theme
export const ICON_COLORS = {
  primary: colors.textPrimary,           // #FFFFFF
  secondary: colors.textSecondary,       // rgba(255,255,255,0.7)
  accent: colors.accent,                 // #F3B60C
  muted: 'rgba(255, 255, 255, 0.5)',
  disabled: 'rgba(255, 255, 255, 0.3)',
  error: '#EF4444',
  success: '#22C55E',
  info: '#3B82F6',
} as const;

// Minimum touch target size (iOS/Android HIG)
export const MIN_TOUCH_TARGET = 44;

export type IconSize = keyof typeof ICON_SIZES;
export type IconColor = keyof typeof ICON_COLORS;
