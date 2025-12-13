/**
 * Typography design tokens
 * Semantic text styles with responsive scaling via moderateScale
 */

import { TextStyle } from 'react-native';
import { moderateScale } from './spacing';

// =============================================================================
// TYPOGRAPHY TOKENS
// =============================================================================

/** Semantic typography styles using moderateScale for responsive text */
export const typography = {
  // Display styles (screen titles, hero text)
  displayLarge: {
    fontSize: moderateScale(28),
    fontWeight: '700' as const,
    lineHeight: moderateScale(34),
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontSize: moderateScale(22),
    fontWeight: '700' as const,
    lineHeight: moderateScale(28),
    letterSpacing: -0.5,
  },
  displaySmall: {
    fontSize: moderateScale(18),
    fontWeight: '600' as const,
    lineHeight: moderateScale(24),
    letterSpacing: -0.3,
  },

  // Headline styles (section headers, card titles)
  headlineLarge: {
    fontSize: moderateScale(17),
    fontWeight: '600' as const,
    lineHeight: moderateScale(22),
    letterSpacing: -0.3,
  },
  headlineMedium: {
    fontSize: moderateScale(15),
    fontWeight: '600' as const,
    lineHeight: moderateScale(20),
  },
  headlineSmall: {
    fontSize: moderateScale(14),
    fontWeight: '600' as const,
    lineHeight: moderateScale(18),
  },

  // Body styles (paragraphs, descriptions)
  bodyLarge: {
    fontSize: moderateScale(16),
    fontWeight: '400' as const,
    lineHeight: moderateScale(24),
  },
  bodyMedium: {
    fontSize: moderateScale(14),
    fontWeight: '400' as const,
    lineHeight: moderateScale(20),
  },
  bodySmall: {
    fontSize: moderateScale(12),
    fontWeight: '400' as const,
    lineHeight: moderateScale(16),
  },

  // Label styles (buttons, tags, metadata)
  labelLarge: {
    fontSize: moderateScale(14),
    fontWeight: '500' as const,
    lineHeight: moderateScale(20),
  },
  labelMedium: {
    fontSize: moderateScale(12),
    fontWeight: '500' as const,
    lineHeight: moderateScale(16),
  },
  labelSmall: {
    fontSize: moderateScale(11),
    fontWeight: '500' as const,
    lineHeight: moderateScale(14),
  },

  // Caption (timestamps, tertiary info)
  caption: {
    fontSize: moderateScale(10),
    fontWeight: '400' as const,
    lineHeight: moderateScale(14),
  },

  // Time display (monospace for player timestamps)
  timestamp: {
    fontSize: moderateScale(12),
    fontWeight: '500' as const,
    lineHeight: moderateScale(16),
    fontFamily: 'SpaceMono',
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
  },
} as const;

// =============================================================================
// FONT SIZE PRIMITIVES (for custom combinations)
// =============================================================================

/** Raw font sizes (use typography styles when possible) */
export const fontSize = {
  xs: moderateScale(10),
  sm: moderateScale(12),
  base: moderateScale(14),
  md: moderateScale(16),
  lg: moderateScale(18),
  xl: moderateScale(20),
  '2xl': moderateScale(22),
  '3xl': moderateScale(28),
  '4xl': moderateScale(32),
  '5xl': moderateScale(36),
} as const;

/** Font weight values */
export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

/** Line height multipliers */
export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.6,
};

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Typography = typeof typography;
export type TypographyKey = keyof typeof typography;
export type FontSizeKey = keyof typeof fontSize;
export type FontWeightKey = keyof typeof fontWeight;
