/**
 * src/features/mood-discovery/hooks/useMoodRecommendations.ts
 *
 * Hook to score and rank library books based on mood session preferences.
 * Uses orthogonal dimensions: Mood, Pace, Weight, World.
 */

import { useMemo, useDeferredValue } from 'react';
import { useLibraryCache } from '@/core/cache/libraryCache';
import { LibraryItem, BookMedia, BookMetadata } from '@/core/types';

// Type guard for book media
function isBookMedia(media: LibraryItem['media'] | undefined): media is BookMedia {
  return media !== undefined && 'duration' in media;
}
import {
  MoodSession,
  MoodScore,
  ScoredBook,
  Mood,
  Pace,
  Weight,
  World,
  MOOD_GENRE_MAP,
  WORLD_GENRE_MAP,
  PACE_INDICATORS,
  WEIGHT_INDICATORS,
  LENGTH_OPTIONS,
} from '../types';
import { calculateTagMoodScore, tagScoreToPercentage, getItemTags } from '../utils/tagScoring';
import { useActiveSession } from '../stores/moodSessionStore';
import { useReadingHistory } from '@/features/reading-history-wizard';
import { createSeriesFilter } from '@/shared/utils/seriesFilter';

// ============================================================================
// SCORING CONSTANTS
// ============================================================================

const SCORE_WEIGHTS = {
  /** Weight for primary mood match */
  moodMatch: 40,
  /** Bonus for secondary mood match (from themes/tropes) */
  secondaryMoodMatch: 20,
  /** Weight for pace match */
  paceMatch: 15,
  /** Weight for weight match */
  weightMatch: 15,
  /** Weight for world match */
  worldMatch: 20,
  /** Weight for length match */
  lengthMatch: 10,
  /** Bonus from theme matching */
  themeMatch: 15,
  /** Bonus from trope matching */
  tropeMatch: 15,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get metadata from a library item safely
 */
function getMetadata(item: LibraryItem): BookMetadata | Record<string, never> {
  if (item.mediaType !== 'book' || !item.media?.metadata) return {};
  return item.media.metadata as BookMetadata;
}

/**
 * Get duration in hours from a library item
 */
function getDurationHours(item: LibraryItem): number {
  if (!isBookMedia(item.media)) return 0;
  return (item.media.duration || 0) / 3600;
}

// NOTE: Old parseThemesFromDescription and parseTropesFromDescription functions
// have been replaced with tag-based scoring via calculateTagMoodScore().
// Tags come from item.media.tags instead of parsing description text.

/**
 * Check if genres contain any keywords
 */
function containsKeyword(genres: string[], keywords: string[]): boolean {
  const lowerGenres = genres.map((g) => g.toLowerCase());
  return keywords.some((keyword) =>
    lowerGenres.some(
      (genre) =>
        genre.includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(genre)
    )
  );
}

/**
 * Check if description/text contains any keywords
 */
function textContainsKeyword(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Check if a book matches the mood via genres
 */
function matchesMood(bookGenres: string[], mood: Mood): boolean {
  const moodKeywords = MOOD_GENRE_MAP[mood];
  return containsKeyword(bookGenres, moodKeywords);
}

/**
 * Check if a book matches the pace via genres/description
 */
function matchesPace(bookGenres: string[], description: string, pace: Pace): boolean {
  if (pace === 'any') return true;

  const paceKeywords = PACE_INDICATORS[pace];
  return containsKeyword(bookGenres, paceKeywords) ||
    textContainsKeyword(description, paceKeywords);
}

/**
 * Check if a book matches the weight via genres/description
 */
function matchesWeight(bookGenres: string[], description: string, weight: Weight): boolean {
  if (weight === 'any') return true;

  const weightKeywords = WEIGHT_INDICATORS[weight];
  return containsKeyword(bookGenres, weightKeywords) ||
    textContainsKeyword(description, weightKeywords);
}

/**
 * Check if a book matches the world setting via genres
 */
function matchesWorld(bookGenres: string[], world: World): boolean {
  if (world === 'any') return true;

  const worldKeywords = WORLD_GENRE_MAP[world];
  return containsKeyword(bookGenres, worldKeywords);
}

/**
 * Check if duration matches the length preference
 */
function matchesLength(
  durationHours: number,
  lengthPref: MoodSession['length']
): { matches: boolean; score: number } {
  if (lengthPref === 'any') {
    return { matches: true, score: 0 };
  }

  const config = LENGTH_OPTIONS.find((o) => o.id === lengthPref);
  if (!config) {
    return { matches: true, score: 0 };
  }

  const min = config.minHours ?? 0;
  const max = config.maxHours ?? Infinity;

  if (durationHours >= min && durationHours <= max) {
    return { matches: true, score: SCORE_WEIGHTS.lengthMatch };
  }

  // Partial credit if close
  if (config.minHours && durationHours >= min - 2 && durationHours < min) {
    return { matches: false, score: SCORE_WEIGHTS.lengthMatch / 2 };
  }
  if (config.maxHours && durationHours > max && durationHours <= max + 2) {
    return { matches: false, score: SCORE_WEIGHTS.lengthMatch / 2 };
  }

  return { matches: false, score: 0 };
}

// NOTE: Old scoreThemes and scoreTropes functions have been replaced
// with calculateTagMoodScore() from ../utils/tagScoring.ts

/**
 * Calculate mood score for a single book.
 * Uses tag-based scoring for themes/tropes instead of description parsing.
 */
function calculateMoodScore(
  item: LibraryItem,
  session: MoodSession
): MoodScore {
  const metadata = getMetadata(item);
  const bookGenres: string[] = metadata.genres || [];
  const description: string = metadata.description || '';
  const durationHours = getDurationHours(item);

  // Initialize scores
  let moodScore = 0;
  let paceScore = 0;
  let weightScore = 0;
  let worldScore = 0;
  let isPrimaryMoodMatch = false;

  // Score mood match (required dimension) via genres
  if (matchesMood(bookGenres, session.mood)) {
    moodScore = SCORE_WEIGHTS.moodMatch;
    isPrimaryMoodMatch = true;
  }

  // Score pace match (optional dimension) via genres/description
  if (session.pace !== 'any' && matchesPace(bookGenres, description, session.pace)) {
    paceScore = SCORE_WEIGHTS.paceMatch;
  }

  // Score weight match (optional dimension) via genres/description
  if (session.weight !== 'any' && matchesWeight(bookGenres, description, session.weight)) {
    weightScore = SCORE_WEIGHTS.weightMatch;
  }

  // Score world match (optional dimension) via genres
  if (session.world !== 'any' && matchesWorld(bookGenres, session.world)) {
    worldScore = SCORE_WEIGHTS.worldMatch;
  }

  // Score length match
  const lengthResult = matchesLength(durationHours, session.length);
  const lengthScore = lengthResult.score;

  // NEW: Tag-based scoring (replaces old theme/trope regex parsing)
  // Tags are from item.media.tags, which is explicit metadata from AudiobookShelf
  const tags = getItemTags(item);
  const tagResult = calculateTagMoodScore(tags, session);

  // Tag scoring can establish mood match if no genre match
  if (tagResult.isPrimaryMoodMatch && !isPrimaryMoodMatch) {
    moodScore = SCORE_WEIGHTS.secondaryMoodMatch;
    isPrimaryMoodMatch = true;
  }

  // Use tag score for theme+trope scoring (combined into single "tag" score)
  const themeScore = tagResult.breakdown.mood + tagResult.breakdown.tropes;
  const tropeScore = 0; // Tropes are now part of tag scoring

  // Update isPrimaryMoodMatch
  isPrimaryMoodMatch = isPrimaryMoodMatch || tagResult.isPrimaryMoodMatch;

  const total = moodScore + paceScore + weightScore + worldScore + lengthScore + tagResult.score;

  return {
    total,
    moodScore,
    paceScore,
    weightScore,
    worldScore,
    lengthScore,
    themeScore, // Now represents tag-based mood+trope score
    tropeScore, // Kept for interface compatibility (always 0)
    isPrimaryMoodMatch,
  };
}

/**
 * Convert score to match percentage (0-100)
 */
function scoreToPercent(score: MoodScore, session: MoodSession): number {
  // Calculate maximum possible score
  const maxMoodScore = SCORE_WEIGHTS.moodMatch;
  const maxPaceScore = session.pace !== 'any' ? SCORE_WEIGHTS.paceMatch : 0;
  const maxWeightScore = session.weight !== 'any' ? SCORE_WEIGHTS.weightMatch : 0;
  const maxWorldScore = session.world !== 'any' ? SCORE_WEIGHTS.worldMatch : 0;
  const maxLengthScore = session.length !== 'any' ? SCORE_WEIGHTS.lengthMatch : 0;

  // Base max (excluding theme/trope bonuses)
  const maxBaseScore = maxMoodScore + maxPaceScore + maxWeightScore + maxWorldScore + maxLengthScore;

  if (maxBaseScore === 0) return 100;

  // Calculate base percentage
  const baseScore = score.moodScore + score.paceScore + score.weightScore +
    score.worldScore + score.lengthScore;
  let percent = (baseScore / maxBaseScore) * 100;

  // Theme and trope bonuses can boost percentage
  const themeBoost = Math.min(score.themeScore / SCORE_WEIGHTS.themeMatch, 2) * 10;
  const tropeBoost = Math.min(score.tropeScore / SCORE_WEIGHTS.tropeMatch, 2) * 10;

  percent += themeBoost + tropeBoost;

  return Math.max(0, Math.min(100, Math.round(percent)));
}

// ============================================================================
// MAIN HOOK
// ============================================================================

interface UseMoodRecommendationsOptions {
  session?: MoodSession | null;
  minMatchPercent?: number;
  limit?: number;
  includeUntagged?: boolean;
  /** Whether to exclude finished books (default: true) */
  excludeFinished?: boolean;
  /** Whether to apply preference boosts from reading history (default: true) */
  applyPreferenceBoosts?: boolean;
}

interface UseMoodRecommendationsResult {
  recommendations: ScoredBook[];
  unscored: LibraryItem[];
  totalCount: number;
  isLoading: boolean;
  hasSession: boolean;
}

/**
 * Hook to get mood-based book recommendations.
 * Now integrates with reading history to:
 * - Exclude finished books (locally marked or server progress >= 95%)
 * - Boost books by authors/series/genres the user has enjoyed
 */
export function useMoodRecommendations(
  options: UseMoodRecommendationsOptions = {}
): UseMoodRecommendationsResult {
  const {
    minMatchPercent = 0,
    limit = 50,
    includeUntagged = false,
    excludeFinished = true,
    applyPreferenceBoosts = true,
  } = options;

  const activeSession = useActiveSession();
  const session = options.session ?? activeSession;
  const items = useLibraryCache((s) => s.items);
  const isLoaded = useLibraryCache((s) => s.isLoaded);

  // Get reading history for filtering and boosts
  const { isFinished, hasBeenStarted, getPreferenceBoost, hasHistory } = useReadingHistory();

  // Create series filter - only show first book or next book in series
  const isSeriesAppropriate = useMemo(() => {
    if (!items.length) return () => true;
    return createSeriesFilter({
      allItems: items,
      isFinished,
      hasStarted: hasBeenStarted,
    });
  }, [items, isFinished, hasBeenStarted]);

  // Defer heavy computation
  const deferredMood = useDeferredValue(session?.mood ?? '');
  const deferredPace = useDeferredValue(session?.pace ?? 'any');
  const deferredWeight = useDeferredValue(session?.weight ?? 'any');
  const deferredWorld = useDeferredValue(session?.world ?? 'any');

  const result = useMemo(() => {
    if (!isLoaded || !session || !session.mood) {
      return {
        recommendations: [],
        unscored: [],
        totalCount: 0,
        isLoading: !isLoaded,
        hasSession: !!session,
      };
    }

    const scored: ScoredBook[] = [];
    const unscored: LibraryItem[] = [];

    for (const item of items) {
      // Skip finished books if requested
      if (excludeFinished && isFinished(item.id)) {
        continue;
      }

      // Skip middle-of-series books (only show first book or next book)
      if (!isSeriesAppropriate(item)) {
        continue;
      }

      const metadata = getMetadata(item);
      const genres: string[] = metadata.genres || [];

      // Check if book has any scoring data
      // NEW: Use tags from item.media.tags instead of parsing description
      const hasGenres = genres.length > 0;
      const tags = getItemTags(item);
      const hasTags = tags.length > 0;

      if (!hasGenres && !hasTags) {
        if (includeUntagged) {
          unscored.push(item);
        }
        continue;
      }

      const score = calculateMoodScore(item, session);
      let matchPercent = scoreToPercent(score, session);

      // Apply preference boosts from reading history
      if (applyPreferenceBoosts && hasHistory) {
        const boost = getPreferenceBoost(item);
        // Add preference boost (max +15% to match percent)
        const preferenceBoost = Math.min(15, boost.totalBoost / 5);
        matchPercent = Math.min(100, matchPercent + preferenceBoost);
      }

      // Filter by minimum match percent
      if (matchPercent >= minMatchPercent) {
        scored.push({
          id: item.id,
          score,
          matchPercent,
        });
      }
    }

    // Sort by total score descending, then by primary match
    scored.sort((a, b) => {
      // Primary mood matches first
      if (a.score.isPrimaryMoodMatch !== b.score.isPrimaryMoodMatch) {
        return a.score.isPrimaryMoodMatch ? -1 : 1;
      }
      // Then by total score
      return b.score.total - a.score.total;
    });

    const limited = scored.slice(0, limit);

    return {
      recommendations: limited,
      unscored,
      totalCount: scored.length,
      isLoading: false,
      hasSession: true,
    };
  }, [
    isLoaded,
    items,
    deferredMood,
    deferredPace,
    deferredWeight,
    deferredWorld,
    session,
    minMatchPercent,
    limit,
    includeUntagged,
    excludeFinished,
    applyPreferenceBoosts,
    isFinished,
    isSeriesAppropriate,
    getPreferenceBoost,
    hasHistory,
  ]);

  return result;
}

/**
 * Get a single book's mood score
 */
export function useBookMoodScore(
  itemId: string,
  session?: MoodSession | null
): { score: MoodScore; matchPercent: number } | null {
  const activeSession = useActiveSession();
  const effectiveSession = session ?? activeSession;
  const getItem = useLibraryCache((s) => s.getItem);

  return useMemo(() => {
    if (!effectiveSession || !effectiveSession.mood) {
      return null;
    }

    const item = getItem(itemId);
    if (!item) return null;

    const score = calculateMoodScore(item, effectiveSession);
    const matchPercent = scoreToPercent(score, effectiveSession);

    return { score, matchPercent };
  }, [itemId, effectiveSession, getItem]);
}

/**
 * Get books grouped by match quality
 */
export function useMoodRecommendationsByQuality(session?: MoodSession | null) {
  const { recommendations, isLoading, hasSession } = useMoodRecommendations({
    session,
    limit: 200,
    minMatchPercent: 0,
  });

  return useMemo(() => {
    const perfect: ScoredBook[] = [];
    const great: ScoredBook[] = [];
    const good: ScoredBook[] = [];
    const partial: ScoredBook[] = [];
    const low: ScoredBook[] = [];

    for (const rec of recommendations) {
      if (rec.matchPercent >= 80) perfect.push(rec);
      else if (rec.matchPercent >= 60) great.push(rec);
      else if (rec.matchPercent >= 40) good.push(rec);
      else if (rec.matchPercent >= 20) partial.push(rec);
      else low.push(rec);
    }

    return {
      perfect,
      great,
      good,
      partial,
      low,
      isLoading,
      hasSession,
    };
  }, [recommendations, isLoading, hasSession]);
}
