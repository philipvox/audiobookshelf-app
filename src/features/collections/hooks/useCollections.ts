import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api';
import { Collection } from '@/core/types';

interface UseCollectionsResult {
  collections: Collection[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useCollections(): UseCollectionsResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['collections'],
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