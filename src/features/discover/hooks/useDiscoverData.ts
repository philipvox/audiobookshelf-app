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
import { useLibraryCache, getGenresByPopularity } from '@/core/cache';
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
  SourceAttribution,
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
import { useReadingHistory } from '@/features/reading-history-wizard';
import { createSeriesFilter } from '@/shared/utils/seriesFilter';

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

export function useDiscoverData(
  selectedGenre: string = 'All',
  moodSession?: MoodSession | null
) {
  const { items: libraryItems, isLoaded, isLoading, refreshCache } = useLibraryCache();
  const { items: inProgressItems, isLoading: isLoadingProgress, refetch: refetchProgress } = useContinueListening();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  // Get reading history for filtering finished books and preference boosts
  const { isFinished, hasBeenStarted, getPreferenceBoost, hasHistory } = useReadingHistory();

  // Create series filter - only show first book or next book in series
  const isSeriesAppropriate = useMemo(() => {
    if (!libraryItems.length) return () => true;
    return createSeriesFilter({
      allItems: libraryItems,
      isFinished,
      hasStarted: hasBeenStarted,
    });
  }, [libraryItems, isFinished, hasBeenStarted]);

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
  // FIX 5: Include libraryItems in dependencies to avoid stale data
  // when books are added/removed from the library
  const moodScoreMap = useMemo(() => {
    const map = new Map<string, ScoredBook>();
    for (const rec of moodRecommendations) {
      map.set(rec.id, rec);
    }
    return map;
  }, [moodRecommendations, libraryItems]);

  // Check if mood session is active AND not expired
  // FIX 3: Add real-time expiry check (24-hour sessions)
  const hasMoodSession = !!(
    moodSession &&
    moodSession.mood &&
    (!moodSession.expiresAt || Date.now() < moodSession.expiresAt)
  );

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

  // Get all available genres from library, sorted by popularity (book count)
  const availableGenres = useMemo(() => {
    if (!isLoaded) return GENRE_CHIPS;
    // Get genres sorted by book count (most popular first)
    const genreInfos = getGenresByPopularity();
    // Take top 7 most popular genres
    const topGenres = genreInfos.slice(0, 7).map(g => g.name);
    return ['All', ...topGenres];
  }, [isLoaded, libraryItems]);

  // Convert library items to book summaries
  const convertToBookSummary = useCallback((item: LibraryItem, progress?: number): BookSummary => {
    const coverUrl = apiClient.getItemCoverUrl(item.id);
    const isDownloaded = downloadedIds.has(item.id);
    return libraryItemToBookSummary(item, coverUrl, { isDownloaded, progress });
  }, [downloadedIds]);

  // Filter by genre if selected
  // FIX 2: Use word-boundary matching to prevent over-matching
  // e.g., "Mystery" should match "Mystery" and "Mystery Thriller" but not
  // "Cozy Mystery Romance" when filtering for "Romance"
  const filterByGenre = useCallback((items: LibraryItem[], genre: string): LibraryItem[] => {
    if (genre === 'All') return items;

    const filterGenre = genre.toLowerCase();

    return items.filter(item => {
      const metadata = (item.media?.metadata as any) || {};
      const genres: string[] = metadata.genres || [];
      return genres.some(g => genreMatches(g, filterGenre));
    });
  }, []);

  // Helper for word-boundary genre matching
  function genreMatches(itemGenre: string, filterGenre: string): boolean {
    const item = itemGenre.toLowerCase();

    // Exact match
    if (item === filterGenre) return true;

    // Starts with filter + space ("mystery" matches "mystery thriller")
    if (item.startsWith(filterGenre + ' ')) return true;

    // Ends with space + filter ("cozy mystery" matches "mystery")
    if (item.endsWith(' ' + filterGenre)) return true;

    // Contains space + filter + space ("epic fantasy adventure" matches "fantasy")
    if (item.includes(' ' + filterGenre + ' ')) return true;

    return false;
  }

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
      .filter(item => !isFinished(item.id)) // Exclude finished books (local + server)
      .filter(isSeriesAppropriate) // Only first/next book in series
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
      subtitle: 'Recently added to your library',
      items,
      totalCount: newItems.length,
      seeAllRoute: 'FilteredBooks',
      filterType: hasMoodSession ? 'mood_matched' : 'new_this_week',
      filterParams: { genre: selectedGenre !== 'All' ? selectedGenre : undefined },
      priority: 3,
      refreshPolicy: 'daily',
      displayMode: 'carousel', // Horizontal scroll for recent arrivals
    };
  }, [libraryItems, isLoaded, selectedGenre, filterByGenre, filterByMood, convertToBookSummary, hasMoodSession, moodSession, isFinished, isSeriesAppropriate]);

  // Short & Sweet row (books under 5 hours, only unlistened)
  const shortBooksRow = useMemo((): ContentRow | null => {
    if (!isLoaded || !libraryItems.length) return null;

    let shortItems = libraryItems
      .filter(item => {
        const duration = (item.media as any)?.duration || 0;
        return duration > 0 && duration < SHORT_BOOK_THRESHOLD;
      })
      .filter(item => !isFinished(item.id)) // Exclude finished books (local + server)
      .filter(isSeriesAppropriate) // Only first/next book in series
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
      title: hasMoodSession && moodSession
        ? getMoodCategoryTitle('Short & Sweet', moodSession)
        : 'Quick Listens',
      subtitle: 'Finish in a day or two',
      items,
      totalCount: shortItems.length,
      seeAllRoute: 'FilteredBooks',
      filterType: hasMoodSession ? 'mood_matched' : 'short_books',
      filterParams: { genre: selectedGenre !== 'All' ? selectedGenre : undefined },
      priority: 8,
      refreshPolicy: 'daily',
      displayMode: 'carousel',
    };
  }, [libraryItems, isLoaded, selectedGenre, filterByGenre, filterByMood, convertToBookSummary, hasMoodSession, moodSession, isFinished, isSeriesAppropriate]);

  // Long Listens row (books over 10 hours, only unlistened)
  const longBooksRow = useMemo((): ContentRow | null => {
    if (!isLoaded || !libraryItems.length) return null;

    let longItems = libraryItems
      .filter(item => {
        const duration = (item.media as any)?.duration || 0;
        return duration >= LONG_BOOK_THRESHOLD;
      })
      .filter(item => !isFinished(item.id)) // Exclude finished books (local + server)
      .filter(isSeriesAppropriate) // Only first/next book in series
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
      title: hasMoodSession && moodSession
        ? getMoodCategoryTitle('Long Listens', moodSession)
        : 'Epic Journeys',
      subtitle: 'Settle in for the long haul',
      items,
      totalCount: longItems.length,
      seeAllRoute: 'FilteredBooks',
      filterType: hasMoodSession ? 'mood_matched' : 'long_listens',
      filterParams: { genre: selectedGenre !== 'All' ? selectedGenre : undefined },
      priority: 9,
      refreshPolicy: 'daily',
      displayMode: 'carousel',
    };
  }, [libraryItems, isLoaded, selectedGenre, filterByGenre, filterByMood, convertToBookSummary, hasMoodSession, moodSession, isFinished, isSeriesAppropriate]);

  // Not Started row (books never played at all)
  const notStartedRow = useMemo((): ContentRow | null => {
    if (!isLoaded || !libraryItems.length) return null;

    let unplayed = libraryItems
      .filter(item => !isFinished(item.id))
      .filter(isSeriesAppropriate) // Only first/next book in series
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
      title: hasMoodSession && moodSession
        ? getMoodCategoryTitle('Not Started', moodSession)
        : 'Ready to Start',
      subtitle: hasMoodSession ? 'Matching your mood' : 'Waiting in your library',
      items,
      totalCount: unplayed.length,
      seeAllRoute: 'FilteredBooks',
      filterType: hasMoodSession ? 'mood_matched' : 'not_started',
      filterParams: { genre: selectedGenre !== 'All' ? selectedGenre : undefined },
      priority: 5,
      refreshPolicy: 'daily',
      displayMode: 'carousel',
    };
  }, [libraryItems, isLoaded, selectedGenre, filterByGenre, filterByMood, convertToBookSummary, hasMoodSession, moodSession, isFinished, isSeriesAppropriate]);

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
        return seq > progress.sequence && !isFinished(item.id);
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
      title: hasMoodSession && moodSession
        ? getMoodCategoryTitle('Continue Series', moodSession)
        : 'Your Next Chapter',
      subtitle: hasMoodSession ? 'Series matching your mood' : 'Continue where you left off',
      items,
      totalCount: nextBooks.length,
      seeAllRoute: 'FilteredBooks',
      filterType: 'continue_series',
      priority: 4, // High priority, after recommendations
      refreshPolicy: 'realtime',
      displayMode: 'carousel', // Horizontal scroll for series continuation
    };
  }, [libraryItems, inProgressItems, isLoaded, convertToBookSummary, hasMoodSession, moodSession, filterByMood, isFinished]);

  // Personalized recommendations rows (based on reading history and preferences)
  // FIX 4: Cap to prevent priority collisions with other rows
  const MAX_RECOMMENDATION_GROUPS = 3; // Priorities 2.0, 2.3, 2.6 (all < 3)

  const recommendationRows = useMemo((): ContentRow[] => {
    // Show recommendations for ALL users - don't gate on hasPreferences
    // The recommendation engine uses random scoring to ensure variety even for new users
    if (!isLoaded || groupedRecommendations.length === 0) return [];

    // Cap to MAX_RECOMMENDATION_GROUPS to avoid priority collision with other rows
    const cappedGroups = groupedRecommendations.slice(0, MAX_RECOMMENDATION_GROUPS);

    return cappedGroups.map((group, index) => {
      // Generate specific title based on source attribution
      let title = group.title;
      let sourceAttribution: SourceAttribution | undefined;

      if (group.sourceAttribution) {
        const { itemTitle, type } = group.sourceAttribution;

        switch (type) {
          case 'finished':
            // "Because you finished The Blade Itself"
            title = `Because you finished ${itemTitle}`;
            sourceAttribution = {
              itemId: group.sourceAttribution.itemId,
              itemTitle,
              type: 'finished',
            };
            break;

          case 'listening':
            // "More like The Way of Kings"
            title = `More like ${itemTitle}`;
            sourceAttribution = {
              itemId: group.sourceAttribution.itemId,
              itemTitle,
              type: 'listening',
            };
            break;

          case 'genre':
            // "Because you love Mystery"
            title = `Because you love ${itemTitle}`;
            sourceAttribution = {
              itemId: '',
              itemTitle,
              type: 'genre',
            };
            break;

          case 'author':
            // "More by Brandon Sanderson"
            title = `More by ${itemTitle}`;
            sourceAttribution = {
              itemId: '',
              itemTitle,
              type: 'author',
            };
            break;

          case 'narrator':
            // "Narrated by Steven Pacey"
            title = `Narrated by ${itemTitle}`;
            sourceAttribution = {
              itemId: '',
              itemTitle,
              type: 'narrator',
            };
            break;
        }
      }

      return {
        id: `recommendation_${index}`,
        type: 'recommended' as const,
        title,
        subtitle: undefined, // No generic subtitle, title is self-explanatory
        items: group.items.slice(0, 15).map(item => convertToBookSummary(item)),
        totalCount: group.items.length,
        seeAllRoute: 'FilteredBooks',
        filterType: 'recommended' as const,
        priority: 2 + index * 0.3, // Priorities: 2.0, 2.3, 2.6 (all before 3.0)
        refreshPolicy: 'daily' as const,
        displayMode: index === 0 ? 'featured' : 'carousel', // Only first row is 2-col grid
        sourceAttribution,
      };
    });
  }, [isLoaded, groupedRecommendations, convertToBookSummary]);

  // Serendipity Row - "Try Something Different"
  // Show books OUTSIDE user's comfort zone with quality signals
  const serendipityRow = useMemo((): ContentRow | null => {
    if (!isLoaded || !libraryItems.length) return null;
    // Only show serendipity if user has some reading history (so we know what to avoid)
    if (!hasHistory) return null;

    // Get user's usual genres from reading history for exclusion
    const usualGenres = new Set<string>();
    libraryItems.forEach(item => {
      const progress = (item as any).userMediaProgress?.progress || 0;
      const itemFinished = (item as any).userMediaProgress?.isFinished === true || progress >= 0.95;
      if (progress > 0.1 || itemFinished) {
        const metadata = (item.media?.metadata as any) || {};
        const genres: string[] = metadata.genres || [];
        genres.forEach(g => usualGenres.add(g.toLowerCase()));
      }
    });

    // Find books in genres user HASN'T explored yet
    let serendipityItems = libraryItems
      .filter(item => {
        // Must not be started or finished
        const progress = (item as any).userMediaProgress?.progress || 0;
        if (progress > 0) return false;
        if (isFinished(item.id)) return false;

        // Must not be in user's usual genres
        const metadata = (item.media?.metadata as any) || {};
        const genres: string[] = metadata.genres || [];
        const hasUsualGenre = genres.some(g => usualGenres.has(g.toLowerCase()));
        // Serendipity = NO overlap with usual genres
        return !hasUsualGenre && genres.length > 0;
      })
      .filter(isSeriesAppropriate);

    // Sort by quality signals (e.g., duration as proxy for "substantial" books)
    // In a real app, this would be by ratings/popularity
    serendipityItems.sort((a, b) => {
      const durationA = (a.media as any)?.duration || 0;
      const durationB = (b.media as any)?.duration || 0;
      // Prefer medium-length books (8-15 hours) for serendipity
      const idealA = Math.abs(durationA - 12 * 3600);
      const idealB = Math.abs(durationB - 12 * 3600);
      return idealA - idealB;
    });

    // Add some randomness to keep it fresh
    const shuffled = serendipityItems.slice(0, 20);
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Take top 4 for the row
    const finalItems = shuffled.slice(0, 4);
    if (finalItems.length < 2) return null; // Need at least 2 for a meaningful row

    // Mark items as serendipity for special visual treatment
    const items = finalItems.map(item => ({
      ...convertToBookSummary(item),
      isSerendipity: true,
    }));

    return {
      id: 'serendipity',
      type: 'recommended' as const,
      title: 'Try Something Different',
      subtitle: 'Venture outside your usual genres',
      items,
      totalCount: serendipityItems.length,
      seeAllRoute: 'FilteredBooks',
      filterType: 'recommended' as const,
      priority: 6, // After main recommendations and continue series
      refreshPolicy: 'daily' as const,
      isSerendipity: true,
      displayMode: 'carousel',
      sourceAttribution: {
        itemId: '',
        itemTitle: 'Serendipity',
        type: 'serendipity',
      },
    };
  }, [libraryItems, isLoaded, convertToBookSummary, isFinished, isSeriesAppropriate, hasHistory]);

  // Hero recommendation (show top unlistened recommendation)
  const hero = useMemo((): HeroRecommendation | null => {
    if (!isLoaded || !libraryItems.length) return null;

    // Get unfinished books
    const unfinishedBooks = libraryItems.filter(item => !isFinished(item.id));
    if (unfinishedBooks.length === 0) return null;

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
      // Otherwise use newest unfinished book
      else {
        const sorted = [...unfinishedBooks].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
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
  }, [libraryItems, isLoaded, convertToBookSummary, groupedRecommendations, hasMoodSession, moodSession, moodRecommendations, isFinished]);

  // Organize rows by priority
  // Priority order: Recommendations (2.x), New This Week (3), Continue Series (4),
  // Not Started (5), Serendipity (6), Short & Sweet (8), Long Listens (9)
  const rows = useMemo((): ContentRow[] => {
    const staticRows = [
      newThisWeekRow,
      continueSeriesRow,
      notStartedRow,
      serendipityRow,
      shortBooksRow,
      longBooksRow,
    ].filter((row): row is ContentRow => row !== null);

    // Combine with recommendation rows (recommendations first)
    const allRows = [...recommendationRows, ...staticRows];

    // Sort by priority
    return allRows.sort((a, b) => a.priority - b.priority);
  }, [newThisWeekRow, continueSeriesRow, notStartedRow, serendipityRow, shortBooksRow, longBooksRow, recommendationRows]);

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
    hasPreferences, // Whether user has onboarding OR reading history (for promo card)
  };
}
