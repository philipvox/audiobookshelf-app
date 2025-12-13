/**
 * src/shared/hooks/useResponsive.ts
 *
 * Responsive design system based on 402pt design canvas
 * All measurements scale proportionally to device width
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DESIGN_WIDTH = 402;
const DESIGN_HEIGHT = 874;

// =============================================================================
// CORE SCALE FUNCTIONS
// =============================================================================

/** Scale a value proportionally to screen width (base: 402pt design canvas) */
export const scale = (size: number) => (size / DESIGN_WIDTH) * SCREEN_WIDTH;

/** Width-percentage: returns X% of screen width */
export const wp = (percent: number) => SCREEN_WIDTH * (percent / 100);

/** Height-percentage: returns X% of screen height */
export const hp = (percent: number) => SCREEN_HEIGHT * (percent / 100);

/** Scale for vertical measurements relative to design height */
export const verticalScale = (size: number) => (size / DESIGN_HEIGHT) * SCREEN_HEIGHT;

/**
 * Moderate scale for text - doesn't scale as aggressively
 * Factor 0 = no scaling, 1 = full scaling
 */
export const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

// =============================================================================
// LAYOUT CONSTANTS (as percentages/ratios)
// =============================================================================

export const LAYOUT = {
  // Screen dimensions
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,

  // Disc sizes as percentage of screen width
  homeDiscRatio: 0.70,      // 70% of screen width
  playerDiscRatio: 0.95,    // 95% of screen width
  discHoleRatio: 0.18,      // 18% of disc diameter

  // Spacing as percentage of screen width
  horizontalPadding: 0.055,  // 5.5% (~22px on 402)
  sectionGap: 0.04,          // 4% (~16px on 402)
  itemGap: 0.03,             // 3% (~12px on 402)

  // Card dimensions as percentage of screen width
  compactCard: 0.24,         // 24% (~95px on 402)
  coverThumb: 0.12,          // 12% (~48px on 402)

  // Mini player as percentage of screen height
  miniPlayerHeight: 0.075,   // 7.5% (~65px on 874)

  // Bottom nav as percentage of screen height
  bottomNavHeight: 0.094,    // 9.4% (~82px on 874)

  // Pill controls as percentage of screen width
  pillHeight: 0.077,         // 7.7% (~31px on 402)
  pillBorderRadius: 0.035,   // 3.5% (~14px on 402)

  // Border radii as ratio of parent element
  cardRadius: 0.08,          // 8% of card size
  coverRadius: 0.125,        // 12.5% of cover size

  // Minimum touch target (iOS HIG / Android Material)
  minTouchTarget: 44,
};

// =============================================================================
// COMPUTED DIMENSIONS
// =============================================================================

export const DIMENSIONS = {
  // Disc sizes
  homeDiscSize: wp(70),
  playerDiscSize: wp(95),

  // Padding
  horizontalPadding: wp(5.5),
  sectionGap: wp(4),
  itemGap: wp(3),

  // Cards
  compactCardSize: wp(24),
  coverThumbSize: wp(12),

  // Mini player
  miniPlayerHeight: hp(7.5),
  bottomNavHeight: hp(9.4),

  // Pills
  pillHeight: wp(7.7),
  pillBorderRadius: wp(3.5),
};

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const TYPOGRAPHY = {
  title: moderateScale(17),
  subtitle: moderateScale(15),
  sectionHeader: moderateScale(16),
  body: moderateScale(14),
  caption: moderateScale(12),
  small: moderateScale(11),
  tiny: moderateScale(8),
};

// =============================================================================
// SPACING SCALE
// =============================================================================

export const SPACING = {
  xs: wp(1),      // ~4px
  sm: wp(2),      // ~8px
  md: wp(3),      // ~12px
  lg: wp(4),      // ~16px
  xl: wp(5),      // ~20px
  xxl: wp(6),     // ~24px
};

// =============================================================================
// COLORS
// =============================================================================

export const COLORS = {
  // Primary accent
  accent: '#F4B60C',
  accentDark: '#D9A00A',

  // Backgrounds
  background: '#000000',
  cardBackground: 'rgba(255, 255, 255, 0.05)',
  cardBackgroundHover: 'rgba(255, 255, 255, 0.08)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.5)',
  textMuted: 'rgba(255, 255, 255, 0.3)',

  // Borders
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.08)',

  // States
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
};

// =============================================================================
// HOOK (for components that need reactive updates)
// =============================================================================

export function useResponsive() {
  return {
    // Screen dimensions
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,

    // Scale functions
    scale,
    wp,
    hp,
    verticalScale,
    moderateScale,

    // Pre-computed values
    layout: LAYOUT,
    dimensions: DIMENSIONS,
    typography: TYPOGRAPHY,
    spacing: SPACING,
    colors: COLORS,
  };
}

export default useResponsive;
