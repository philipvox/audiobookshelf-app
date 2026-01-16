/**
 * src/features/browse/hooks/useDurationBooks.ts
 *
 * Hook to filter books by duration range.
 */

import { useMemo } from 'react';
import { useLibraryCache } from '@/core/cache';
import { LibraryItem } from '@/core/types';
import { DURATION_RANGES, DurationRangeId } from './useBrowseCounts';

/**
 * Filter books by duration range
 */
export function useDurationBooks(minSeconds: number, maxSeconds: number): LibraryItem[] {
  const { items, isLoaded } = useLibraryCache();

  return useMemo(() => {
    if (!isLoaded || !items.length) {
      return [];
    }

    return items.filter((item) => {
      const duration = (item.media as any)?.duration || 0;
      return duration >= minSeconds && duration < maxSeconds;
    });
  }, [items, isLoaded, minSeconds, maxSeconds]);
}

/**
 * Get book count for each duration range
 */
export function useDurationCounts(): Record<DurationRangeId, number> {
  const { items, isLoaded } = useLibraryCache();

  return useMemo(() => {
    const counts: Record<DurationRangeId, number> = {
      quick: 0,
      short: 0,
      medium: 0,
      long: 0,
      epic: 0,
    };

    if (!isLoaded || !items.length) {
      return counts;
    }

    items.forEach((item) => {
      const duration = (item.media as any)?.duration || 0;

      for (const range of DURATION_RANGES) {
        if (duration >= range.min && duration < range.max) {
          counts[range.id]++;
          break;
        }
      }
    });

    return counts;
  }, [items, isLoaded]);
}
