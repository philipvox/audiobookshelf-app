/**
 * src/features/home/utils/spine/composition/generator.ts
 *
 * Generates deterministic spine compositions from genre profiles.
 * Each book gets a unique layout based on its ID hash, with smart constraints.
 */

import { hashString, pickFromHash, hashToPercent } from '../core/hashing';
import { getCompositionProfile } from './profiles';
import { getGenreProfile } from '../genre/profiles';
import {
  SpineComposition,
  CompositionTitleOrientation,
  CompositionAuthorOrientation,
} from './types';

// =============================================================================
// COMPOSITION GENERATION
// =============================================================================

export interface CompositionContext {
  bookId: string;
  title: string;
  author: string;
  genreProfile: string;
  spineWidth?: number;      // Actual spine width in pixels
  seriesName?: string;      // For series consistency
}

/**
 * Generate complete spine composition for a book.
 *
 * Uses deterministic hashing to pick from genre's valid options,
 * with smart constraints based on title/author length and spine width.
 *
 * @param context - Book context with title, author, dimensions
 * @returns Complete composition configuration
 */
export function generateComposition(
  bookId: string,
  genreProfile: string = 'default',
  title?: string,
  author?: string,
  spineWidth?: number
): SpineComposition {
  const profile = getCompositionProfile(genreProfile);
  const hash = hashString(bookId);

  // Pick title options from profile arrays
  // Use different offsets for each property to ensure variety
  let titleOrientation = pickFromHash(profile.titleOrientations, hash, 0);
  const titleScale = pickFromHash(profile.titleScales, hash, 1);
  const titleWeight = pickFromHash(profile.titleWeights, hash, 2);
  const titleCase = pickFromHash(profile.titleCases, hash, 3);

  // Pick author options
  let authorOrientation = pickFromHash(profile.authorOrientations, hash, 6);
  const authorTreatment = pickFromHash(profile.authorTreatments, hash, 7);
  const authorScale = pickFromHash(profile.authorScales, hash, 8);

  // Pick layout options
  const density = pickFromHash(profile.densities, hash, 10);
  const alignment = pickFromHash(profile.alignments, hash, 11);

  // Pick decoration options
  const lineStyle = pickFromHash(profile.lineStyles, hash, 12);
  const decorativeElement = pickFromHash(profile.decorativeElements, hash, 13);

  // ═══════════════════════════════════════════════════════════════════════════
  // SMART TITLE ORIENTATION CONSTRAINTS
  // ═══════════════════════════════════════════════════════════════════════════

  if (title && titleOrientation !== 'horizontal') {
    const shouldBeVertical = shouldTitleBeVertical(title);

    if (__DEV__) {
      console.log(`[Composition] "${title}" (${title.length} chars) - Picked: ${titleOrientation}, ShouldBeVertical: ${shouldBeVertical}`);
    }

    if (!shouldBeVertical) {
      // Override: Force horizontal for tiny titles
      titleOrientation = 'horizontal';
      if (__DEV__) {
        console.log(`[Composition] ✋ BLOCKED rotation for "${title}" - forcing horizontal`);
      }
    } else if (titleOrientation === 'stacked-letters' || titleOrientation === 'stacked-words') {
      // Override: Convert stacked to regular vertical for longer titles
      // Stacked is only appropriate for very short titles
      const isTooLongForStacking = title.trim().length > 8;
      if (isTooLongForStacking) {
        const oldOrientation = titleOrientation;
        titleOrientation = 'vertical-up';  // Convert to regular vertical rotation
        if (__DEV__) {
          console.log(`[Composition] 🔄 Converted ${oldOrientation} → vertical-up for "${title}" (too long for stacking)`);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SMART AUTHOR ORIENTATION CONSTRAINTS
  // ═══════════════════════════════════════════════════════════════════════════

  // Resolve relative author orientations first
  authorOrientation = resolveAuthorOrientation(
    authorOrientation,
    titleOrientation
  );

  // Check if long author name on thin spine
  if (author && spineWidth) {
    const authorTooLong = isAuthorTooLongForHorizontal(author, spineWidth);

    if (authorTooLong && authorOrientation === 'horizontal') {
      // Override: Force vertical for long names on thin spines
      authorOrientation = 'vertical-up';
    }
  }

  // Calculate letter spacing based on genre personality
  let letterSpacing = 0.02; // Default 2%
  if (profile.prefersExperimental) {
    letterSpacing += 0.02; // +2% for experimental
  }
  if (profile.prefersMinimal) {
    letterSpacing += 0.01; // +1% for minimal
  }
  if (profile.prefersBold) {
    letterSpacing += 0.01; // +1% for bold (needs breathing room)
  }

  // Weight mapping
  const authorWeight = titleWeight;

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHOR POSITION FROM GENRE PROFILE
  // ═══════════════════════════════════════════════════════════════════════════

  // Get author position from genre typography profile
  const genreTypography = getGenreProfile(genreProfile);
  const baseAuthorPosition = genreTypography.typography.layout.authorPosition;

  // Add some variation: 70% use genre default, 30% use opposite
  const shouldFlipPosition = hashToPercent(`${bookId}-author-pos`) < 30;
  const authorPosition = shouldFlipPosition
    ? (baseAuthorPosition === 'top' ? 'bottom' : 'top')
    : baseAuthorPosition;

  return {
    title: {
      orientation: titleOrientation,
      scale: titleScale,
      weight: titleWeight,
      case: titleCase,
      letterSpacing,
    },
    author: {
      orientation: authorOrientation,
      treatment: authorTreatment,
      scale: authorScale,
      weight: authorWeight,
    },
    layout: {
      density,
      alignment,
      authorPosition,
    },
    decoration: {
      lineStyle,
      element: decorativeElement,
    },
  };
}

// =============================================================================
// SMART CONSTRAINT LOGIC
// =============================================================================

/**
 * Determine if a title should be vertical based on length and word structure.
 *
 * DEFAULT: Titles should be VERTICAL (rotated)
 * EXCEPTION: Force HORIZONTAL only for:
 * 1. Very short titles (≤3 characters) - e.g., "WAR", "IT", "SHE"
 * 2. Multi-word titles where ALL words are ≤3 characters - e.g., "YES WE CAN", "DO NO HARM"
 *
 * This means most regular titles like "OATHBRINGER", "THE FELLOWSHIP OF THE RING" will rotate.
 *
 * @param title - Book title
 * @returns true if title should be vertical (rotated), false for horizontal
 */
function shouldTitleBeVertical(title: string): boolean {
  const cleaned = title.trim();

  // Case 1: Very short title (≤3 chars) → FORCE HORIZONTAL (exception)
  if (cleaned.length <= 3) {
    return false;  // Don't rotate "WAR", "IT", "SHE"
  }

  // Case 2: Multi-word where ALL words are ≤3 chars → FORCE HORIZONTAL (exception)
  const words = cleaned.split(/\s+/);

  if (words.length >= 2) {
    // Check if ALL words are 3 characters or less
    const allWordsVeryShort = words.every(word => word.length <= 3);

    // If all words are tiny, keep horizontal for readability
    // Examples: "YES WE CAN", "DO NO HARM", "GO FOR IT"
    if (allWordsVeryShort) {
      return false;  // Don't rotate multi-word short titles
    }
  }

  // Default: VERTICAL (rotate) - this includes "OATHBRINGER", "THIS INEVITABLE RUIN", etc.
  return true;
}

/**
 * Check if author name is too long for horizontal layout on thin spine.
 *
 * Long names on thin spines cause overflow and look cramped.
 * Better to rotate them vertical.
 *
 * @param author - Author name
 * @param spineWidth - Spine width in pixels
 * @returns true if name is too long for horizontal
 */
function isAuthorTooLongForHorizontal(author: string, spineWidth: number): boolean {
  const authorLength = author.trim().length;

  // Thin spine (< 40px): Long names (>15 chars) should be vertical
  if (spineWidth < 40 && authorLength > 15) {
    return true;
  }

  // Medium spine (40-60px): Very long names (>20 chars) should be vertical
  if (spineWidth < 60 && authorLength > 20) {
    return true;
  }

  // Narrow spine (60-80px): Extremely long names (>25 chars) should be vertical
  if (spineWidth < 80 && authorLength > 25) {
    return true;
  }

  return false;
}

// =============================================================================
// ORIENTATION RESOLUTION
// =============================================================================

/**
 * Resolve relative author orientations (match-title, oppose-title).
 *
 * @param authorOrientation - Author orientation (may be relative)
 * @param titleOrientation - Title orientation (absolute)
 * @returns Absolute author orientation
 */
function resolveAuthorOrientation(
  authorOrientation: CompositionAuthorOrientation,
  titleOrientation: CompositionTitleOrientation
): CompositionAuthorOrientation {
  // If author orientation is absolute, return as-is
  if (
    authorOrientation === 'horizontal' ||
    authorOrientation === 'vertical-up' ||
    authorOrientation === 'vertical-down'
  ) {
    return authorOrientation;
  }

  // Resolve 'match-title'
  if (authorOrientation === 'match-title') {
    switch (titleOrientation) {
      case 'horizontal':
      case 'stacked-words':
      case 'stacked-letters':
        return 'horizontal';
      case 'vertical-up':
        return 'vertical-up';
      case 'vertical-down':
        return 'vertical-down';
    }
  }

  // Resolve 'oppose-title' (opposite rotation)
  if (authorOrientation === 'oppose-title') {
    switch (titleOrientation) {
      case 'vertical-up':
        return 'vertical-down';
      case 'vertical-down':
        return 'vertical-up';
      case 'horizontal':
      case 'stacked-words':
      case 'stacked-letters':
        // Horizontal titles get vertical author for contrast
        return 'vertical-up';
    }
  }

  // Fallback
  return 'horizontal';
}

// =============================================================================
// AUTHOR POSITION LOGIC
// =============================================================================

/**
 * Determine author position (top or bottom) based on genre profile.
 * This should be extracted from the typography profile's authorPosition.
 *
 * For now, this is handled by the typography system in genre profiles.
 * The composition system focuses on orientation/treatment.
 */

// =============================================================================
// COMPOSITION UTILITIES
// =============================================================================

/**
 * Check if a composition uses vertical title orientation.
 */
export function isVerticalTitle(composition: SpineComposition): boolean {
  return (
    composition.title.orientation === 'vertical-up' ||
    composition.title.orientation === 'vertical-down' ||
    composition.title.orientation === 'stacked-letters'
  );
}

/**
 * Check if a composition uses vertical author orientation.
 */
export function isVerticalAuthor(composition: SpineComposition): boolean {
  return (
    composition.author.orientation === 'vertical-up' ||
    composition.author.orientation === 'vertical-down'
  );
}

/**
 * Get rotation angle for title orientation.
 * Returns degrees (0, 90, -90).
 */
export function getTitleRotation(orientation: CompositionTitleOrientation): number {
  switch (orientation) {
    case 'vertical-up':
      return -90; // Rotate CCW
    case 'vertical-down':
      return 90; // Rotate CW
    case 'horizontal':
    case 'stacked-words':
    case 'stacked-letters':
    default:
      return 0;
  }
}

/**
 * Get rotation angle for author orientation.
 */
export function getAuthorRotation(orientation: CompositionAuthorOrientation): number {
  switch (orientation) {
    case 'vertical-up':
      return -90;
    case 'vertical-down':
      return 90;
    case 'horizontal':
    default:
      return 0;
  }
}
