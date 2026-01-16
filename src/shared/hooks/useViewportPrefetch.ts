/**
 * src/shared/hooks/useViewportPrefetch.ts
 *
 * Hook for viewport-based cover prefetching.
 * P3 Fix - Prefetch covers for items about to scroll into view.
 */

import { useCallback, useRef } from 'react';
import { Image } from 'expo-image';
import { ViewToken } from 'react-native';
import { LibraryItem } from '@/core/types';

interface UseViewportPrefetchOptions {
  /** Number of items ahead to prefetch (default: 10) */
  prefetchAhead?: number;
  /** Minimum visible percentage to trigger prefetch (default: 50) */
  viewablePercentThreshold?: number;
  /** Minimum time item must be visible in ms (default: 100) */
  minimumViewTime?: number;
}

interface ViewportPrefetchResult {
  /** Callback for FlatList's onViewableItemsChanged */
  onViewableItemsChanged: (info: { viewableItems: ViewToken[] }) => void;
  /** Configuration for FlatList's viewabilityConfig */
  viewabilityConfig: {
    itemVisiblePercentThreshold: number;
    minimumViewTime: number;
  };
}

/**
 * Hook to prefetch cover images for items approaching the viewport.
 * Use with FlatList to improve perceived performance by preloading covers.
 *
 * @example
 * ```tsx
 * function BookList({ books }) {
 *   const { onViewableItemsChanged, viewabilityConfig } = useViewportPrefetch(
 *     books,
 *     (item) => getCoverUrl(item.id)
 *   );
 *
 *   return (
 *     <FlatList
 *       data={books}
 *       onViewableItemsChanged={onViewableItemsChanged}
 *       viewabilityConfig={viewabilityConfig}
 *       renderItem={({ item }) => <BookCard book={item} />}
 *     />
 *   );
 * }
 * ```
 */
export function useViewportPrefetch<T extends LibraryItem>(
  items: T[],
  getCoverUrl: (item: T) => string | null | undefined,
  options: UseViewportPrefetchOptions = {}
): ViewportPrefetchResult {
  const {
    prefetchAhead = 10,
    viewablePercentThreshold = 50,
    minimumViewTime = 100,
  } = options;

  // Track which items have been prefetched to avoid duplicates
  const prefetchedIds = useRef(new Set<string>());

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length === 0 || items.length === 0) return;

      // Find the last visible index
      const lastVisibleIndex = Math.max(
        ...viewableItems
          .filter((v) => v.index !== null && v.index !== undefined)
          .map((v) => v.index as number)
      );

      if (lastVisibleIndex < 0) return;

      // Calculate the range of items to prefetch
      const startIndex = lastVisibleIndex + 1;
      const endIndex = Math.min(startIndex + prefetchAhead, items.length);

      // Collect URLs to prefetch
      const urlsToPrefetch: string[] = [];

      for (let i = startIndex; i < endIndex; i++) {
        const item = items[i];
        if (!item || prefetchedIds.current.has(item.id)) continue;

        const coverUrl = getCoverUrl(item);
        if (coverUrl) {
          prefetchedIds.current.add(item.id);
          urlsToPrefetch.push(coverUrl);
        }
      }

      // Prefetch all collected URLs
      if (urlsToPrefetch.length > 0) {
        if (__DEV__) {
          console.log(`[ViewportPrefetch] Prefetching ${urlsToPrefetch.length} covers`);
        }
        Image.prefetch(urlsToPrefetch);
      }
    },
    [items, getCoverUrl, prefetchAhead]
  );

  const viewabilityConfig = {
    itemVisiblePercentThreshold: viewablePercentThreshold,
    minimumViewTime: minimumViewTime,
  };

  return {
    onViewableItemsChanged,
    viewabilityConfig,
  };
}

/**
 * Reset prefetch tracking (call when data changes significantly)
 */
export function createPrefetchTracker() {
  const prefetchedIds = new Set<string>();

  return {
    /** Check if an item has been prefetched */
    hasPrefetched: (id: string) => prefetchedIds.has(id),

    /** Mark an item as prefetched */
    markPrefetched: (id: string) => prefetchedIds.add(id),

    /** Reset all tracking */
    reset: () => prefetchedIds.clear(),

    /** Get count of prefetched items */
    count: () => prefetchedIds.size,
  };
}
