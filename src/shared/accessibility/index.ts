/**
 * Accessibility module exports.
 *
 * Provides utilities and hooks for building accessible React Native components.
 */

// Constants
export {
  MIN_TOUCH_TARGET,
  HIT_SLOP,
  LARGE_TEXT_THRESHOLD,
} from './accessibilityUtils';

// Types
export type {
  AccessibilityProps,
  ButtonAccessibilityOptions,
  SliderAccessibilityOptions,
  ProgressAccessibilityOptions,
} from './accessibilityUtils';

// Utility Functions
export {
  calculateHitSlop,
  buildButtonAccessibility,
  buildSliderAccessibility,
  buildProgressAccessibility,
  buildImageAccessibility,
  buildHeadingAccessibility,
  buildLinkAccessibility,
  buildToggleAccessibility,
  buildTabAccessibility,
  buildListItemAccessibility,
  formatTimeForAccessibility,
  formatProgressForAccessibility,
  buildBookDescription,
  checkColorContrast,
} from './accessibilityUtils';

// Hooks
export {
  useAccessibilityState,
  useScreenReader,
  useReduceMotion,
  useAnnounce,
  useAccessibilityFocus,
  useAnnounceScreen,
} from './useAccessibility';

export type { AccessibilityState } from './useAccessibility';
