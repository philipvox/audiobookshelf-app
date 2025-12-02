import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api';
import { queryKeys } from '@/core/queryClient';
import { LibraryItem } from '@/core/types';

interface UseLibraryItemsOptions {
  limit?: number;
  sort?: string;
  filter?: string;
}

interface UseLibraryItemsResult {
  items: LibraryItem[];
  total: number;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  error: Error | null;
  refetch: () => void;
  fetchNextPage: () => void;
}

export function useLibraryItems(
  libraryId: string,
  options: UseLibraryItemsOptions = {}
): UseLibraryItemsResult {
  const { limit = 50, sort, filter } = options;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    error,
    refetch,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.library.itemsFiltered(libraryId, { limit, sort, filter }),
    queryFn: ({ pageParam = 0 }) =>
      apiClient.getLibraryItems(libraryId, {
        limit,
        page: pageParam,
        sort,
        filter,
        minified: false,
        include: 'progress',
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, page) => sum + page.results.length, 0);
      if (loadedCount < lastPage.total) {
        return allPages.length;
      }
      return undefined;
    },
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000,
    enabled: !!libraryId,
  });

  // Flatten all pages into single array
  const items = data?.pages.flatMap((page) => page.results) || [];
  const total = data?.pages[0]?.total || 0;

  return {
    items,
    total,
    isLoading,
    isFetchingNextPage,
    hasNextPage: !!hasNextPage,
    error: error as Error | null,
    refetch,
    fetchNextPage,
  };
}