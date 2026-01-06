/**
 * src/shared/utils/featuredReason.ts
 *
 * Utilities for generating featured book recommendations and reasons.
 * Used by BrowseScreen/Discover to explain why a book is featured.
 */

import { LibraryItem } from '@/core/types';
import { extractBookMetadata } from './metadata';

// ============================================================================
// TYPES
// ============================================================================

export type RecommendationReasonType =
  | 'continue_reading'
  | 'recently_added'
  | 'popular_in_genre'
  | 'by_favorite_author'
  | 'by_favorite_narrator'
  | 'similar_to_finished'
  | 'random_pick';

export interface FeaturedReason {
  type: RecommendationReasonType;
  message: string;
}

export interface FeaturedContext {
  favoriteAuthors?: string[];
  favoriteNarrators?: string[];
  recentlyFinishedGenres?: string[];
  isRecentlyAdded?: boolean;
  isInProgress?: boolean;
}

// ============================================================================
// FEATURED REASON
// ============================================================================

/**
 * Generate a human-readable reason for why a book is featured
 */
export function getFeaturedReason(
  book: LibraryItem | null,
  context?: FeaturedContext
): FeaturedReason {
  if (!book) {
    return { type: 'random_pick', message: 'Discover something new' };
  }

  const { authorName, narratorName, genres } = extractBookMetadata(book);
  const progress = book.userMediaProgress;
  const progressValue = progress?.progress ?? 0;

  // Priority 1: Currently reading
  if (context?.isInProgress || (progressValue > 0 && progressValue < 0.95 && !progress?.isFinished)) {
    return {
      type: 'continue_reading',
      message: 'Continue where you left off',
    };
  }

  // Priority 2: By favorite author
  if (context?.favoriteAuthors?.includes(authorName)) {
    return {
      type: 'by_favorite_author',
      message: `Because you like ${authorName}`,
    };
  }

  // Priority 3: By favorite narrator
  if (context?.favoriteNarrators?.includes(narratorName)) {
    return {
      type: 'by_favorite_narrator',
      message: `Narrated by ${narratorName}`,
    };
  }

  // Priority 4: Recently added
  if (context?.isRecentlyAdded) {
    return {
      type: 'recently_added',
      message: 'New in your library',
    };
  }

  // Priority 5: Similar genre to recently finished
  const matchingGenre = genres.find((g) =>
    context?.recentlyFinishedGenres?.includes(g)
  );
  if (matchingGenre) {
    return {
      type: 'similar_to_finished',
      message: `More ${matchingGenre}`,
    };
  }

  // Priority 6: Popular in first genre
  if (genres.length > 0) {
    return {
      type: 'popular_in_genre',
      message: `Popular in ${genres[0]}`,
    };
  }

  // Fallback
  return {
    type: 'random_pick',
    message: 'You might enjoy this',
  };
}

// ============================================================================
// FEATURED BOOK SELECTION
// ============================================================================

export interface SelectFeaturedOptions {
  favoriteAuthors?: string[];
  favoriteNarrators?: string[];
  recentlyFinishedGenres?: string[];
}

export interface FeaturedBookResult {
  book: LibraryItem | null;
  reason: FeaturedReason;
}

/**
 * Select the best featured book from a list based on context
 */
export function selectFeaturedBook(
  books: LibraryItem[],
  options?: SelectFeaturedOptions
): FeaturedBookResult {
  if (books.length === 0) {
    return { book: null, reason: getFeaturedReason(null) };
  }

  // Priority 1: Currently in progress (most recent update)
  const inProgressBooks = books
    .filter((b) => {
      const progress = b.userMediaProgress;
      const progressValue = progress?.progress ?? 0;
      return progressValue > 0 && progressValue < 0.95 && !progress?.isFinished;
    })
    .sort((a, b) => {
      const aTime = a.userMediaProgress?.lastUpdate ?? 0;
      const bTime = b.userMediaProgress?.lastUpdate ?? 0;
      return bTime - aTime;
    });

  if (inProgressBooks.length > 0) {
    return {
      book: inProgressBooks[0],
      reason: getFeaturedReason(inProgressBooks[0], { isInProgress: true }),
    };
  }

  // Priority 2: By favorite author (not started)
  if (options?.favoriteAuthors?.length) {
    const byFavorite = books.find((b) => {
      const { authorName } = extractBookMetadata(b);
      const progress = b.userMediaProgress?.progress ?? 0;
      return progress === 0 && options.favoriteAuthors?.includes(authorName);
    });
    if (byFavorite) {
      return {
        book: byFavorite,
        reason: getFeaturedReason(byFavorite, options),
      };
    }
  }

  // Priority 3: By favorite narrator (not started)
  if (options?.favoriteNarrators?.length) {
    const byNarrator = books.find((b) => {
      const { narratorName } = extractBookMetadata(b);
      const progress = b.userMediaProgress?.progress ?? 0;
      return progress === 0 && options.favoriteNarrators?.includes(narratorName);
    });
    if (byNarrator) {
      return {
        book: byNarrator,
        reason: getFeaturedReason(byNarrator, options),
      };
    }
  }

  // Priority 4: Recently added (within 7 days, not started)
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentlyAdded = books.find((b) => {
    const addedAt = (b.addedAt || 0) * 1000;
    const progress = b.userMediaProgress?.progress ?? 0;
    return addedAt > oneWeekAgo && progress === 0;
  });
  if (recentlyAdded) {
    return {
      book: recentlyAdded,
      reason: getFeaturedReason(recentlyAdded, { isRecentlyAdded: true }),
    };
  }

  // Priority 5: Similar to recently finished
  if (options?.recentlyFinishedGenres?.length) {
    const similar = books.find((b) => {
      const { genres } = extractBookMetadata(b);
      const progress = b.userMediaProgress?.progress ?? 0;
      return progress === 0 && genres.some((g) => options.recentlyFinishedGenres?.includes(g));
    });
    if (similar) {
      return {
        book: similar,
        reason: getFeaturedReason(similar, options),
      };
    }
  }

  // Priority 6: Random from not-started books (prefer top 10 by addedAt)
  const notStarted = books
    .filter((b) => (b.userMediaProgress?.progress ?? 0) === 0)
    .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
    .slice(0, 10);

  if (notStarted.length > 0) {
    const randomIndex = Math.floor(Math.random() * notStarted.length);
    return {
      book: notStarted[randomIndex],
      reason: { type: 'random_pick', message: 'You might enjoy this' },
    };
  }

  // Fallback: Random from all books
  const randomIndex = Math.floor(Math.random() * Math.min(10, books.length));
  return {
    book: books[randomIndex],
    reason: { type: 'random_pick', message: 'From your library' },
  };
}

/**
 * Check if a book was recently added (within N days)
 */
export function isRecentlyAdded(book: LibraryItem | null, daysAgo = 7): boolean {
  if (!book?.addedAt) return false;
  const cutoff = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
  return book.addedAt * 1000 > cutoff;
}
