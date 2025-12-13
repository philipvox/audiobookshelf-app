/**
 * Spacing design tokens - Responsive layout system
 * Based on 402pt design canvas with proportional scaling
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Design canvas dimensions (Figma base) */
export const DESIGN_WIDTH = 402;
export const DESIGN_HEIGHT = 874;

// =============================================================================
// CORE SCALE FUNCTIONS
// =============================================================================

/** Scale a value proportionally to screen width (base: 402pt design canvas) */
export const scale = (size: number): number => (size / DESIGN_WIDTH) * SCREEN_WIDTH;

/** Width-percentage: returns X% of screen width */
export const wp = (percent: number): number => SCREEN_WIDTH * (percent / 100);

/** Height-percentage: returns X% of screen height */
export const hp = (percent: number): number => SCREEN_HEIGHT * (percent / 100);

/** Scale for vertical measurements relative to design height */
export const verticalScale = (size: number): number => (size / DESIGN_HEIGHT) * SCREEN_HEIGHT;

/**
 * Moderate scale for text - doesn't scale as aggressively
 * @param size Base size in points
 * @param factor Scaling intensity (0-1, default 0.5)
 */
export const moderateScale = (size: number, factor = 0.5): number =>
  size + (scale(size) - size) * factor;

// =============================================================================
// SPACING TOKENS
// =============================================================================

/** Semantic spacing scale (8pt grid with 2pt/4pt micro-steps) */
export const spacing = {
  xxs: 2,   // Icon to label gap
  xs: 4,    // Tight groupings, icon padding
  sm: 8,    // Related items, button padding
  md: 12,   // Default component gap
  lg: 16,   // Section internal padding
  xl: 20,   // Screen horizontal padding
  xxl: 24,  // Major element separation
  '3xl': 32,  // Section separation
  '4xl': 40,  // Major section separation
  '5xl': 48,  // Screen-level separation
} as const;

// =============================================================================
// LAYOUT CONSTANTS
// =============================================================================

/** Layout constants for consistent page structure */
export const layout = {
  // Screen padding
  screenPaddingH: 20,
  screenPaddingV: 24,

  // Section spacing
  sectionGap: 24,
  componentGap: 16,
  itemGap: 12,

  // Touch targets (Apple HIG / Material minimum)
  minTouchTarget: 44,
  comfortableTouchTarget: 48,
  largeTouchTarget: 56,

  // Navigation heights (percentage-based for responsiveness)
  bottomNavHeight: hp(9.4),
  miniPlayerHeight: hp(8),
  topNavHeight: 8,

  // Disc sizes (percentage of screen width)
  homeDiscRatio: 0.70,
  playerDiscRatio: 0.95,
  discHoleRatio: 0.18,

  // Card dimensions
  compactCardRatio: 0.24,  // 24% of screen width
  coverThumbRatio: 0.12,   // 12% of screen width

  // Pill controls
  pillHeight: wp(7.7),
  pillBorderRadius: wp(3.5),

  // Max content width for tablets
  maxContentWidth: 600,
} as const;

// =============================================================================
// BORDER RADII
// =============================================================================

/** Border radius tokens */
export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  // Component-specific
  cover: 6,
  card: 12,
  button: 12,
  chip: 16,
  bottomSheet: 20,
  full: 9999, // Pill shape
} as const;

// =============================================================================
// ELEVATION / SHADOWS
// =============================================================================

/** Elevation shadows for dark mode */
export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  // Glow effect for accent elements
  glow: {
    shadowColor: '#F3B60C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type SpacingKey = keyof typeof spacing;
export type RadiusKey = keyof typeof radius;
export type ElevationKey = keyof typeof elevation;
export type LayoutKey = keyof typeof layout;
