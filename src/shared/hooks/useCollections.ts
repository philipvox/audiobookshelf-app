/**
 * src/shared/hooks/useCollections.ts
 *
 * Hook to fetch and return collections from the server.
 *
 * Moved from features/collections/hooks/ to shared/hooks/ because it's
 * consumed by browse and collections features.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api';
import { queryKeys } from '@/core/queryClient';
import { Collection } from '@/core/types';

interface UseCollectionsResult {
  collections: Collection[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useCollections(): UseCollectionsResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.collections.all,
    queryFn: () => apiClient.getCollections(),
    staleTime: 10 * 60 * 1000,
  });

  return {
    collections: data || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
