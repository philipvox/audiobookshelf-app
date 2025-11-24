/**
 * src/features/series/hooks/useLibrarySeries.ts
 *
 * Hook to fetch series directly from AudiobookShelf API.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api';
import { Series } from '@/core/types';

interface UseLibrarySeriesResult {
  series: Series[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch series from AudiobookShelf API
 */
export function useLibrarySeries(libraryId: string): UseLibrarySeriesResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['library', libraryId, 'series'],
    queryFn: async () => {
      console.log('=== FETCHING SERIES ===');
      console.log('Library ID:', libraryId);
      
      try {
        const result = await apiClient.getLibrarySeries(libraryId);
        console.log('API Response:', result);
        console.log('Response type:', typeof result);
        console.log('Is array:', Array.isArray(result));
        console.log('Length:', result?.length);
        
        if (result && result.length > 0) {
          console.log('First series:', result[0]);
        }
        
        return result;
      } catch (err) {
        console.error('Series fetch error:', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!libraryId,
  });

  console.log('useLibrarySeries - data:', data?.length, 'loading:', isLoading, 'error:', error);

  return {
    series: data || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}