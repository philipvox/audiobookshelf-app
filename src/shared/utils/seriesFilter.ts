/**
 * src/shared/utils/seriesFilter.ts
 *
 * Utility to filter recommendations to only show appropriate books in a series:
 * - First book in a series (for series user hasn't started)
 * - Next book in a series (for series user has already started)
 * - Never show middle books in a series user hasn't reached
 * - Single-book series treated as standalone
 */

import { LibraryItem } from '@/core/types';

interface SeriesInfo {
  name: string;
  sequence: number;
  /** True if this is an omnibus edition covering multiple books (e.g., "1-3") */
  isOmnibus: boolean;
  /** For omnibus editions, the end sequence (e.g., 3 for "1-3"). Same as sequence for single books. */
  sequenceEnd: number;
}

/**
 * Parse a sequence value that might be a range (e.g., "1-3") or single value (e.g., "1", "1.5")
 * Returns { start, end, isRange }
 */
function parseSequence(sequenceValue: unknown): { start: number; end: number; isRange: boolean } {
  // Handle null, undefined, or empty values
  if (sequenceValue === null || sequenceValue === undefined || sequenceValue === '') {
    return { start: 0, end: 0, isRange: false };
  }

  const str = String(sequenceValue).trim();

  // Check for range format like "1-3" or "1.5-3.5"
  // Use regex to match: number, dash, number (allowing decimals)
  const rangeMatch = str.match(/^(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    const start = parseFloat(rangeMatch[1]);
    const end = parseFloat(rangeMatch[2]);
    if (!isNaN(start) && !isNaN(end)) {
      return { start, end, isRange: true };
    }
  }

  // Single value
  const num = parseFloat(str);
  if (!isNaN(num)) {
    return { start: num, end: num, isRange: false };
  }

  // Invalid sequence
  return { start: 0, end: 0, isRange: false };
}

/**
 * Extract series info from a library item.
 * Handles:
 * - Single sequence values: "1", "1.5", "10"
 * - Range/omnibus sequences: "1-3", "4-6" (books covering multiple volumes)
 * - Null/undefined/invalid sequences: treated as sequence 0
 */
export function getSeriesInfo(item: LibraryItem): SeriesInfo | null {
  const metadata = (item.media?.metadata as any) || {};
  const series = metadata.series?.[0];

  if (!series?.name) return null;

  const parsed = parseSequence(series.sequence);

  return {
    name: series.name,
    sequence: parsed.start,
    isOmnibus: parsed.isRange,
    sequenceEnd: parsed.end,
  };
}

/**
 * Build a map of series to the user's progress in each series.
 * Returns the highest sequence number the user has started or finished for each series.
 * For omnibus editions (e.g., "1-3"), uses the end sequence if the user has finished it.
 *
 * @param allItems - All library items
 * @param isFinished - Function to check if user finished a book
 * @param hasStarted - Function to check if user started a book (optional, falls back to progress check)
 */
export function buildSeriesProgressMap(
  allItems: LibraryItem[],
  isFinished: (bookId: string) => boolean,
  hasStarted?: (bookId: string) => boolean
): Map<string, number> {
  const seriesProgress = new Map<string, number>();

  // Guard against undefined functions
  if (typeof isFinished !== 'function') {
    return seriesProgress;
  }

  for (const item of allItems) {
    const seriesInfo = getSeriesInfo(item);
    if (!seriesInfo) continue;

    // Check if user has started or finished this book
    const userStarted = hasStarted
      ? hasStarted(item.id)
      : ((item as any).userMediaProgress?.progress || 0) > 0;
    const userFinished = isFinished(item.id);

    if (userStarted || userFinished) {
      const currentMax = seriesProgress.get(seriesInfo.name) || 0;

      // For omnibus editions, use sequenceEnd if finished, otherwise use start sequence
      // This means: finished "1-3" omnibus → progress is 3
      //             started but not finished "1-3" → progress is 1
      const effectiveSequence = (userFinished && seriesInfo.isOmnibus)
        ? seriesInfo.sequenceEnd
        : seriesInfo.sequence;

      if (effectiveSequence > currentMax) {
        seriesProgress.set(seriesInfo.name, effectiveSequence);
      }
    }
  }

  return seriesProgress;
}

/**
 * Build a map of series name to total book count in that series.
 * Used to identify single-book series.
 */
export function buildSeriesCountMap(allItems: LibraryItem[]): Map<string, number> {
  const seriesCounts = new Map<string, number>();

  for (const item of allItems) {
    const seriesInfo = getSeriesInfo(item);
    if (!seriesInfo) continue;

    const count = seriesCounts.get(seriesInfo.name) || 0;
    seriesCounts.set(seriesInfo.name, count + 1);
  }

  return seriesCounts;
}

/**
 * Build a map of series name to the lowest sequence number (first book).
 */
export function buildSeriesFirstBookMap(allItems: LibraryItem[]): Map<string, number> {
  const seriesFirstBook = new Map<string, number>();

  for (const item of allItems) {
    const seriesInfo = getSeriesInfo(item);
    if (!seriesInfo || seriesInfo.sequence <= 0) continue;

    const currentFirst = seriesFirstBook.get(seriesInfo.name);
    if (currentFirst === undefined || seriesInfo.sequence < currentFirst) {
      seriesFirstBook.set(seriesInfo.name, seriesInfo.sequence);
    }
  }

  return seriesFirstBook;
}

export interface SeriesFilterOptions {
  /** All library items (needed to build series maps) */
  allItems: LibraryItem[];
  /** Function to check if user finished a book */
  isFinished: (bookId: string) => boolean;
  /** Function to check if user started a book (optional) */
  hasStarted?: (bookId: string) => boolean;
}

/**
 * Check if a book is appropriate to recommend based on series position.
 *
 * Returns true if:
 * - Book is not part of a series (standalone)
 * - Book is the only book in its series (single-book series)
 * - Book is the first book in a series the user hasn't started
 * - Book is the next book in a series the user has started
 * - Omnibus editions that start where the user is or at the beginning
 *
 * Returns false if:
 * - Book is in the middle of a series the user hasn't reached yet
 * - Omnibus editions that would spoil books the user hasn't reached
 */
export function isSeriesAppropriate(
  item: LibraryItem,
  seriesProgressMap: Map<string, number>,
  seriesCountMap: Map<string, number>,
  seriesFirstBookMap: Map<string, number>
): boolean {
  const seriesInfo = getSeriesInfo(item);

  // Not part of a series - always OK
  if (!seriesInfo) return true;

  const seriesName = seriesInfo.name;
  const bookSequence = seriesInfo.sequence;

  // Single-book series - treat as standalone, always OK
  const seriesBookCount = seriesCountMap.get(seriesName) || 0;
  if (seriesBookCount <= 1) return true;

  // Get user's progress in this series (highest sequence they've started/finished)
  const userProgress = seriesProgressMap.get(seriesName) || 0;

  // Get the first book's sequence number in this series
  const firstBookSequence = seriesFirstBookMap.get(seriesName) || 1;

  // Special handling for omnibus editions (e.g., "1-3")
  if (seriesInfo.isOmnibus) {
    if (userProgress > 0) {
      // User has started the series - only show omnibus if they've reached its content
      // An omnibus covering books 1-3 is appropriate if user has finished up to book 1
      // (they can use it to continue through the series)
      // But not if the omnibus starts ahead of where they are
      return bookSequence <= userProgress + 1;
    } else {
      // User hasn't started - only show omnibus if it starts at the first book
      return bookSequence === firstBookSequence;
    }
  }

  // Regular (non-omnibus) book handling
  if (userProgress > 0) {
    // Only show books that are at or after where they are
    // Allow current book (in case they want to re-listen) or next book
    // This allows: userProgress=1 → show book 1 (re-listen) or book 2 (next)
    // But not: userProgress=1 → show book 5 (too far ahead)
    const maxAllowedSequence = userProgress + 1;
    return bookSequence <= maxAllowedSequence;
  }

  // User hasn't started this series - only show the first book
  return bookSequence === firstBookSequence;
}

/**
 * Filter a list of items to only include series-appropriate recommendations.
 *
 * This is the main function to use in recommendation hooks.
 */
export function filterSeriesAppropriate(
  items: LibraryItem[],
  options: SeriesFilterOptions
): LibraryItem[] {
  const { allItems, isFinished, hasStarted } = options;

  // Build lookup maps once
  const seriesProgressMap = buildSeriesProgressMap(allItems, isFinished, hasStarted);
  const seriesCountMap = buildSeriesCountMap(allItems);
  const seriesFirstBookMap = buildSeriesFirstBookMap(allItems);

  // Filter items
  return items.filter(item =>
    isSeriesAppropriate(item, seriesProgressMap, seriesCountMap, seriesFirstBookMap)
  );
}

/**
 * Create a reusable filter function with pre-built maps.
 * More efficient when filtering multiple lists.
 */
export function createSeriesFilter(options: SeriesFilterOptions) {
  const { allItems, isFinished, hasStarted } = options;

  // Guard against undefined functions (can happen during initialization)
  if (typeof isFinished !== 'function') {
    console.warn('[seriesFilter] isFinished is not a function, returning passthrough filter');
    return () => true;
  }

  // Build lookup maps once
  const seriesProgressMap = buildSeriesProgressMap(allItems, isFinished, hasStarted);
  const seriesCountMap = buildSeriesCountMap(allItems);
  const seriesFirstBookMap = buildSeriesFirstBookMap(allItems);

  return (item: LibraryItem): boolean =>
    isSeriesAppropriate(item, seriesProgressMap, seriesCountMap, seriesFirstBookMap);
}
