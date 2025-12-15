/**
 * src/features/mood-discovery/hooks/useMoodFilteredBooks.ts
 *
 * Hook to filter library books based on active mood session.
 * Applies length and duration filters from the session.
 */

import { useMemo } from 'react';
import { useLibraryCache } from '@/core/cache/libraryCache';
import { MoodSession, LENGTH_OPTIONS } from '../types';
import { useActiveSession } from '../stores/moodSessionStore';
import { LibraryItem } from '@/core/types';

interface UseMoodFilteredBooksOptions {
  /** Override session with custom session */
  session?: MoodSession | null;
  /** Additional filter options */
  additionalFilters?: {
    query?: string;
    authors?: string[];
    series?: string[];
  };
}

/**
 * Get duration range from length preference
 */
function getLengthDuration(length: MoodSession['length']): {
  minDuration?: number;
  maxDuration?: number;
} {
  const config = LENGTH_OPTIONS.find((o) => o.id === length);
  if (!config) return {};

  return {
    minDuration: config.minHours,
    maxDuration: config.maxHours,
  };
}

/**
 * Hook to get books filtered by the active mood session's length preference.
 * Does NOT score by vibes - that's handled by useMoodRecommendations.
 */
export function useMoodFilteredBooks(options: UseMoodFilteredBooksOptions = {}) {
  const activeSession = useActiveSession();
  const session = options.session ?? activeSession;
  const filterItems = useLibraryCache((s) => s.filterItems);
  const isLoaded = useLibraryCache((s) => s.isLoaded);
  const items = useLibraryCache((s) => s.items);

  const filteredBooks = useMemo(() => {
    if (!isLoaded || !session) {
      return [];
    }

    // Get duration range from length preference
    const { minDuration, maxDuration } = getLengthDuration(session.length);

    // Apply filters
    const filtered = filterItems({
      ...options.additionalFilters,
      minDuration,
      maxDuration,
    });

    return filtered;
  }, [
    isLoaded,
    session?.length,
    session?.mood,
    session?.world,
    options.additionalFilters?.query,
    options.additionalFilters?.authors?.join(','),
    options.additionalFilters?.series?.join(','),
    filterItems,
    items, // Re-filter when items change
  ]);

  return {
    books: filteredBooks,
    count: filteredBooks.length,
    isLoading: !isLoaded,
    hasSession: !!session,
  };
}

/**
 * Get all books that match the length filter only (no vibe scoring)
 */
export function useAllFilteredBooks(session: MoodSession | null) {
  const filterItems = useLibraryCache((s) => s.filterItems);
  const isLoaded = useLibraryCache((s) => s.isLoaded);

  return useMemo(() => {
    if (!isLoaded || !session) {
      return [];
    }

    const { minDuration, maxDuration } = getLengthDuration(session.length);

    return filterItems({
      minDuration,
      maxDuration,
    });
  }, [isLoaded, session?.length, filterItems]);
}
