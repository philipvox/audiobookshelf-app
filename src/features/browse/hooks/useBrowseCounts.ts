/**
 * src/features/browse/hooks/useBrowseCounts.ts
 *
 * Hook to get counts for browse categories (genres, narrators, series, duration ranges).
 */

import { useMemo } from 'react';
import { useLibraryCache } from '@/core/cache';
import { useSeries } from '@/features/series/hooks/useSeries';

export interface BrowseCounts {
  genreCount: number;
  authorCount: number;
  narratorCount: number;
  seriesCount: number;
  durationRanges: number; // Static: 5 ranges
}

/**
 * Calculate browse category counts
 */
export function useBrowseCounts(): BrowseCounts {
  const { items, isLoaded, currentLibraryId } = useLibraryCache();
  const { seriesCount } = useSeries(currentLibraryId || '');

  return useMemo(() => {
    if (!isLoaded || !items.length) {
      return {
        genreCount: 0,
        authorCount: 0,
        narratorCount: 0,
        seriesCount: 0,
        durationRanges: 5,
      };
    }

    const genres = new Set<string>();
    const authors = new Set<string>();
    const narrators = new Set<string>();

    items.forEach((item) => {
      const metadata = item.media?.metadata as any;

      // Count genres
      const itemGenres = metadata?.genres || [];
      itemGenres.forEach((g: string) => {
        if (g && typeof g === 'string') {
          genres.add(g.trim());
        }
      });

      // Count authors
      const authorName = metadata?.authorName;
      if (authorName && typeof authorName === 'string') {
        authors.add(authorName.trim());
      }

      // Count narrators
      const narratorName = metadata?.narratorName;
      if (narratorName && typeof narratorName === 'string') {
        narrators.add(narratorName.trim());
      }
    });

    return {
      genreCount: genres.size,
      authorCount: authors.size,
      narratorCount: narrators.size,
      seriesCount,
      durationRanges: 5, // Static: Quick, Short, Medium, Long, Epic
    };
  }, [items, isLoaded, seriesCount]);
}

/**
 * Duration range definitions
 */
export const DURATION_RANGES = [
  { id: 'quick', label: 'Quick Listens', description: 'Under 4 hours', min: 0, max: 4 * 3600 },
  { id: 'short', label: 'Short', description: '4-8 hours', min: 4 * 3600, max: 8 * 3600 },
  { id: 'medium', label: 'Medium', description: '8-15 hours', min: 8 * 3600, max: 15 * 3600 },
  { id: 'long', label: 'Long', description: '15-30 hours', min: 15 * 3600, max: 30 * 3600 },
  { id: 'epic', label: 'Epic', description: '30+ hours', min: 30 * 3600, max: Infinity },
] as const;

export type DurationRangeId = typeof DURATION_RANGES[number]['id'];
