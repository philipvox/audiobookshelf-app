/**
 * src/shared/hooks/useFilteredLibrary.ts
 *
 * Unified hook for accessing library items with Kid Mode filtering applied.
 * Consolidates the pattern of filtering library items that was duplicated
 * across HomeScreen, DiscoverTab, SearchScreen, and MyLibraryScreen.
 *
 * @example
 * // Basic usage - get filtered library items
 * const { items, isLoading } = useFilteredLibrary();
 *
 * // With additional custom filter
 * const { items } = useFilteredLibrary({
 *   additionalFilter: (item) => item.media?.duration > 3600
 * });
 */

import { useMemo } from 'react';
import { LibraryItem } from '@/core/types';
import { useLibraryCache } from '@/core/cache/libraryCache';
import { useKidModeStore } from '@/shared/stores/kidModeStore';
import { filterForKidMode } from '@/shared/utils/kidModeFilter';

interface UseFilteredLibraryOptions {
  /** Additional filter to apply after Kid Mode filtering */
  additionalFilter?: (item: LibraryItem) => boolean;
  /** Whether to skip Kid Mode filtering (default: false) */
  skipKidModeFilter?: boolean;
}

interface UseFilteredLibraryResult {
  /** Library items with Kid Mode filter applied */
  items: LibraryItem[];
  /** All library items without Kid Mode filter */
  allItems: LibraryItem[];
  /** Whether Kid Mode is currently enabled */
  kidModeEnabled: boolean;
  /** Whether the library cache is loading */
  isLoading: boolean;
  /** Total count of items (after Kid Mode filter) */
  count: number;
  /** Total count of all items (before Kid Mode filter) */
  totalCount: number;
}

/**
 * Access library items with Kid Mode filtering automatically applied.
 *
 * This hook consolidates the filtering pattern that was previously
 * implemented separately in:
 * - useHomeData.ts (line ~55)
 * - useDiscoverData.ts (line ~144)
 * - SearchScreen.tsx (line ~232)
 * - MyLibraryScreen.tsx (line ~394)
 *
 * Benefits:
 * - Single source of truth for Kid Mode filtering
 * - Consistent behavior across all screens
 * - Memoized for performance
 * - Easy to add additional filters
 */
export function useFilteredLibrary(
  options: UseFilteredLibraryOptions = {}
): UseFilteredLibraryResult {
  const { additionalFilter, skipKidModeFilter = false } = options;

  // Get library items from cache
  const { items: allItems, isLoading } = useLibraryCache();

  // Get Kid Mode state
  const kidModeEnabled = useKidModeStore((s) => s.enabled);

  // Apply Kid Mode filter
  const kidModeFiltered = useMemo(() => {
    if (skipKidModeFilter || !kidModeEnabled) {
      return allItems;
    }
    return filterForKidMode(allItems, kidModeEnabled);
  }, [allItems, kidModeEnabled, skipKidModeFilter]);

  // Apply additional custom filter if provided
  const items = useMemo(() => {
    if (!additionalFilter) {
      return kidModeFiltered;
    }
    return kidModeFiltered.filter(additionalFilter);
  }, [kidModeFiltered, additionalFilter]);

  return {
    items,
    allItems,
    kidModeEnabled,
    isLoading,
    count: items.length,
    totalCount: allItems.length,
  };
}

/**
 * Hook to filter any array of LibraryItems by Kid Mode.
 * Useful when you have items from a different source (e.g., search results).
 *
 * @example
 * const searchResults = useSearch(query);
 * const filteredResults = useKidModeFilter(searchResults);
 */
export function useKidModeFilter<T extends LibraryItem>(items: T[]): T[] {
  const kidModeEnabled = useKidModeStore((s) => s.enabled);

  return useMemo(() => {
    if (!kidModeEnabled) {
      return items;
    }
    return filterForKidMode(items, kidModeEnabled);
  }, [items, kidModeEnabled]);
}

/**
 * Hook to check if a single item passes Kid Mode filter.
 *
 * @example
 * const isAllowed = useIsKidModeAllowed(book);
 * if (!isAllowed) return null;
 */
export function useIsKidModeAllowed(item: LibraryItem | null | undefined): boolean {
  const kidModeEnabled = useKidModeStore((s) => s.enabled);

  return useMemo(() => {
    if (!item) return false;
    if (!kidModeEnabled) return true;
    return filterForKidMode([item], kidModeEnabled).length > 0;
  }, [item, kidModeEnabled]);
}

export default useFilteredLibrary;
