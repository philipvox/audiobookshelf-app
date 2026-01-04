/**
 * src/features/recommendations/hooks/useRecommendations.ts
 *
 * Generate personalized recommendations based on user preferences
 * and reading history (completed books have higher weight)
 */

import { useMemo, useState, useEffect } from 'react';
import { LibraryItem } from '@/core/types';
import { usePreferencesStore } from '../stores/preferencesStore';
import { useMyLibraryStore } from '@/features/library';
import { sqliteCache } from '@/core/services/sqliteCache';
import { getGenres, getAuthorName, getNarratorName, getSeriesName, getDuration } from '@/shared/utils/metadata';
import { createSeriesFilter } from '@/shared/utils/seriesFilter';
import { useDismissedItemsStore, useDismissedIds } from '../stores/dismissedItemsStore';

interface ReadHistoryStats {
  totalBooksRead: number;
  favoriteAuthors: { name: string; count: number }[];
  favoriteNarrators: { name: string; count: number }[];
  favoriteGenres: { name: string; count: number }[];
  // Source attribution for "Because you finished X" titles
  mostRecentFinished?: {
    id: string;
    title: string;
    author: string;
    finishedAt: number;
  };
  // Currently listening for "More like X" titles
  currentlyListening?: Array<{
    id: string;
    title: string;
    progress: number;
  }>;
}

interface ListeningHistoryStats {
  totalBooksInProgress: number;
  listeningAuthors: { name: string; count: number }[];
  listeningNarrators: { name: string; count: number }[];
  listeningGenres: { name: string; count: number }[];
}

interface ScoredItem {
  item: LibraryItem;
  score: number;
  reasons: string[];
}

// Source attribution for personalized row titles
export interface RecommendationSourceAttribution {
  itemId: string;
  itemTitle: string;
  type: 'finished' | 'listening' | 'author' | 'narrator' | 'genre';
}

export interface RecommendationGroup {
  title: string;
  items: LibraryItem[];
  sourceAttribution?: RecommendationSourceAttribution;
}

export function useRecommendations(allItems: LibraryItem[], limit: number = 20) {
  // Select individual properties to avoid infinite re-render loop from store object reference changes
  const favoriteGenres = usePreferencesStore((s) => s.favoriteGenres);
  const favoriteAuthors = usePreferencesStore((s) => s.favoriteAuthors);
  const favoriteNarrators = usePreferencesStore((s) => s.favoriteNarrators);
  const prefersSeries = usePreferencesStore((s) => s.prefersSeries);
  const preferredLength = usePreferencesStore((s) => s.preferredLength);
  const moods = usePreferencesStore((s) => s.moods);
  const hasCompletedOnboarding = usePreferencesStore((s) => s.hasCompletedOnboarding);

  const libraryIds = useMyLibraryStore((s) => s.libraryIds);

  // Get dismissed items to filter from recommendations
  const dismissedIds = useDismissedIds();

  // Load read history stats for weighted scoring (finished books from SQLite)
  const [historyStats, setHistoryStats] = useState<ReadHistoryStats | null>(null);
  const [finishedBookIds, setFinishedBookIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load finished books stats from SQLite read_history table
    sqliteCache.getReadHistoryStats().then(setHistoryStats).catch(() => {});
    // Load finished book IDs for series filtering
    sqliteCache.getFinishedUserBooks().then(books => {
      setFinishedBookIds(new Set(books.map(b => b.bookId)));
    }).catch(() => {});
  }, []);

  // Build listening stats directly from library items (more reliable than SQLite user_books)
  // This captures in-progress books with their metadata
  const listeningStats = useMemo((): ListeningHistoryStats | null => {
    if (!allItems.length) return null;

    const authorCounts = new Map<string, number>();
    const narratorCounts = new Map<string, number>();
    const genreCounts = new Map<string, number>();
    let totalInProgress = 0;

    for (const item of allItems) {
      const progress = (item as any).userMediaProgress?.progress || 0;
      const isItemFinished = (item as any).userMediaProgress?.isFinished === true || progress >= 0.95;

      // Only count in-progress books (started but not finished)
      if (progress > 0 && !isItemFinished) {
        totalInProgress++;

        const author = getAuthorName(item);
        const narrator = getNarratorName(item);
        const genres = getGenres(item);

        if (author) {
          authorCounts.set(author.toLowerCase(), (authorCounts.get(author.toLowerCase()) || 0) + 1);
        }
        if (narrator) {
          narratorCounts.set(narrator.toLowerCase(), (narratorCounts.get(narrator.toLowerCase()) || 0) + 1);
        }
        for (const genre of genres) {
          genreCounts.set(genre.toLowerCase(), (genreCounts.get(genre.toLowerCase()) || 0) + 1);
        }
      }
    }

    if (totalInProgress === 0) return null;

    // Convert to sorted arrays
    const listeningAuthors = Array.from(authorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const listeningNarrators = Array.from(narratorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const listeningGenres = Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return {
      totalBooksInProgress: totalInProgress,
      listeningAuthors,
      listeningNarrators,
      listeningGenres,
    };
  }, [allItems]);

  const recommendations = useMemo(() => {
    if (!allItems.length) return [];

    // Helper to check if a book is finished
    const isFinished = (bookId: string): boolean => {
      if (finishedBookIds.has(bookId)) return true;
      const item = allItems.find(i => i.id === bookId);
      if (!item) return false;
      const progress = (item as any).userMediaProgress?.progress || 0;
      const serverFinished = (item as any).userMediaProgress?.isFinished === true;
      return progress >= 0.95 || serverFinished;
    };

    // Helper to check if a book has been started
    const hasStarted = (bookId: string): boolean => {
      const item = allItems.find(i => i.id === bookId);
      if (!item) return false;
      const progress = (item as any).userMediaProgress?.progress || 0;
      return progress > 0;
    };

    // Create series filter - only recommend first book or next book in series
    const isSeriesAppropriate = createSeriesFilter({
      allItems,
      isFinished,
      hasStarted,
    });

    // Filter out items already in user's library AND items with any progress (listened to)
    const availableItems = allItems.filter(item => {
      // Exclude items in user's library (downloaded/saved)
      if (libraryIds.includes(item.id)) return false;
      // Exclude items the user has started listening to
      const progress = (item as any).userMediaProgress?.progress || 0;
      if (progress > 0) return false;
      // Exclude middle-of-series books (only show first book or next book)
      if (!isSeriesAppropriate(item)) return false;
      // Exclude dismissed items ("Not Interested")
      if (dismissedIds.includes(item.id)) return false;
      return true;
    });

    // Create lookup maps for history-based scoring (finished books)
    const historyAuthorWeights = new Map<string, number>();
    const historyNarratorWeights = new Map<string, number>();
    const historyGenreWeights = new Map<string, number>();

    if (historyStats) {
      historyStats.favoriteAuthors.forEach(({ name, count }) => {
        historyAuthorWeights.set(name.toLowerCase(), count);
      });
      historyStats.favoriteNarrators.forEach(({ name, count }) => {
        historyNarratorWeights.set(name.toLowerCase(), count);
      });
      historyStats.favoriteGenres.forEach(({ name, count }) => {
        historyGenreWeights.set(name.toLowerCase(), count);
      });
    }

    // Create lookup maps for listening history (in-progress books)
    // These get slightly lower weights than finished books
    const listeningAuthorWeights = new Map<string, number>();
    const listeningNarratorWeights = new Map<string, number>();
    const listeningGenreWeights = new Map<string, number>();

    if (listeningStats) {
      listeningStats.listeningAuthors.forEach(({ name, count }) => {
        listeningAuthorWeights.set(name.toLowerCase(), count);
      });
      listeningStats.listeningNarrators.forEach(({ name, count }) => {
        listeningNarratorWeights.set(name.toLowerCase(), count);
      });
      listeningStats.listeningGenres.forEach(({ name, count }) => {
        listeningGenreWeights.set(name.toLowerCase(), count);
      });
    }

    // Score each item
    const scoredItems: ScoredItem[] = availableItems.map(item => {
      let score = 0;
      const reasons: string[] = [];

      const genres = getGenres(item);
      const author = getAuthorName(item);
      const narrator = getNarratorName(item);
      const series = getSeriesName(item);
      const duration = getDuration(item);

      // === READ HISTORY BOOSTING (highest priority - based on completed books) ===

      // Author boost from read history (weight: 40 * multiplier based on times read)
      const authorHistoryWeight = historyAuthorWeights.get(author.toLowerCase()) || 0;
      if (authorHistoryWeight > 0) {
        const boost = Math.min(40 + authorHistoryWeight * 10, 80); // Cap at 80
        score += boost;
        reasons.push(`More by ${author} (you've read ${authorHistoryWeight} of their books)`);
      }

      // Narrator boost from read history
      const narratorHistoryWeight = historyNarratorWeights.get(narrator.toLowerCase()) || 0;
      if (narratorHistoryWeight > 0) {
        const boost = Math.min(30 + narratorHistoryWeight * 8, 60); // Cap at 60
        score += boost;
        if (!reasons.some(r => r.includes(narrator))) {
          reasons.push(`Narrated by ${narrator} (${narratorHistoryWeight} books you've enjoyed)`);
        }
      }

      // Genre boost from read history
      let genreHistoryBoost = 0;
      genres.forEach(g => {
        const weight = historyGenreWeights.get(g.toLowerCase()) || 0;
        if (weight > 0) {
          genreHistoryBoost += Math.min(weight * 5, 25); // Cap per genre at 25
        }
      });
      if (genreHistoryBoost > 0) {
        score += Math.min(genreHistoryBoost, 50); // Total cap at 50
        if (!reasons.some(r => r.includes('interest') || r.includes('read'))) {
          reasons.push('Similar to books you\'ve finished');
        }
      }

      // === LISTENING HISTORY BOOSTING (based on books currently being listened to) ===
      // These get ~60% of the weight of finished books - still relevant but not as strong a signal

      // Author boost from listening history (if not already boosted by finished books)
      if (authorHistoryWeight === 0) {
        const listeningAuthorWeight = listeningAuthorWeights.get(author.toLowerCase()) || 0;
        if (listeningAuthorWeight > 0) {
          const boost = Math.min(25 + listeningAuthorWeight * 6, 50); // Cap at 50 (60% of finished)
          score += boost;
          reasons.push(`More by ${author} (you're currently listening to their books)`);
        }
      }

      // Narrator boost from listening history (if not already boosted)
      if (narratorHistoryWeight === 0) {
        const listeningNarratorWeight = listeningNarratorWeights.get(narrator.toLowerCase()) || 0;
        if (listeningNarratorWeight > 0) {
          const boost = Math.min(18 + listeningNarratorWeight * 5, 36); // Cap at 36 (60% of finished)
          score += boost;
          if (!reasons.some(r => r.includes(narrator))) {
            reasons.push(`Narrated by ${narrator} (from your current listens)`);
          }
        }
      }

      // Genre boost from listening history
      if (genreHistoryBoost === 0) {
        let genreListeningBoost = 0;
        genres.forEach(g => {
          const weight = listeningGenreWeights.get(g.toLowerCase()) || 0;
          if (weight > 0) {
            genreListeningBoost += Math.min(weight * 3, 15); // Cap per genre at 15
          }
        });
        if (genreListeningBoost > 0) {
          score += Math.min(genreListeningBoost, 30); // Total cap at 30 (60% of finished)
          if (!reasons.some(r => r.includes('listening') || r.includes('Similar'))) {
            reasons.push('Similar to what you\'re currently listening to');
          }
        }
      }

      // === PREFERENCE-BASED SCORING ===

      // Genre matching from preferences
      const matchingGenres = genres.filter(g =>
        favoriteGenres.some(fg =>
          g.toLowerCase().includes(fg.toLowerCase()) ||
          fg.toLowerCase().includes(g.toLowerCase())
        )
      );
      if (matchingGenres.length > 0 && !reasons.some(r => r.includes('interest'))) {
        score += matchingGenres.length * 30;
        reasons.push(`Matches your interest in ${matchingGenres[0]}`);
      }

      // Author matching from preferences
      if (favoriteAuthors.some(a =>
        author.toLowerCase().includes(a.toLowerCase())
      ) && !reasons.some(r => r.includes(author))) {
        score += 25;
        reasons.push(`By ${author}`);
      }

      // Narrator matching from preferences
      if (favoriteNarrators.some(n =>
        narrator.toLowerCase().includes(n.toLowerCase())
      ) && !reasons.some(r => r.includes(narrator))) {
        score += 20;
        reasons.push(`Narrated by ${narrator}`);
      }

      // Series preference
      if (prefersSeries !== null) {
        const isSeries = !!series;
        if (prefersSeries === isSeries) {
          score += 10;
          if (isSeries) reasons.push('Part of a series');
        }
      }

      // Duration preference
      const hours = duration / 3600;
      if (preferredLength !== 'any') {
        if (preferredLength === 'short' && hours <= 8) {
          score += 10;
        } else if (preferredLength === 'medium' && hours > 8 && hours <= 20) {
          score += 10;
        } else if (preferredLength === 'long' && hours > 20) {
          score += 10;
        }
      }

      // Mood matching
      moods.forEach(mood => {
        const moodGenres = MOOD_GENRE_MAP[mood] || [];
        if (genres.some(g => moodGenres.some(mg =>
          g.toLowerCase().includes(mg.toLowerCase())
        ))) {
          score += 15;
          if (!reasons.some(r => r.includes('mood'))) {
            reasons.push(`Great for ${mood.toLowerCase()} reading`);
          }
        }
      });

      // Small random factor for variety
      score += Math.random() * 5;

      return { item, score, reasons };
    });

    // Sort by score and return top items
    return scoredItems
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }, [allItems, favoriteGenres, favoriteAuthors, favoriteNarrators, prefersSeries, preferredLength, moods, libraryIds, limit, historyStats, listeningStats, finishedBookIds, dismissedIds]);

  // Group recommendations by reason with source attribution
  const groupedRecommendations = useMemo((): RecommendationGroup[] => {
    const groups: Record<string, LibraryItem[]> = {
      'Based on your reading history': [],
      'Based on what you\'re listening to': [],
      'Based on your genres': [],
      'Authors you might like': [],
      'Great narrators': [],
      'Recommended for You': [], // Fallback for books with no specific reason
    };

    recommendations.forEach(({ item, reasons }) => {
      let grouped = false;

      // Prioritize read history matches first
      if (reasons.some(r => r.includes("you've read") || r.includes("you've finished") || r.includes("you've enjoyed"))) {
        groups['Based on your reading history'].push(item);
        grouped = true;
      // Then listening history matches
      } else if (reasons.some(r => r.includes("currently listening") || r.includes("current listens"))) {
        groups['Based on what you\'re listening to'].push(item);
        grouped = true;
      } else if (reasons.some(r => r.includes('interest'))) {
        groups['Based on your genres'].push(item);
        grouped = true;
      } else if (reasons.some(r => r.startsWith('By ') || r.startsWith('More by'))) {
        groups['Authors you might like'].push(item);
        grouped = true;
      } else if (reasons.some(r => r.includes('Narrated'))) {
        groups['Great narrators'].push(item);
        grouped = true;
      }

      // Fallback: add ungrouped items to "Recommended for You"
      if (!grouped) {
        groups['Recommended for You'].push(item);
      }
    });

    // Build source attributions based on historyStats
    const sourceAttributions: Record<string, RecommendationSourceAttribution | undefined> = {};

    // "Based on your reading history" -> most recently finished book
    if (historyStats?.mostRecentFinished) {
      sourceAttributions['Based on your reading history'] = {
        itemId: historyStats.mostRecentFinished.id,
        itemTitle: historyStats.mostRecentFinished.title,
        type: 'finished',
      };
    }

    // "Based on what you're listening to" -> first currently listening book
    if (historyStats?.currentlyListening?.length) {
      sourceAttributions['Based on what you\'re listening to'] = {
        itemId: historyStats.currentlyListening[0].id,
        itemTitle: historyStats.currentlyListening[0].title,
        type: 'listening',
      };
    }

    // "Based on your genres" -> top genre from history
    if (historyStats?.favoriteGenres?.length) {
      sourceAttributions['Based on your genres'] = {
        itemId: '',
        itemTitle: historyStats.favoriteGenres[0].name,
        type: 'genre',
      };
    }

    // "Authors you might like" -> top author from history
    if (historyStats?.favoriteAuthors?.length) {
      sourceAttributions['Authors you might like'] = {
        itemId: '',
        itemTitle: historyStats.favoriteAuthors[0].name,
        type: 'author',
      };
    }

    // "Great narrators" -> top narrator from history
    if (historyStats?.favoriteNarrators?.length) {
      sourceAttributions['Great narrators'] = {
        itemId: '',
        itemTitle: historyStats.favoriteNarrators[0].name,
        type: 'narrator',
      };
    }

    return Object.entries(groups)
      .filter(([_, items]) => items.length > 0)
      .map(([title, items]) => ({
        title,
        items: items.slice(0, 10),
        sourceAttribution: sourceAttributions[title],
      }));
  }, [recommendations, historyStats]);

  return {
    recommendations: recommendations.map(r => r.item),
    scoredRecommendations: recommendations,
    groupedRecommendations,
    // Enable recommendations if user has onboarded OR has any listening/reading history
    hasPreferences: hasCompletedOnboarding ||
      (historyStats?.totalBooksRead ?? 0) > 0 ||
      (listeningStats?.totalBooksInProgress ?? 0) > 0,
  };
}

// Map moods to genres
const MOOD_GENRE_MAP: Record<string, string[]> = {
  'Adventurous': ['adventure', 'action', 'thriller', 'fantasy', 'sci-fi'],
  'Relaxing': ['cozy', 'romance', 'slice of life', 'contemporary'],
  'Thoughtful': ['literary', 'philosophy', 'biography', 'history'],
  'Escapist': ['fantasy', 'sci-fi', 'paranormal', 'urban fantasy'],
  'Suspenseful': ['thriller', 'mystery', 'horror', 'suspense', 'crime'],
  'Romantic': ['romance', 'contemporary romance', 'historical romance'],
  'Educational': ['non-fiction', 'history', 'science', 'self-help', 'business'],
  'Funny': ['humor', 'comedy', 'satire', 'comedic'],
};