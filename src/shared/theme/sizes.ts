/**
 * Size design tokens
 * Standardized component dimensions for consistency
 */

import { wp, hp } from './spacing';

// =============================================================================
// COVER IMAGE SIZES
// =============================================================================

/** Standardized cover image sizes */
export const coverSizes = {
  /** Hero section, full player (50% screen width) */
  hero: wp(50),
  /** Standard card cover (24% screen width, ~96px) */
  card: wp(24),
  /** Row item cover (12% screen width, ~48px) */
  row: wp(12),
  /** Mini player cover (6% screen height, ~52px) */
  mini: hp(6),
} as const;

// =============================================================================
// ICON SIZES
// =============================================================================

/** Icon size scale */
export const iconSizes = {
  xs: 12,   // Badges, indicators
  sm: 16,   // Inline icons, secondary
  md: 20,   // Default, buttons, list items
  lg: 24,   // Headers, primary actions
  xl: 32,   // Feature icons
  xxl: 48,  // Empty states
  xxxl: 64, // Hero empty states
} as const;

// =============================================================================
// BUTTON SIZES
// =============================================================================

/** Button height scale */
export const buttonSizes = {
  sm: 36,
  md: 44,  // Minimum touch target
  lg: 56,
} as const;

// =============================================================================
// PROGRESS INDICATOR SIZES
// =============================================================================

/** Progress bar heights */
export const progressSizes = {
  /** Mini player progress (very thin) */
  mini: hp(0.3),
  /** Standard progress bar */
  standard: 4,
  /** Large progress bar (player scrubber) */
  large: 8,
} as const;

// =============================================================================
// COMBINED SIZES EXPORT
// =============================================================================

/** All size tokens combined */
export const sizes = {
  // Covers
  coverHero: coverSizes.hero,
  coverCard: coverSizes.card,
  coverRow: coverSizes.row,
  coverMini: coverSizes.mini,

  // Icons
  iconXs: iconSizes.xs,
  iconSm: iconSizes.sm,
  iconMd: iconSizes.md,
  iconLg: iconSizes.lg,
  iconXl: iconSizes.xl,
  iconXxl: iconSizes.xxl,
  iconXxxl: iconSizes.xxxl,

  // Buttons
  buttonSm: buttonSizes.sm,
  buttonMd: buttonSizes.md,
  buttonLg: buttonSizes.lg,

  // Progress
  progressHeightMini: progressSizes.mini,
  progressHeightStandard: progressSizes.standard,
  progressHeightLarge: progressSizes.large,

  // Avatar sizes
  avatarSm: 36,
  avatarMd: 48,
  avatarLg: 64,
} as const;

// =============================================================================
// CARD TOKENS
// =============================================================================

/** Standardized card sizes and patterns */
export const cardTokens = {
  /** Cover sizes by context */
  cover: {
    listRow: 64,     // BookCard covers (was 56)
    preview: 100,    // Card previews with info
    grid: 120,       // Grid view cards
    hero: 200,       // Featured/hero cards
  },

  /** Avatar sizes by context */
  avatar: {
    listRow: 48,     // Inline rows
    grid: 80,        // Grid cards (EntityCard)
    detail: 120,     // Detail screens
  },

  /** Stacked covers for series/collections */
  stackedCovers: {
    size: 60,         // Fanned cover base size
    sizeSmall: 32,    // Compact variant (rows)
    sizeLarge: 56,    // Large variant
    maxCount: 5,      // Max visible covers
    offset: 18,       // Horizontal offset between covers
    rotation: 8,      // Fan rotation in degrees
  },

  /** Progress dots */
  progressDots: {
    size: 6,
    gap: 4,
    maxDots: 5,
  },

  /** Row heights */
  rowHeight: {
    compact: 64,      // Single line with cover
    standard: 80,     // Two lines with cover (BookCard)
    expanded: 100,    // Three lines or extra info
    settings: 56,     // Settings rows
    chapter: 48,      // Chapter rows
  },

  /** Card aspect ratios (width:height) */
  aspectRatio: {
    book: 0.67,       // 2:3 portrait
    square: 1,        // 1:1 square
    wide: 1.5,        // 3:2 landscape
  },
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Sizes = typeof sizes;
export type SizeKey = keyof typeof sizes;
export type CoverSizeKey = keyof typeof coverSizes;
export type IconSizeKey = keyof typeof iconSizes;
export type CardTokens = typeof cardTokens;
