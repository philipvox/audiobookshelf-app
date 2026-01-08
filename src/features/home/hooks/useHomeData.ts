/**
 * src/features/home/hooks/useHomeData.ts
 *
 * Aggregates all data needed for the home screen
 * - Live updates when books are added/removed from library (no flicker)
 * - Pull-to-refresh support
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api';
import { queryKeys } from '@/core/queryClient';
import { LibraryItem } from '@/core/types';
import { usePlayerStore } from '@/features/player';
import { useMyLibraryStore } from '@/shared/stores/myLibraryStore';
import { useLibraryCache } from '@/core/cache';
import { useDownloads } from '@/core/hooks/useDownloads';
import { preWarmTickCache, ChapterInput } from '@/features/player/services/tickCache';
import {
  UseHomeDataReturn,
  PlaybackProgress,
  SeriesWithBooks,
  PlaylistDisplay,
  HeroBookData,
  HeroBookState,
  EnhancedSeriesData,
  BookStatus,
} from '../types';
import { useKidModeStore } from '@/shared/stores/kidModeStore';
import { filterForKidMode } from '@/shared/utils/kidModeFilter';
import { calculateTimeRemaining, isBookComplete } from '@/features/player/utils/progressCalculator';
import { findChapterForPosition } from '@/features/player/utils/chapterNavigator';
import { getNarratorName, getTitle } from '@/shared/utils/metadata';
import { Chapter } from '@/features/player/utils/types';

/**
 * Main hook for home screen data
 * Combines current playback, recent books, series, and playlists
 */
export function useHomeData(): UseHomeDataReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get player state for current book
  const {
    currentBook: playerCurrentBook,
    position,
    duration,
  } = usePlayerStore();

  // Get library IDs and favorite series from store (reactive)
  const libraryIds = useMyLibraryStore((state) => state.libraryIds);
  const favoriteSeriesNames = useMyLibraryStore((state) => state.favoriteSeriesNames);

  // Kid Mode filter state
  const kidModeEnabled = useKidModeStore((state) => state.enabled);

  // Get series data from library cache
  const { getSeries, getItem, isLoaded: isCacheLoaded } = useLibraryCache();

  // Get downloaded books
  const { downloads } = useDownloads();
  const completedDownloads = useMemo(
    () => downloads.filter((d) => d.status === 'complete'),
    [downloads]
  );

  // Local cache of book data - persists across re-renders to avoid flicker
  const bookCacheRef = useRef<Map<string, LibraryItem>>(new Map());
  const [libraryBooks, setLibraryBooks] = useState<LibraryItem[]>([]);

  // Fetch items in progress
  const {
    data: inProgressItems = [],
    isLoading: isLoadingProgress,
    refetch: refetchProgress,
  } = useQuery({
    queryKey: queryKeys.user.inProgress(),
    queryFn: async () => {
      const items = await apiClient.getItemsInProgress();

      // Sort by most recently updated
      return items.sort((a, b) => {
        const aTime = (a as any).mediaProgress?.lastUpdate || (a as any).progressLastUpdate || (a as any).userMediaProgress?.lastUpdate || 0;
        const bTime = (b as any).mediaProgress?.lastUpdate || (b as any).progressLastUpdate || (b as any).userMediaProgress?.lastUpdate || 0;
        return bTime - aTime;
      });
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    // Keep showing previous data while refetching for instant display
    placeholderData: (previousData) => previousData,
  });

  // Fetch playlists
  const {
    data: playlists = [],
    isLoading: isLoadingPlaylists,
    refetch: refetchPlaylists,
  } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      try {
        return await apiClient.getPlaylists();
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Keep showing previous data while refetching for instant display
    placeholderData: (previousData) => previousData,
  });

  // Pre-populate cache from in-progress items and player's current book
  // This ensures books are instantly available when added to library
  useEffect(() => {
    const cache = bookCacheRef.current;

    // Cache in-progress items
    inProgressItems.forEach(item => {
      if (!cache.has(item.id)) {
        cache.set(item.id, item);
      }
    });

    // Cache current player book
    if (playerCurrentBook && !cache.has(playerCurrentBook.id)) {
      cache.set(playerCurrentBook.id, playerCurrentBook);
    }
  }, [inProgressItems, playerCurrentBook]);

  // Sync library books with libraryIds - uses cache for instant updates
  useEffect(() => {
    const syncLibraryBooks = async () => {
      if (libraryIds.length === 0) {
        setLibraryBooks([]);
        return;
      }

      const cache = bookCacheRef.current;
      const books: LibraryItem[] = [];
      const idsToFetch: string[] = [];

      // First, use cached books and identify which ones we need to fetch
      for (const id of libraryIds) {
        const cached = cache.get(id);
        if (cached) {
          books.push(cached);
        } else {
          idsToFetch.push(id);
        }
      }

      // Update immediately with cached books (no flicker)
      if (books.length > 0) {
        // Maintain order based on libraryIds
        const orderedBooks = libraryIds
          .map(id => cache.get(id))
          .filter((book): book is LibraryItem => book !== undefined);
        setLibraryBooks(orderedBooks);
      }

      // Fetch missing books in background
      if (idsToFetch.length > 0) {
        const fetchPromises = idsToFetch.map(async (id) => {
          try {
            const book = await apiClient.getItem(id);
            cache.set(id, book);
            return book;
          } catch {
            return null;
          }
        });

        await Promise.all(fetchPromises);

        // Update with all books now that fetching is complete
        const allBooks = libraryIds
          .map(id => cache.get(id))
          .filter((book): book is LibraryItem => book !== undefined);
        setLibraryBooks(allBooks);
      }

      // Clean up cache - remove books no longer in library
      for (const id of cache.keys()) {
        if (!libraryIds.includes(id)) {
          cache.delete(id);
        }
      }
    };

    syncLibraryBooks();
  }, [libraryIds]);

  // Function to refresh library books (for pull-to-refresh)
  const refetchLibrary = useCallback(async () => {
    if (libraryIds.length === 0) return;

    const cache = bookCacheRef.current;
    const fetchPromises = libraryIds.map(async (id) => {
      try {
        const book = await apiClient.getItem(id);
        cache.set(id, book);
        return book;
      } catch {
        return cache.get(id) || null;
      }
    });

    await Promise.all(fetchPromises);

    const allBooks = libraryIds
      .map(id => cache.get(id))
      .filter((book): book is LibraryItem => book !== undefined);
    setLibraryBooks(allBooks);
  }, [libraryIds]);

  // Current book - prefer player's loaded book to avoid UI flicker
  // The player always has the authoritative "current" book when audio is loaded
  const currentBook = useMemo(() => {
    // If player has a book loaded (playing or paused), always show it
    if (playerCurrentBook) {
      return playerCurrentBook;
    }

    // Fallback: show most recent from server
    return inProgressItems[0] || null;
  }, [playerCurrentBook, inProgressItems]);

  // Pre-warm tick cache for current book (non-blocking)
  useEffect(() => {
    if (!currentBook) return;

    const bookChapters = currentBook.media?.chapters || [];
    const bookDuration = (currentBook.media as any)?.duration || 0;

    if (bookDuration > 0 && bookChapters.length > 0) {
      const chapterInputs: ChapterInput[] = bookChapters.map((ch: any, i: number) => ({
        start: ch.start || 0,
        end: ch.end || bookChapters[i + 1]?.start || bookDuration,
        displayTitle: ch.title,
      }));

      // Pre-warm in background (non-blocking, non-persisting)
      preWarmTickCache(currentBook.id, bookDuration, chapterInputs);
    }
  }, [currentBook?.id]); // Only re-run when book changes

  // Current progress
  const currentProgress: PlaybackProgress | null = useMemo(() => {
    if (!currentBook) return null;

    // If we have player state, use that
    if (playerCurrentBook && playerCurrentBook.id === currentBook.id) {
      return {
        currentTime: position,
        duration: duration,
        progress: duration > 0 ? position / duration : 0,
        isFinished: false,
        lastUpdate: Date.now(),
      };
    }

    // Otherwise use stored progress (mediaProgress from getItemsInProgress, or legacy userMediaProgress)
    const userProgress = (currentBook as any).mediaProgress || (currentBook as any).userMediaProgress;
    if (userProgress) {
      return {
        currentTime: userProgress.currentTime || 0,
        duration: userProgress.duration || (currentBook.media as any)?.duration || 0,
        progress: userProgress.progress || 0,
        isFinished: userProgress.isFinished || false,
        lastUpdate: userProgress.lastUpdate || 0,
      };
    }

    return null;
  }, [currentBook, playerCurrentBook, position, duration]);

  // Recently listened - all in-progress books for Continue Listening section
  const recentlyListened = useMemo(() => {
    // Apply Kid Mode filter first, then take up to 20
    const filtered = filterForKidMode(inProgressItems, kidModeEnabled);
    return filtered.slice(0, 20);
  }, [inProgressItems, kidModeEnabled]);

  // Your Books - from library store (live updates when adding/removing)
  // Exclude current book from the list, apply Kid Mode filter
  const recentBooks = useMemo(() => {
    let books = libraryBooks;
    if (currentBook) {
      books = books.filter((item) => item.id !== currentBook.id);
    }
    return filterForKidMode(books, kidModeEnabled);
  }, [libraryBooks, currentBook, kidModeEnabled]);

  // Extract series from downloaded books + in-progress books + favorites
  const userSeries: SeriesWithBooks[] = useMemo(() => {
    const seriesMap = new Map<string, SeriesWithBooks>();

    // Helper to extract series name from metadata
    const extractSeriesName = (item: LibraryItem): string | null => {
      const metadata = (item.media?.metadata as any) || {};
      // Try seriesName first (e.g., "Series Name #1")
      if (metadata.seriesName) {
        const match = metadata.seriesName.match(/^(.+?)\s*#[\d.]+$/);
        return match ? match[1].trim() : metadata.seriesName;
      }
      // Try series array
      const seriesInfo = metadata.series;
      if (seriesInfo?.length) {
        const firstSeries = seriesInfo[0];
        return typeof firstSeries === 'object' ? firstSeries.name : firstSeries;
      }
      return null;
    };

    // First, add favorite series from library cache
    if (isCacheLoaded) {
      favoriteSeriesNames.forEach((seriesName) => {
        const cachedSeries = getSeries(seriesName);
        if (cachedSeries && !seriesMap.has(seriesName)) {
          seriesMap.set(seriesName, {
            id: seriesName, // Use name as ID for consistency
            name: cachedSeries.name,
            books: cachedSeries.books.slice(0, 4),
            totalBooks: cachedSeries.bookCount,
            booksCompleted: 0,
            booksInProgress: 0,
            isFavorite: true,
          });
        }
      });
    }

    // Add series from downloaded books
    completedDownloads.forEach((download) => {
      const item = getItem(download.itemId);
      if (!item) return;

      const seriesName = extractSeriesName(item);
      if (!seriesName) return;

      if (seriesMap.has(seriesName)) {
        const series = seriesMap.get(seriesName)!;
        if (series.books.length < 4 && !series.books.find(b => b.id === item.id)) {
          series.books.push(item);
        }
        return;
      }

      // Try to get full series info from cache
      const cachedSeries = isCacheLoaded ? getSeries(seriesName) : null;

      seriesMap.set(seriesName, {
        id: seriesName,
        name: seriesName,
        books: cachedSeries ? cachedSeries.books.slice(0, 4) : [item],
        totalBooks: cachedSeries?.bookCount || 1,
        booksCompleted: 0,
        booksInProgress: 0,
        isFavorite: favoriteSeriesNames.includes(seriesName),
      });
    });

    // Then add series from in-progress items
    inProgressItems.forEach((item) => {
      // Extract series name from multiple possible sources
      const seriesName = extractSeriesName(item);
      if (!seriesName) return;

      // Skip if already added
      if (seriesMap.has(seriesName)) {
        const series = seriesMap.get(seriesName)!;
        if (series.books.length < 4 && !series.books.find(b => b.id === item.id)) {
          series.books.push(item);
        }
        series.booksInProgress++;
        return;
      }

      // Try to get full series info from cache
      const cachedSeries = isCacheLoaded ? getSeries(seriesName) : null;

      seriesMap.set(seriesName, {
        id: seriesName,
        name: seriesName,
        books: cachedSeries ? cachedSeries.books.slice(0, 4) : [item],
        totalBooks: cachedSeries?.bookCount || 1,
        booksCompleted: 0,
        booksInProgress: 1,
        isFavorite: favoriteSeriesNames.includes(seriesName),
      });
    });

    // Sort favorites first, then by whether they have downloaded books
    const seriesArray = Array.from(seriesMap.values());
    seriesArray.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0;
    });

    return seriesArray.slice(0, 10);
  }, [inProgressItems, completedDownloads, favoriteSeriesNames, isCacheLoaded, getSeries, getItem]);

  // Convert playlists to display format
  const userPlaylists: PlaylistDisplay[] = useMemo(() => {
    return playlists.slice(0, 10).map((playlist) => ({
      ...playlist,
      totalDuration: playlist.items.reduce((acc, item) => {
        const libraryItem = item.libraryItem;
        const itemDuration = libraryItem?.media
          ? (libraryItem.media as any).duration || 0
          : 0;
        return acc + itemDuration;
      }, 0),
      isFavorite: false,
    }));
  }, [playlists]);

  // =============================================================================
  // HOMEPAGE REDESIGN - Hero Card & Progress Data
  // =============================================================================

  /**
   * Hero Book - Primary resume target with enhanced chapter info
   * Prefers player's current book (if playing), otherwise most recent from server
   */
  const heroBook: HeroBookData | null = useMemo(() => {
    // Prefer player's current book when loaded (instant update on book switch)
    // Fall back to server's most recent if no book is loaded in player
    const book = playerCurrentBook || recentlyListened[0];
    if (!book) return null;
    // mediaProgress is attached by getItemsInProgress(), userMediaProgress is legacy
    const userProgress = (book as any).mediaProgress || (book as any).userMediaProgress;
    const bookDuration = (book.media as any)?.duration || 0;

    // Get progress - use player state if this is the current book
    let progress = userProgress?.progress || 0;
    let currentPosition = userProgress?.currentTime || 0;

    if (playerCurrentBook?.id === book.id) {
      currentPosition = position;
      progress = bookDuration > 0 ? position / bookDuration : 0;
    }

    // Calculate chapter info using existing utility
    const chapters: Chapter[] = (book.media?.chapters || []).map((ch: any, idx: number) => ({
      id: ch.id || idx,
      start: ch.start || 0,
      end: ch.end || bookDuration,
      title: ch.title || '',
    }));

    const totalChapters = chapters.length;
    let currentChapter = 1;

    if (chapters.length > 0) {
      const chapterInfo = findChapterForPosition(chapters, currentPosition);
      currentChapter = chapterInfo ? chapterInfo.index + 1 : 1;
    }

    // Calculate time remaining using existing utility
    const timeRemainingSeconds = calculateTimeRemaining(currentPosition, bookDuration);

    // Get narrator using existing utility
    const narratorName = getNarratorName(book);

    // Determine visual state based on progress
    let state: HeroBookState = 'in-progress';
    if (progress >= 0.95) {
      state = 'final-chapter';
    } else if (progress >= 0.75) {
      state = 'almost-done';
    }

    // Check if just finished (using existing utility)
    if (isBookComplete(currentPosition, bookDuration)) {
      state = 'just-finished';
    }

    return {
      book,
      progress,
      currentChapter,
      totalChapters,
      timeRemainingSeconds,
      narratorName,
      state,
    };
  }, [recentlyListened, playerCurrentBook, position]);

  /**
   * Continue Listening Grid - Other in-progress books excluding hero book
   * Filters by hero book ID to handle player vs server data mismatch
   */
  const continueListeningGrid: LibraryItem[] = useMemo(() => {
    // Get the hero book ID (player's current book takes priority)
    const heroBookId = playerCurrentBook?.id || recentlyListened[0]?.id;
    if (!heroBookId) return recentlyListened.slice(0, 6);

    // Filter out the hero book by ID and take up to 6
    return recentlyListened
      .filter((book) => book.id !== heroBookId)
      .slice(0, 6);
  }, [recentlyListened, playerCurrentBook]);

  /**
   * Series In Progress - Enhanced series data with per-book completion status
   * Derived from Continue Listening books, ordered by most recently listened
   */
  const seriesInProgress: EnhancedSeriesData[] = useMemo(() => {
    // Build a map of series -> most recent lastUpdate timestamp from in-progress books
    // Use both raw series name and cleaned name (without book number) for matching
    const seriesLastListened = new Map<string, number>();

    // Helper to extract clean series name (strips "#1" suffix)
    const cleanSeriesName = (name: string): string => {
      const match = name.match(/^(.+?)\s*#[\d.]+$/);
      return match ? match[1].trim() : name;
    };

    inProgressItems.forEach((item) => {
      const metadata = (item.media?.metadata as any) || {};

      // Try multiple sources for series name
      let seriesNames: string[] = [];

      // From seriesName field (e.g., "Series Name #1")
      if (metadata.seriesName) {
        seriesNames.push(metadata.seriesName);
        seriesNames.push(cleanSeriesName(metadata.seriesName));
      }

      // From series array
      const seriesInfo = metadata.series;
      if (seriesInfo?.length > 0) {
        const firstSeries = seriesInfo[0];
        const rawName = typeof firstSeries === 'object' ? firstSeries.name : firstSeries;
        if (rawName) {
          seriesNames.push(rawName);
          seriesNames.push(cleanSeriesName(rawName));
        }
      }

      // Add all variations to the map
      const lastUpdate = (item as any).mediaProgress?.lastUpdate || (item as any).userMediaProgress?.lastUpdate || 0;
      seriesNames.forEach((name) => {
        if (name) {
          const existing = seriesLastListened.get(name) || 0;
          if (lastUpdate > existing) {
            seriesLastListened.set(name, lastUpdate);
          }
        }
      });
    });

    return userSeries
      .filter((series) => seriesLastListened.has(series.name) || series.booksInProgress > 0)
      .map((series): EnhancedSeriesData & { lastListened: number } => {
        // Calculate per-book status
        const bookStatuses: BookStatus[] = series.books.map((book) => {
          const bookProgress = (book as any).mediaProgress?.progress || (book as any).userMediaProgress?.progress || 0;
          if (bookProgress >= 0.95) return 'done';
          if (bookProgress > 0) return 'current';
          return 'not-started';
        });

        // Find current book (first in-progress)
        const currentBookIndex = bookStatuses.findIndex((s) => s === 'current');
        const currentBook = currentBookIndex >= 0 ? series.books[currentBookIndex] : series.books[0];

        // Calculate series progress
        let totalDuration = 0;
        let listenedDuration = 0;
        series.books.forEach((book) => {
          const bookDuration = (book.media as any)?.duration || 0;
          const bookProgress = (book as any).mediaProgress?.progress || (book as any).userMediaProgress?.progress || 0;
          totalDuration += bookDuration;
          listenedDuration += bookDuration * bookProgress;
        });
        const seriesProgressPercent = totalDuration > 0 ? (listenedDuration / totalDuration) * 100 : 0;

        // Calculate time remaining for series
        let seriesTimeRemainingSeconds = 0;
        series.books.forEach((book) => {
          const bookDuration = (book.media as any)?.duration || 0;
          const bookProgress = (book as any).mediaProgress?.progress || (book as any).userMediaProgress?.progress || 0;
          seriesTimeRemainingSeconds += bookDuration * (1 - bookProgress);
        });

        return {
          ...series,
          bookStatuses,
          seriesProgressPercent,
          seriesTimeRemainingSeconds,
          currentBookTitle: getTitle(currentBook),
          currentBookIndex: currentBookIndex >= 0 ? currentBookIndex : 0,
          lastListened: seriesLastListened.get(series.name) || 0,
        };
      })
      // Sort by most recently listened (descending)
      .sort((a, b) => b.lastListened - a.lastListened)
      .slice(0, 5); // Limit to 5 series
  }, [userSeries, inProgressItems]);

  /**
   * Recently Added - Books with 0% progress for discovery
   * Sorted by when they were added to the library
   */
  const recentlyAdded: LibraryItem[] = useMemo(() => {
    // Get books with no progress (not started)
    const notStarted = libraryBooks.filter((book) => {
      const progress = (book as any).mediaProgress?.progress || (book as any).userMediaProgress?.progress || 0;
      return progress === 0;
    });

    // Sort by addedAt (most recent first)
    const sorted = notStarted.sort((a, b) => {
      const aAdded = (a as any).addedAt || 0;
      const bAdded = (b as any).addedAt || 0;
      return bAdded - aAdded;
    });

    // Apply Kid Mode filter and limit
    return filterForKidMode(sorted, kidModeEnabled).slice(0, 20);
  }, [libraryBooks, kidModeEnabled]);

  // Combined loading state (library books load instantly from cache, no loading state needed)
  const isLoading = isLoadingProgress || isLoadingPlaylists;

  // Refresh function - refetches all data
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchProgress(),
        refetchPlaylists(),
        refetchLibrary(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchProgress, refetchPlaylists, refetchLibrary]);

  return {
    currentBook,
    currentProgress,
    recentlyListened,
    recentBooks,
    userSeries,
    userPlaylists,
    // Homepage Redesign
    heroBook,
    continueListeningGrid,
    seriesInProgress,
    recentlyAdded,
    // State
    isLoading,
    isRefreshing,
    refresh,
  };
}
