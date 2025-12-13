/**
 * Animation design tokens
 * Consistent motion throughout the app
 */

// =============================================================================
// DURATION VALUES
// =============================================================================

/** Duration values in milliseconds */
export const duration = {
  instant: 100,
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
} as const;

// =============================================================================
// SPRING CONFIGURATIONS
// =============================================================================

/** Spring configurations for react-native-reanimated */
export const spring = {
  /** Snappy - buttons, toggles */
  snappy: {
    damping: 20,
    stiffness: 400,
    mass: 0.8,
  },
  /** Smooth - sheets, modals */
  smooth: {
    damping: 20,
    stiffness: 200,
    mass: 1,
  },
  /** Gentle - large elements */
  gentle: {
    damping: 25,
    stiffness: 120,
    mass: 1,
  },
  /** Bouncy - playful elements */
  bouncy: {
    damping: 12,
    stiffness: 200,
    mass: 0.8,
  },
} as const;

// =============================================================================
// EASING CURVES
// =============================================================================

/** Easing curve names (for use with Animated.timing) */
export const easing = {
  standard: 'ease-in-out',
  accelerate: 'ease-in',
  decelerate: 'ease-out',
  linear: 'linear',
} as const;

// =============================================================================
// COMBINED ANIMATION EXPORT
// =============================================================================

/** All animation tokens combined */
export const animation = {
  duration,
  spring,
  easing,
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Duration = typeof duration;
export type DurationKey = keyof typeof duration;
export type Spring = typeof spring;
export type SpringKey = keyof typeof spring;
