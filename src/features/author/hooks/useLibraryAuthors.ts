/**
 * src/features/authors/hooks/useLibraryAuthors.ts
 *
 * Hook to fetch authors from AudiobookShelf API.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api';
import { queryKeys } from '@/core/queryClient';
import { Author } from '@/core/types';

interface UseLibraryAuthorsResult {
  authors: Author[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useLibraryAuthors(libraryId: string): UseLibraryAuthorsResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.authors.list(libraryId),
    queryFn: async () => {
      const result = await apiClient.getLibraryAuthors(libraryId);
      return result;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!libraryId,
  });

  return {
    authors: data || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
