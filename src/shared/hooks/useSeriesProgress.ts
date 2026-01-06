/**
 * src/shared/hooks/useSeriesProgress.ts
 *
 * Calculate progress through a book series.
 * Consolidates the series progress calculation pattern used in
 * SeriesListScreen, SeriesDetailScreen, and HomeScreen.
 *
 * @example
 * const { completedBooks, totalBooks, percentComplete, nextBook } = useSeriesProgress(seriesBooks);
 * console.log(`${completedBooks}/${totalBooks} complete (${percentComplete}%)`);
 */

import { useMemo } from 'react';
import { LibraryItem } from '@/core/types';
import { useFinishedBookIds, useInProgressBooks } from '@/core/hooks/useUserBooks';
import { extractBookMetadata } from '@/shared/utils/metadata';

export type BookStatus = 'done' | 'current' | 'not-started';

export interface SeriesProgress {
  /** Number of completed books in the series */
  completedBooks: number;
  /** Number of books currently in progress */
  inProgressBooks: number;
  /** Number of books not yet started */
  notStartedBooks: number;
  /** Total number of books in the series */
  totalBooks: number;
  /** Completion percentage (0-100) */
  percentComplete: number;
  /** The next book to read (first not-started or in-progress) */
  nextBook: LibraryItem | null;
  /** Status for each book in order */
  bookStatuses: BookStatus[];
  /** Whether all books in the series are complete */
  isSeriesComplete: boolean;
  /** Whether any book in the series has been started */
  hasStarted: boolean;
}

/**
 * Get the series sequence number from a book's metadata.
 * Returns a high number (999) if no sequence is found to sort to the end.
 */
function getSequenceNumber(book: LibraryItem): number {
  const metadata = book.media?.metadata as any;

  // Try series array first
  if (metadata?.series?.length > 0) {
    const firstSeries = metadata.series[0];
    if (firstSeries.sequence) {
      return Number(firstSeries.sequence) || 999;
    }
  }

  // Try seriesName with embedded sequence (e.g., "Series Name #1")
  const seriesName = metadata?.seriesName;
  if (seriesName) {
    const match = seriesName.match(/#(\d+(?:\.\d+)?)/);
    if (match) {
      return Number(match[1]) || 999;
    }
  }

  return 999;
}

/**
 * Sort books by their series sequence number.
 */
function sortBySequence(books: LibraryItem[]): LibraryItem[] {
  return [...books].sort((a, b) => getSequenceNumber(a) - getSequenceNumber(b));
}

/**
 * Calculate progress through a book series.
 *
 * This hook consolidates the series progress calculation that was previously
 * duplicated in:
 * - SeriesListScreen (for filter matching)
 * - SeriesDetailScreen (for progress display)
 * - HomeScreen (for series cards)
 *
 * @param seriesBooks - Array of LibraryItems belonging to the series
 * @returns SeriesProgress object with completion stats and next book
 */
export function useSeriesProgress(seriesBooks: LibraryItem[]): SeriesProgress {
  // Get set of finished book IDs for efficient lookup
  const finishedBookIds = useFinishedBookIds();

  // Get in-progress books to check current status
  const { data: inProgressBooksData = [] } = useInProgressBooks();
  const inProgressBookIds = useMemo(
    () => new Set(inProgressBooksData.map((b) => b.bookId)),
    [inProgressBooksData]
  );

  return useMemo(() => {
    if (!seriesBooks || seriesBooks.length === 0) {
      return {
        completedBooks: 0,
        inProgressBooks: 0,
        notStartedBooks: 0,
        totalBooks: 0,
        percentComplete: 0,
        nextBook: null,
        bookStatuses: [],
        isSeriesComplete: false,
        hasStarted: false,
      };
    }

    // Sort books by sequence
    const sortedBooks = sortBySequence(seriesBooks);

    let completedCount = 0;
    let inProgressCount = 0;
    let nextBook: LibraryItem | null = null;
    const bookStatuses: BookStatus[] = [];

    for (const book of sortedBooks) {
      const isFinished = finishedBookIds.has(book.id);
      const isInProgress = inProgressBookIds.has(book.id);

      if (isFinished) {
        completedCount++;
        bookStatuses.push('done');
      } else if (isInProgress) {
        inProgressCount++;
        bookStatuses.push('current');
        // First in-progress book is the next book
        if (!nextBook) {
          nextBook = book;
        }
      } else {
        bookStatuses.push('not-started');
        // First not-started book (after any in-progress) is next if no in-progress
        if (!nextBook) {
          nextBook = book;
        }
      }
    }

    const totalBooks = sortedBooks.length;
    const notStartedCount = totalBooks - completedCount - inProgressCount;
    const percentComplete = totalBooks > 0 ? Math.round((completedCount / totalBooks) * 100) : 0;

    return {
      completedBooks: completedCount,
      inProgressBooks: inProgressCount,
      notStartedBooks: notStartedCount,
      totalBooks,
      percentComplete,
      nextBook,
      bookStatuses,
      isSeriesComplete: completedCount === totalBooks && totalBooks > 0,
      hasStarted: completedCount > 0 || inProgressCount > 0,
    };
  }, [seriesBooks, finishedBookIds, inProgressBookIds]);
}

/**
 * Get a formatted progress string for a series.
 *
 * @example
 * const progressText = useSeriesProgressText(seriesBooks);
 * // "3 of 5 complete" or "Complete!" or "Not started"
 */
export function useSeriesProgressText(seriesBooks: LibraryItem[]): string {
  const { completedBooks, totalBooks, isSeriesComplete, hasStarted } =
    useSeriesProgress(seriesBooks);

  if (totalBooks === 0) return '';
  if (isSeriesComplete) return 'Complete!';
  if (!hasStarted) return 'Not started';
  return `${completedBooks} of ${totalBooks} complete`;
}

/**
 * Check if a series matches a filter based on progress.
 *
 * @example
 * const matchesFilter = useSeriesFilterMatch(seriesBooks, 'completed');
 */
export type SeriesFilter = 'all' | 'completed' | 'in-progress' | 'not-started';

export function useSeriesFilterMatch(
  seriesBooks: LibraryItem[],
  filter: SeriesFilter
): boolean {
  const { isSeriesComplete, hasStarted, inProgressBooks } = useSeriesProgress(seriesBooks);

  switch (filter) {
    case 'all':
      return true;
    case 'completed':
      return isSeriesComplete;
    case 'in-progress':
      return hasStarted && !isSeriesComplete;
    case 'not-started':
      return !hasStarted;
    default:
      return true;
  }
}

export default useSeriesProgress;
