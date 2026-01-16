/**
 * src/features/home/hooks/useBookRowLayout.ts
 *
 * Reusable hook for calculating book row layouts.
 * Uses pre-calculated spine cache for dimensions.
 * Handles leaning logic and scaling on top of cached data.
 * Used by BookshelfView, SeriesSpineCard, and other book row displays.
 */

import { useMemo } from 'react';
import { BookSpineVerticalData } from '../components/BookSpineVertical';
// MIGRATED: Now using new spine system via adapter
import { calculateBookDimensions, hashString } from '../utils/spine/adapter';
import { useSpineCacheStore } from '../stores/spineCache';

// =============================================================================
// TYPES
// =============================================================================

export interface BookLayoutInfo {
  book: BookSpineVerticalData;
  width: number;
  height: number;
  leanAngle: number;
  shouldLean: boolean;
  touchPadding: number;
}

export interface UseBookRowLayoutOptions {
  /** Scale factor for dimensions (default: 1) */
  scaleFactor?: number;
  /** Width multiplier for spine thickness (default: 1) */
  thicknessMultiplier?: number;
  /** Lean angle in degrees (default: 3) */
  leanAngle?: number;
  /** Minimum touch target width in pixels (default: 44) */
  minTouchTarget?: number;
  /** Gap between books in pixels (default: 9) */
  bookGap?: number;
  /** Whether to apply leaning logic (default: true) */
  enableLeaning?: boolean;
  /** Fixed height for all books (overrides calculated height) */
  fixedHeight?: number;
}

// =============================================================================
// CONSTANTS - Conservative defaults to prevent oversized spines
// =============================================================================

const DEFAULT_SCALE = 0.95;  // Reduced from 1 to prevent clipping
const DEFAULT_THICKNESS_MULTIPLIER = 1.1;  // Reduced from 1.22 to prevent over-thickening
const DEFAULT_LEAN_ANGLE = 3;
const DEFAULT_MIN_TOUCH_TARGET = 44;
const DEFAULT_BOOK_GAP = 9;
const DEFAULT_DURATION = 6 * 60 * 60; // 6 hours

// =============================================================================
// HOOK
// =============================================================================

/**
 * Calculate layout information for a row of books.
 * Uses pre-calculated spine cache for dimensions when available.
 * Handles leaning patterns and touch targets.
 *
 * Leaning pattern:
 * - Every ~5 books, one book leans (direction based on hash)
 * - Last book always leans left (like a bookend)
 *
 * @param books Array of book data
 * @param options Configuration options
 * @returns Array of BookLayoutInfo with calculated dimensions and angles
 */
export function useBookRowLayout(
  books: BookSpineVerticalData[],
  options: UseBookRowLayoutOptions = {}
): BookLayoutInfo[] {
  const {
    scaleFactor = DEFAULT_SCALE,
    thicknessMultiplier = DEFAULT_THICKNESS_MULTIPLIER,
    leanAngle = DEFAULT_LEAN_ANGLE,
    minTouchTarget = DEFAULT_MIN_TOUCH_TARGET,
    enableLeaning = true,
    fixedHeight,
  } = options;

  // Get spine cache for fast lookups
  const getSpineData = useSpineCacheStore((state) => state.getSpineData);

  return useMemo(() => {
    if (!books || books.length === 0) return [];

    const totalBooks = books.length;
    let nextLeanAt = 5; // First lean at index 5

    const isLastIndex = (index: number) => index === totalBooks - 1;

    return books.map((book, index) => {
      // Try to get from cache first
      const cached = getSpineData(book.id);

      let baseWidth: number;
      let baseHeight: number;
      let bookHash: number;

      if (cached) {
        // Use cached dimensions and hash
        baseWidth = cached.baseWidth;
        baseHeight = cached.baseHeight;
        bookHash = cached.hash;
      } else {
        // Fallback: calculate on the fly (for uncached books)
        const genres = book.genres || [];
        const tags = book.tags || [];
        const duration = book.duration || DEFAULT_DURATION;

        const calculated = calculateBookDimensions({
          id: book.id,
          genres,
          tags,
          duration,
          seriesName: book.seriesName,
        });

        baseWidth = calculated.width;
        baseHeight = calculated.height;
        bookHash = hashString(book.id);
      }

      // Apply scale and thickness multiplier
      const width = baseWidth * scaleFactor * thicknessMultiplier;
      // Use fixedHeight if provided, otherwise scale the base height
      const height = fixedHeight ? fixedHeight * scaleFactor : baseHeight * scaleFactor;

      // Calculate touch padding for small books
      const touchPadding = Math.max(0, Math.ceil((minTouchTarget - width) / 2));

      // Determine leaning
      let bookLeanAngle = 0;
      let shouldLean = false;

      if (enableLeaning && totalBooks > 1) {
        // Last book always leans LEFT (like a bookend)
        if (isLastIndex(index)) {
          bookLeanAngle = -leanAngle;
          shouldLean = true;
        } else {
          // Check if this book should lean
          shouldLean = index === nextLeanAt;
          if (shouldLean) {
            // Schedule next lean 5-9 books later
            nextLeanAt = index + 5 + (bookHash % 5);
            // Alternate lean direction based on hash
            bookLeanAngle = (bookHash % 2 === 0) ? leanAngle : -leanAngle;
          }
        }
      }

      // Enrich book with cached colors if not already present
      const enrichedBook = (book.backgroundColor && book.textColor)
        ? book
        : cached
          ? { ...book, backgroundColor: cached.backgroundColor, textColor: cached.textColor }
          : book;

      return {
        book: enrichedBook,
        width,
        height,
        leanAngle: bookLeanAngle,
        shouldLean,
        touchPadding,
      };
    });
  }, [books, scaleFactor, thicknessMultiplier, leanAngle, minTouchTarget, enableLeaning, getSpineData]);
}

/**
 * Get the total width of a book row including gaps.
 */
export function getBookRowWidth(
  layouts: BookLayoutInfo[],
  gap: number = DEFAULT_BOOK_GAP
): number {
  if (layouts.length === 0) return 0;
  const booksWidth = layouts.reduce((sum, l) => sum + l.width + (l.touchPadding * 2), 0);
  const gapsWidth = (layouts.length - 1) * gap;
  return booksWidth + gapsWidth;
}

/**
 * Get the maximum height of books in a row.
 */
export function getBookRowHeight(layouts: BookLayoutInfo[]): number {
  if (layouts.length === 0) return 0;
  return Math.max(...layouts.map(l => l.height));
}
