/**
 * src/features/discover/hooks/useDiscoverData.ts
 *
 * Hook to fetch and organize discover page data:
 * - New This Week (recently added, not yet listened)
 * - Short & Sweet (short books, not yet listened)
 * - Personalized recommendations (based on reading history, excludes listened books)
 * - Mood-aware filtering when a mood session is active
 */

import { useMemo, useCallback, useState, useEffect, useDeferredValue } from 'react';
import { useLibraryCache, getAllGenres } from '@/core/cache';
import { useContinueListening } from '@/features/home/hooks/useContinueListening';
import { apiClient } from '@/core/api';
import { downloadManager } from '@/core/services/downloadManager';
import { useRecommendations } from '@/features/recommendations/hooks/useRecommendations';
import {
  ContentRow,
  BookSummary,
  HeroRecommendation,
  libraryItemToBookSummary,
  GENRE_CHIPS,
} from '../types';
import { LibraryItem } from '@/core/types';
import {
  MoodSession,
  MOODS,
  PACES,
  WEIGHTS,
  WORLDS,
  LENGTH_OPTIONS,
  Mood,
  ScoredBook,
} from '@/features/mood-discovery/types';
import { useMoodRecommendations } from '@/features/mood-discovery/hooks/useMoodRecommendations';

// Time constants
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SHORT_BOOK_THRESHOLD = 5 * 60 * 60; // 5 hours in seconds
const LONG_BOOK_THRESHOLD = 10 * 60 * 60; // 10 hours in seconds

// Context-aware recommendation reasons
function getTimeBasedReason(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'Perfect for your morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Great for your afternoon';
  } else if (hour >= 17 && hour < 21) {
    return 'Perfect for your evening';
  } else {
    return 'Perfect for winding down';
  }
}

// Generate mood-aware category title
function getMoodCategoryTitle(
  baseTitle: string,
  session: MoodSession
): string {
  // Get descriptive mood adjective
  const moodAdjective = getMoodAdjective(session.mood);

  // Get world label if set
  const worldLabel = session.world !== 'any'
    ? WORLDS.find((w) => w.id === session.world)?.label || ''
    : '';

  // Build descriptive title based on category
  switch (baseTitle) {
    case 'Not Started':
      if (worldLabel && moodAdjective) return `${moodAdjective} ${worldLabel} Picks`;
      if (moodAdjective) return `${moodAdjective} Picks for You`;
      if (worldLabel) return `${worldLabel} Awaiting You`;
      return 'Matching Your Mood';

    case 'New This Week':
      if (moodAdjective) return `New ${moodAdjective} Arrivals`;
      if (worldLabel) return `New ${worldLabel} This Week`;
      return 'New Mood Matches';

    case 'Short & Sweet':
      if (moodAdjective) return `Quick ${moodAdjective} Listens`;
      return 'Quick Mood Picks';

    case 'Long Listens':
      if (moodAdjective) return `Epic ${moodAdjective} Journeys`;
      if (worldLabel) return `Long ${worldLabel} Adventures`;
      return 'Long Mood Matches';

    case 'Continue Series':
      if (worldLabel) return `Continue ${worldLabel} Series`;
      return 'Continue Your Series';

    default:
      return baseTitle;
  }
}

// Get a natural adjective for mood types
function getMoodAdjective(mood?: Mood): string {
  switch (mood) {
    case 'comfort': return 'Cozy';
    case 'thrills': return 'Thrilling';
    case 'escape': return 'Escapist';
    case 'laughs': return 'Fun';
    case 'feels': return 'Emotional';
    case 'thinking': return 'Thought-Provoking';
    default: return '';
  }
}

// Get mood-aware hero reason
function getMoodHeroReason(session: MoodSession): string {
  const moodAdjective = getMoodAdjective(session.mood);
  const worldLabel = session.world !== 'any'
    ? WORLDS.find((w) => w.id === session.world)?.label
    : null;

  if (moodAdjective && worldLabel) {
    return `A ${moodAdjective.toLowerCase()} ${worldLabel.toLowerCase()} pick`;
  }
  if (moodAdjective) {
    return `Perfect for a ${moodAdjective.toLowerCase()} mood`;
  }
  if (worldLabel) {
    return `Top ${worldLabel.toLowerCase()} recommendation`;
  }
  return 'Matches your mood';
}

// Check if a book has been listened to (any progress)
function hasBeenListened(item: LibraryItem): boolean {
  const progress = (item as any).userMediaProgress?.progress || 0;
  return progress > 0;
}

export function useDiscoverData(
  selectedGenre: string = 'All',
  moodSession?: MoodSession | null
) {
  const { items: libraryItems, isLoaded, isLoading, refreshCache } = useLibraryCache();
  const { items: inProgressItems, isLoading: isLoadingProgress, refetch: refetchProgress } = useContinueListening();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  // Get personalized recommendations based on reading history
  const { groupedRecommendations, hasPreferences } = useRecommendations(libraryItems, 30);

  // Get mood-based recommendations when session is active
  const { recommendations: moodRecommendations, isLoading: isMoodLoading } = useMoodRecommendations({
    session: moodSession,
    minMatchPercent: 20,
    limit: 200,
  });

  // Defer mood value for smoother UI during rapid changes
  const deferredMood = useDeferredValue(moodSession?.mood ?? '');

  // Create a map of mood scores for quick lookup
  const moodScoreMap = useMemo(() => {
    const map = new Map<string, ScoredBook>();
    for (const rec of moodRecommendations) {
      map.set(rec.id, rec);
    }
    return map;
  }, [moodRecommendations]);

  // Check if mood session is active
  const hasMoodSession = !!(moodSession && moodSession.mood);

  // Subscribe to download status changes
  useEffect(() => {
    const unsubscribe = downloadManager.subscribe((tasks) => {
      const completed = new Set<string>();
      for (const task of tasks) {
        if (task.status === 'complete') {
          completed.add(task.itemId);
        }
      }
      setDownloadedIds(completed);
    });

    return () => unsubscribe();
  }, []);

  // Get all available genres from library
  const availableGenres = useMemo(() => {
    if (!isLoaded) return GENRE_CHIPS;
    const genres = getAllGenres();
    // Combine with default chips, prioritizing existing
    const genreSet = new Set(['All', ...genres.slice(0, 7)]);
    return Array.from(genreSet);
  }, [isLoaded]);

  // Convert library items to book summaries
  const convertToBookSummary = useCallback((item: LibraryItem, progress?: number): BookSummary => {
    const coverUrl = apiClient.getItemCoverUrl(item.id);
    const isDownloaded = downloadedIds.has(item.id);
    return libraryItemToBookSummary(item, coverUrl, { isDownloaded, progress });
  }, [downloadedIds]);

  // Filter by genre if selected
  const filterByGenre = useCallback((items: LibraryItem[], genre: string): LibraryItem[] => {
    if (genre === 'All') return items;
    return items.filter(item => {
      const metadata = (item.media?.metadata as any) || {};
      const genres: string[] = metadata.genres || [];
      return genres.some(g => g.toLowerCase().includes(genre.toLowerCase()));
    });
  }, []);

  // Filter and sort items by mood score (when mood session active)
  const filterByMood = useCallback((items: LibraryItem[], minMatchPercent: number = 20): LibraryItem[] => {
    if (!hasMoodSession) return items;

    // Filter to items that have a mood score above minimum
    const filtered = items.filter(item => {
      const score = moodScoreMap.get(item.id);
      return score && score.matchPercent >= minMatchPercent;
    });

    // Sort by mood score descending
    filtered.sort((a, b) => {
      const scoreA = moodScoreMap.get(a.id)?.matchPercent || 0;
      const scoreB = moodScoreMap.get(b.id)?.matchPercent || 0;
      return scoreB - scoreA;
    });

    return filtered;
  }, [hasMoodSession, moodScoreMap]);

  // New This Week row (only unlistened books)
  const newThisWeekRow = useMemo((): ContentRow | null => {
    if (!isLoaded || !libraryItems.length) return null;

    const oneWeekAgo = Date.now() - ONE_WEEK_MS;
    let newItems = libraryItems
      .filter(item => (item.addedAt || 0) * 1000 > oneWeekAgo)
      .filter(item => !hasBeenListened(item)) // Exclude listened books
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

    // Apply genre filter
    newItems = filterByGenre(newItems, selectedGenre);

    // Apply mood filter when session is active
    if (hasMoodSession && moodSession) {
      newItems = filterByMood(newItems, 30);
    }

    if (newItems.length === 0) return null;

    const items = newItems.slice(0, 15).map(item => convertToBookSummary(item));
    const title = hasMoodSession && moodSession
      ? getMoodCategoryTitle('New This Week', moodSession)
      : 'New This Week';

    return {
      id: 'new_this_week',
      type: 'new_this_week',
      title,
      items,
      totalCount: newItems.length,
      seeAllRoute: 'MyLibrary',
      priority: 3,
      refreshPolicy: 'daily',
    };
  }, [libraryItems, isLoaded, selectedGenre, filterByGenre, filterByMood, convertToBookSummary, hasMoodSession, moodSession]);

  // Short & Sweet row (books under 5 hours, only unlistened)
  const shortBooksRow = useMemo((): ContentRow | null => {
    if (!isLoaded || !libraryItems.length) return null;

    let shortItems = libraryItems
      .filter(item => {
        const duration = (item.media as any)?.duration || 0;
        return duration > 0 && duration < SHORT_BOOK_THRESHOLD;
      })
      .filter(item => !hasBeenListened(item)) // Exclude listened books
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

    // Apply genre filter
    shortItems = filterByGenre(shortItems, selectedGenre);

    // Apply mood filter when session is active
    if (hasMoodSession && moodSession) {
      shortItems = filterByMood(shortItems, 30);
    }

    if (shortItems.length === 0) return null;

    const items = shortItems.slice(0, 15).map(item => convertToBookSummary(item));
    const title = hasMoodSession && moodSession
      ? getMoodCategoryTitle('Short & Sweet', moodSession)
      : 'Short & Sweet';

    return {
      id: 'short_books',
      type: 'short_books',
      title,
      subtitle: 'Under 5 hours',
      items,
      totalCount: shortItems.length,
      seeAllRoute: 'MyLibrary',
      priority: 8,
      refreshPolicy: 'daily',
    };
  }, [libraryItems, isLoaded, selectedGenre, filterByGenre, filterByMood, convertToBookSummary, hasMoodSession, moodSession]);

  // Long Listens row (books over 10 hours, only unlistened)
  const longBooksRow = useMemo((): ContentRow | null => {
    if (!isLoaded || !libraryItems.length) return null;

    let longItems = libraryItems
      .filter(item => {
        const duration = (item.media as any)?.duration || 0;
        return duration >= LONG_BOOK_THRESHOLD;
      })
      .filter(item => !hasBeenListened(item)) // Exclude listened books
      .sort((a, b) => {
        const durationA = (a.media as any)?.duration || 0;
        const durationB = (b.media as any)?.duration || 0;
        return durationB - durationA; // Longest first
      });

    // Apply genre filter
    longItems = filterByGenre(longItems, selectedGenre);

    // Apply mood filter when session is active
    if (hasMoodSession && moodSession) {
      longItems = filterByMood(longItems, 30);
    }

    if (longItems.length === 0) return null;

    const items = longItems.slice(0, 15).map(item => convertToBookSummary(item));
    const title = hasMoodSession && moodSession
      ? getMoodCategoryTitle('Long Listens', moodSession)
      : 'Long Listens';

    return {
      id: 'long_listens',
      type: 'first_listens',
      title,
      subtitle: 'Over 10 hours',
      items,
      totalCount: longItems.length,
      seeAllRoute: 'MyLibrary',
      priority: 9,
      refreshPolicy: 'daily',
    };
  }, [libraryItems, isLoaded, selectedGenre, filterByGenre, filterByMood, convertToBookSummary, hasMoodSession, moodSession]);

  // Not Started row (books never played at all)
  const notStartedRow = useMemo((): ContentRow | null => {
    if (!isLoaded || !libraryItems.length) return null;

    let unplayed = libraryItems
      .filter(item => !hasBeenListened(item))
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

    // Apply genre filter
    unplayed = filterByGenre(unplayed, selectedGenre);

    // Apply mood filter when session is active
    if (hasMoodSession && moodSession) {
      unplayed = filterByMood(unplayed, 30);
    }

    if (unplayed.length === 0) return null;

    const items = unplayed.slice(0, 15).map(item => convertToBookSummary(item));
    const title = hasMoodSession && moodSession
      ? getMoodCategoryTitle('Not Started', moodSession)
      : 'Not Started';

    return {
      id: 'not_started',
      type: 'first_listens',
      title,
      subtitle: hasMoodSession ? 'Matching your mood' : 'Waiting for you',
      items,
      totalCount: unplayed.length,
      seeAllRoute: 'MyLibrary',
      priority: 5,
      refreshPolicy: 'daily',
    };
  }, [libraryItems, isLoaded, selectedGenre, filterByGenre, filterByMood, convertToBookSummary, hasMoodSession, moodSession]);

  // Continue Series row (next book in series user is reading)
  const continueSeriesRow = useMemo((): ContentRow | null => {
    if (!isLoaded || !libraryItems.length || !inProgressItems.length) return null;

    // Get series from in-progress books
    const seriesFromProgress = new Map<string, { seriesName: string; sequence: number; bookId: string }>();

    for (const item of inProgressItems) {
      const metadata = (item.media?.metadata as any) || {};
      const series = metadata.series?.[0];
      if (series?.name && series?.sequence) {
        const existing = seriesFromProgress.get(series.name);
        if (!existing || series.sequence > existing.sequence) {
          seriesFromProgress.set(series.name, {
            seriesName: series.name,
            sequence: parseFloat(series.sequence) || 0,
            bookId: item.id,
          });
        }
      }
    }

    if (seriesFromProgress.size === 0) return null;

    // Find next books in each series
    let nextBooks: LibraryItem[] = [];

    for (const [seriesName, progress] of seriesFromProgress) {
      // Find next book in this series (sequence > progress.sequence)
      const nextInSeries = libraryItems.find(item => {
        const metadata = (item.media?.metadata as any) || {};
        const series = metadata.series?.[0];
        if (!series?.name || series.name !== seriesName) return false;
        const seq = parseFloat(series.sequence) || 0;
        return seq > progress.sequence && !hasBeenListened(item);
      });

      if (nextInSeries) {
        nextBooks.push(nextInSeries);
      }
    }

    // Apply mood filter when session is active
    if (hasMoodSession && moodSession) {
      nextBooks = filterByMood(nextBooks, 20); // Lower threshold for series
    }

    if (nextBooks.length === 0) return null;

    const items = nextBooks.slice(0, 15).map(item => convertToBookSummary(item));
    const title = hasMoodSession && moodSession
      ? getMoodCategoryTitle('Continue Series', moodSession)
      : 'Continue Series';

    return {
      id: 'continue_series',
      type: 'series_continue',
      title,
      subtitle: hasMoodSession ? 'Series matching your mood' : 'Your next chapters',
      items,
      totalCount: nextBooks.length,
      seeAllRoute: 'MyLibrary',
      priority: 4, // High priority, after recommendations
      refreshPolicy: 'realtime',
    };
  }, [libraryItems, inProgressItems, isLoaded, convertToBookSummary, hasMoodSession, moodSession, filterByMood]);

  // Personalized recommendations rows (based on reading history and preferences)
  const recommendationRows = useMemo((): ContentRow[] => {
    if (!isLoaded || !hasPreferences || groupedRecommendations.length === 0) return [];

    return groupedRecommendations.map((group, index) => ({
      id: `recommendation_${index}`,
      type: 'recommended' as const,
      title: group.title,
      subtitle: 'Based on your listening history',
      items: group.items.slice(0, 15).map(item => convertToBookSummary(item)),
      totalCount: group.items.length,
      seeAllRoute: 'MyLibrary',
      priority: 2 + index * 0.5, // High priority, right after continue listening
      refreshPolicy: 'daily' as const,
    }));
  }, [isLoaded, hasPreferences, groupedRecommendations, convertToBookSummary]);

  // Hero recommendation (show top unlistened recommendation)
  const hero = useMemo((): HeroRecommendation | null => {
    if (!isLoaded || !libraryItems.length) return null;

    // Get unlistened books
    const unlistenedBooks = libraryItems.filter(item => !hasBeenListened(item));
    if (unlistenedBooks.length === 0) return null;

    let heroBook: LibraryItem | null = null;
    let heroType: HeroRecommendation['type'] = 'personalized';
    let reason = getTimeBasedReason();

    // When mood session is active, use top mood recommendation
    if (hasMoodSession && moodSession && moodRecommendations.length > 0) {
      const topMoodMatch = moodRecommendations[0];
      heroBook = libraryItems.find(item => item.id === topMoodMatch.id) || null;
      if (heroBook) {
        heroType = 'personalized';
        reason = getMoodHeroReason(moodSession);
      }
    }

    // Fall back to regular recommendations if no mood hero
    if (!heroBook) {
      // Try to use top recommendation (if available)
      if (groupedRecommendations.length > 0 && groupedRecommendations[0].items.length > 0) {
        heroBook = groupedRecommendations[0].items[0];
        reason = 'Recommended for you';
      }
      // Otherwise use newest unlistened book
      else {
        const sorted = [...unlistenedBooks].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        heroBook = sorted[0];
        heroType = 'new';
        reason = 'New to your library';
      }
    }

    if (!heroBook) return null;

    return {
      book: convertToBookSummary(heroBook),
      reason,
      type: heroType,
    };
  }, [libraryItems, isLoaded, convertToBookSummary, groupedRecommendations, hasMoodSession, moodSession, moodRecommendations]);

  // Organize rows by priority
  const rows = useMemo((): ContentRow[] => {
    const staticRows = [
      newThisWeekRow,
      continueSeriesRow,
      notStartedRow,
      shortBooksRow,
      longBooksRow,
    ].filter((row): row is ContentRow => row !== null);

    // Combine with recommendation rows (recommendations first)
    const allRows = [...recommendationRows, ...staticRows];

    // Sort by priority
    return allRows.sort((a, b) => a.priority - b.priority);
  }, [newThisWeekRow, continueSeriesRow, notStartedRow, shortBooksRow, longBooksRow, recommendationRows]);

  // Refresh handler
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshCache(),
        refetchProgress(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshCache, refetchProgress]);

  return {
    rows,
    hero,
    availableGenres,
    isLoading: isLoading || isLoadingProgress || (hasMoodSession && isMoodLoading),
    isRefreshing,
    refresh,
    hasMoodSession,
  };
}
