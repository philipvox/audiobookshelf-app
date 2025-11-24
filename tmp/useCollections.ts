/**
 * src/features/collections/hooks/useCollections.ts
 *
 * Hook to fetch collections from AudiobookShelf API.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api';
import { Collection } from '@/core/types';

interface UseCollectionsResult {
  collections: Collection[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch all collections
 */
export function useCollections(): UseCollectionsResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['collections'],
    queryFn: () => apiClient.getCollections(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    collections: data || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}