/**
 * src/features/narrators/hooks/useNarrators.ts
 *
 * Hook to extract and process narrators from library items.
 */

import { useMemo } from 'react';
import { useLibraryItems } from '@/features/library/hooks/useLibraryItems';
import { narratorAdapter, NarratorInfo } from '../services/narratorAdapter';

interface UseNarratorsOptions {
  sortBy?: 'name' | 'bookCount';
  searchQuery?: string;
}

interface UseNarratorsResult {
  narrators: NarratorInfo[];
  narratorCount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Extract and process narrators from library items
 */
export function useNarrators(
  libraryId: string,
  options: UseNarratorsOptions = {}
): UseNarratorsResult {
  const { sortBy = 'name', searchQuery = '' } = options;

  // Fetch all library items to extract narrators
  const { items, isLoading, error, refetch } = useLibraryItems(libraryId, {
    limit: 500, // Load more items for comprehensive narrator list
  });

  // Process narrators
  const narrators = useMemo(() => {
    // Extract narrators from items
    let processed = narratorAdapter.extractNarrators(items);

    // Filter by search query
    if (searchQuery) {
      processed = narratorAdapter.filterNarrators(processed, searchQuery);
    }

    // Sort
    processed = narratorAdapter.sortNarrators(processed, sortBy);

    return processed;
  }, [items, sortBy, searchQuery]);

  return {
    narrators,
    narratorCount: narrators.length,
    isLoading,
    error,
    refetch,
  };
}