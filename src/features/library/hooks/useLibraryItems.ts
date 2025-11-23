/**
 * src/features/library/hooks/useLibraryItems.ts
 *
 * Hook to fetch library items (books) with pagination and caching.
 * Uses React Query for automatic caching and background updates.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api';
import { LibraryItem } from '@/core/types';

interface UseLibraryItemsOptions {
  limit?: number;
  page?: number;
  sort?: string;
  filter?: string;
}

interface UseLibraryItemsResult {
  items: LibraryItem[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch library items with pagination and caching
 * 
 * @param libraryId - Library ID to fetch items from
 * @param options - Optional pagination and filter options
 */
export function useLibraryItems(
  libraryId: string,
  options: UseLibraryItemsOptions = {}
): UseLibraryItemsResult {
  const { limit = 50, page = 0, sort, filter } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['library', libraryId, 'items', { limit, page, sort, filter }],
    queryFn: () =>
      apiClient.getLibraryItems(libraryId, {
        limit,
        page,
        sort,
        filter,
        minified: false, // Get full item data
        include: 'progress', // Include progress for each item
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!libraryId, // Only fetch if libraryId exists
  });

  return {
    items: data?.results || [],
    total: data?.total || 0,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
