/**
 * src/features/browse/hooks/useTopAuthors.ts
 *
 * Hook to get top authors sorted by book count.
 */

import { useMemo } from 'react';
import { useLibraryCache } from '@/core/cache';

export interface TopAuthor {
  name: string;
  count: number;
}

/**
 * Get top authors sorted by book count
 */
export function useTopAuthors(limit: number = 10): TopAuthor[] {
  const { items, isLoaded } = useLibraryCache();

  return useMemo(() => {
    if (!isLoaded || !items.length) {
      return [];
    }

    const authorCounts = new Map<string, number>();

    items.forEach((item) => {
      const metadata = item.media?.metadata as any;
      const authorName = metadata?.authorName;

      if (authorName && typeof authorName === 'string') {
        const normalizedName = authorName.trim();
        if (normalizedName) {
          authorCounts.set(normalizedName, (authorCounts.get(normalizedName) || 0) + 1);
        }
      }
    });

    // Sort by count descending, then by name ascending
    const sorted = [...authorCounts.entries()]
      .sort((a, b) => {
        const countDiff = b[1] - a[1];
        if (countDiff !== 0) return countDiff;
        return a[0].localeCompare(b[0]);
      })
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));

    return sorted;
  }, [items, isLoaded, limit]);
}

/**
 * Get author's last name for display
 */
export function getAuthorLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || fullName;
}
