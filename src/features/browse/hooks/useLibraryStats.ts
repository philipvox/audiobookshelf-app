/**
 * src/features/browse/hooks/useLibraryStats.ts
 *
 * Hook to calculate aggregate library statistics.
 * Returns total book count and total hours of content.
 */

import { useMemo } from 'react';
import { useLibraryCache } from '@/core/cache';

export interface LibraryStats {
  totalTitles: number;
  totalHours: number;
  totalMinutes: number; // For more precise display if needed
}

/**
 * Calculate aggregate library statistics
 */
export function useLibraryStats(): LibraryStats {
  const { items, isLoaded } = useLibraryCache();

  return useMemo(() => {
    if (!isLoaded || !items.length) {
      return {
        totalTitles: 0,
        totalHours: 0,
        totalMinutes: 0,
      };
    }

    let totalDurationSeconds = 0;

    items.forEach(item => {
      // Duration is stored in seconds on the media object
      const duration = (item.media as any)?.duration || 0;
      totalDurationSeconds += duration;
    });

    const totalMinutes = Math.round(totalDurationSeconds / 60);
    const totalHours = Math.round(totalDurationSeconds / 3600);

    return {
      totalTitles: items.length,
      totalHours,
      totalMinutes,
    };
  }, [items, isLoaded]);
}

/**
 * Format stats for display
 */
export function formatLibraryStats(stats: LibraryStats): {
  titlesDisplay: string;
  hoursDisplay: string;
} {
  return {
    titlesDisplay: stats.totalTitles.toLocaleString(),
    hoursDisplay: stats.totalHours.toLocaleString(),
  };
}
