import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api';
import { queryKeys } from '@/core/queryClient';
import { Collection } from '@/core/types';

interface UseCollectionDetailsResult {
  collection: Collection | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useCollectionDetails(collectionId: string): UseCollectionDetailsResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.collections.detail(collectionId),
    queryFn: () => apiClient.getCollection(collectionId),
    staleTime: 5 * 60 * 1000,
    enabled: !!collectionId,
  });

  return {
    collection: data,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}