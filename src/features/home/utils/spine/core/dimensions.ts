/**
 * src/features/home/utils/spine/core/dimensions.ts
 *
 * Core dimension calculations for book spines.
 * Width = duration-based (linear scaling)
 * Height = genre-based with variation
 */

import { BASE_DIMENSIONS, WIDTH_CALCULATION, TOUCH_TARGETS, SPINE_SCALES, SpineContext } from '../constants';
import { hashString, seededRandom } from './hashing';

// =============================================================================
// TYPES
// =============================================================================

/** Base dimensions before scaling */
export interface BaseDimensions {
  width: number;
  height: number;
}

/** Scaled dimensions for specific context */
export interface ScaledDimensions extends BaseDimensions {
  context: SpineContext;
  scaleFactor: number;
  touchPadding: number;
}

/** Complete spine dimensions with all metadata */
export interface CompleteDimensions {
  base: BaseDimensions;
  scaled: ScaledDimensions;
  aspectRatio: number;
}

// =============================================================================
// WIDTH CALCULATION (Duration-based)
// =============================================================================

/**
 * Calculate spine width from audiobook duration using EASE-OUT curve.
 *
 * Uses a quadratic ease-out curve for better visual differentiation:
 * - Steeper growth in the common 1-15 hour range (most audiobooks)
 * - Gradual flattening for longer books (20-50 hours)
 *
 * This makes short/medium books more distinguishable from each other,
 * while epic books still look impressively thick without dominating.
 *
 * Example widths:
 * - 1 hour: 44px (minimum)
 * - 5 hours: ~89px (typical novel)
 * - 10 hours: ~129px (long novel)
 * - 15 hours: ~163px
 * - 20 hours: ~195px
 * - 30 hours: ~242px
 * - 40 hours: ~270px
 * - 50 hours: 280px (maximum)
 *
 * @param duration - Duration in seconds (undefined = median fallback)
 * @returns Width in pixels
 */
export function calculateWidth(duration: number | undefined): number {
  // Fallback for unknown duration
  if (duration === undefined || duration === null || duration <= 0) {
    return WIDTH_CALCULATION.MEDIAN;
  }

  const hours = duration / 3600;

  // Clamp to min/max
  if (hours <= WIDTH_CALCULATION.MIN_DURATION_HOURS) {
    return WIDTH_CALCULATION.MIN;
  }

  if (hours >= WIDTH_CALCULATION.MAX_DURATION_HOURS) {
    return WIDTH_CALCULATION.MAX;
  }

  // Ease-out quadratic curve: rapid growth early, gradual flattening later
  // Formula: easedRatio = 1 - (1 - ratio)^2
  // This gives more visual differentiation in the 1-15 hour range
  const ratio = (hours - WIDTH_CALCULATION.MIN_DURATION_HOURS) /
    (WIDTH_CALCULATION.MAX_DURATION_HOURS - WIDTH_CALCULATION.MIN_DURATION_HOURS);
  const easedRatio = 1 - Math.pow(1 - ratio, 2);

  const width = WIDTH_CALCULATION.MIN +
    (WIDTH_CALCULATION.MAX - WIDTH_CALCULATION.MIN) * easedRatio;

  return Math.round(width);
}

// =============================================================================
// HEIGHT CALCULATION (Genre + Variation)
// =============================================================================

/**
 * Normalize series name for consistent hashing.
 * Removes sequence numbers so all books in series hash to same value.
 *
 * Examples:
 * - "The Expanse #1" → "the expanse"
 * - "Stormlight Archive #3.5" → "stormlight archive"
 * - "The Lord of the Rings" → "lord of the rings"
 */
function normalizeSeriesName(seriesName: string): string {
  return seriesName
    .toLowerCase()
    .trim()
    .replace(/\s*#[\d.]+$/, '')       // Remove trailing #N or #N.N
    .replace(/^(the|a|an)\s+/i, '')   // Remove leading articles
    .replace(/['']/g, "'")            // Normalize apostrophes
    .replace(/\s+/g, ' ')             // Normalize whitespace
    .trim();
}

/**
 * Genre-specific height profiles.
 * Each genre has a base height that reflects its typical spine height.
 */
export const GENRE_HEIGHT_PROFILES = {
  // Tall, epic genres
  'fantasy': 400,
  'epic-fantasy': 420,
  'historical-fiction': 380,
  'classics': 400,

  // Medium-tall genres
  'science-fiction': 370,
  'thriller': 330,
  'mystery': 320,
  'biography': 370,
  'history': 390,

  // Medium genres
  'romance': 290,
  'contemporary-fiction': 310,
  'literary-fiction': 380,
  'non-fiction': 330,

  // Short genres
  'poetry': 260,
  'short-stories': 300,
  'essays': 310,
  'humor': 270,

  // Children's (age-banded)
  'children-0-2': 180,
  'children-3-5': 210,
  'children-6-8': 250,
  'children-9-12': 290,
  'young-adult': 340,
} as const;

/**
 * Calculate spine height based on genre with deterministic variation.
 *
 * SERIES LOCKING: Books in the same series share the same height for visual consistency.
 * This is achieved by hashing seriesName instead of bookId when series is present.
 *
 * @param genreProfile - Genre profile name (normalized)
 * @param bookId - Book ID for deterministic variation
 * @param seriesName - Optional series name for height locking
 * @returns Height in pixels
 */
export function calculateHeight(
  genreProfile: string | undefined,
  bookId: string,
  seriesName?: string
): number {
  // SERIES LOCKING: Use normalized series name for hash if available
  // This ensures all books in same series get same height
  // Normalization removes sequence numbers: "Expanse #1" and "Expanse #2" → "expanse"
  const hashKey = seriesName ? normalizeSeriesName(seriesName) : (bookId || 'default');
  const hash = hashString(hashKey);

  // Get base height from genre profile
  let baseHeight = BASE_DIMENSIONS.HEIGHT;
  if (genreProfile && genreProfile in GENRE_HEIGHT_PROFILES) {
    baseHeight = GENRE_HEIGHT_PROFILES[genreProfile as keyof typeof GENRE_HEIGHT_PROFILES];
  }

  // Add deterministic variation (±12% of base height)
  const variationRange = Math.floor(baseHeight * 0.12);
  const variation = seededRandom(hash, -variationRange, variationRange);

  const finalHeight = baseHeight + variation;

  // Clamp to valid range
  return Math.max(
    BASE_DIMENSIONS.MIN_HEIGHT,
    Math.min(BASE_DIMENSIONS.MAX_HEIGHT, finalHeight)
  );
}

// =============================================================================
// TOUCH PADDING
// =============================================================================

/**
 * Calculate horizontal padding needed to meet minimum touch target.
 * Required by Apple HIG and Material Design (44dp minimum).
 *
 * @param spineWidth - Current spine width
 * @returns Padding needed on each side (0 if already wide enough)
 */
export function calculateTouchPadding(spineWidth: number): number {
  const deficit = TOUCH_TARGETS.MIN - spineWidth;
  return Math.max(0, Math.ceil(deficit / 2));
}

// =============================================================================
// SCALING
// =============================================================================

/**
 * Scale base dimensions for specific display context.
 *
 * @param base - Base dimensions
 * @param context - Display context (shelf, stack, card, detail)
 * @returns Scaled dimensions with touch padding
 */
export function scaleDimensions(
  base: BaseDimensions,
  context: SpineContext
): ScaledDimensions {
  const scaleFactor = SPINE_SCALES[context];

  const scaledWidth = Math.round(base.width * scaleFactor);
  const scaledHeight = Math.round(base.height * scaleFactor);

  return {
    width: scaledWidth,
    height: scaledHeight,
    context,
    scaleFactor,
    touchPadding: calculateTouchPadding(scaledWidth),
  };
}

// =============================================================================
// COMPLETE DIMENSIONS
// =============================================================================

/**
 * Calculate complete spine dimensions with base + scaled values.
 *
 * @param duration - Audiobook duration in seconds
 * @param genreProfile - Genre profile for height
 * @param bookId - Book ID for variation
 * @param context - Display context
 * @param seriesName - Optional series name for height locking
 * @returns Complete dimensions with metadata
 */
export function calculateCompleteDimensions(
  duration: number | undefined,
  genreProfile: string | undefined,
  bookId: string,
  context: SpineContext,
  seriesName?: string
): CompleteDimensions {
  const base: BaseDimensions = {
    width: calculateWidth(duration),
    height: calculateHeight(genreProfile, bookId, seriesName),
  };

  const scaled = scaleDimensions(base, context);

  return {
    base,
    scaled,
    aspectRatio: base.height / base.width,
  };
}

// =============================================================================
// HELPER UTILITIES
// =============================================================================

/**
 * Check if spine is "thin" and needs special handling.
 */
export function isThinSpine(width: number): boolean {
  return width < TOUCH_TARGETS.MIN_THICKNESS;
}

/**
 * Check if spine is "thick" (long audiobook).
 */
export function isThickSpine(width: number): boolean {
  return width > 150;
}

/**
 * Get human-readable duration description from width.
 */
export function widthToDuration(width: number): string {
  if (width <= 30) return 'Under 3 hours';
  if (width <= 60) return '3-10 hours';
  if (width <= 100) return '10-20 hours';
  if (width <= 150) return '20-35 hours';
  return 'Over 35 hours';
}
