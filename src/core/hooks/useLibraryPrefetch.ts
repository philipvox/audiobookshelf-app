import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api';
import { LibraryItem } from '@/core/types';

export function useLibraryPrefetch(libraryId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!libraryId) return;

    const prefetchAll = async () => {
      // Prefetch all library items (used by narrators + search)
      queryClient.prefetchQuery({
        queryKey: ['allLibraryItems', libraryId],
        queryFn: async () => {
          const allItems: LibraryItem[] = [];
          let page = 0;
          const limit = 100;
          let hasMore = true;

          while (hasMore) {
            const response = await apiClient.getLibraryItems(libraryId, { limit, page });
            allItems.push(...response.results);
            hasMore = allItems.length < response.total;
            page++;
          }
          return allItems;
        },
        staleTime: 10 * 60 * 1000,
      });

      // Prefetch series
      queryClient.prefetchQuery({
        queryKey: ['series', libraryId],
        queryFn: () => apiClient.getLibrarySeries(libraryId),
        staleTime: 10 * 60 * 1000,
      });

      // Prefetch authors
      queryClient.prefetchQuery({
        queryKey: ['authors', libraryId],
        queryFn: () => apiClient.getLibraryAuthors(libraryId),
        staleTime: 10 * 60 * 1000,
      });

      // Prefetch collections
      queryClient.prefetchQuery({
        queryKey: ['collections'],
        queryFn: () => apiClient.getCollections(),
        staleTime: 10 * 60 * 1000,
      });
    };

    prefetchAll();
  }, [libraryId, queryClient]);
}