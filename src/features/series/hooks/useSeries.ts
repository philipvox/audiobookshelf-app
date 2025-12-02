import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api';
import { queryKeys } from '@/core/queryClient';
import { SeriesInfo } from '../services/seriesAdapter';
import { SortOption } from '@/shared/components/FilterSortBar';

interface UseSeriesOptions {
  sortBy?: SortOption;
  searchQuery?: string;
}

export function useSeries(libraryId: string, options: UseSeriesOptions = {}) {
  const { sortBy = 'name-asc', searchQuery = '' } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.series.list(libraryId),
    queryFn: () => apiClient.getLibrarySeries(libraryId),
    enabled: !!libraryId,
    staleTime: 10 * 60 * 1000,
  });

  const series = useMemo(() => {
    if (!data) return [];

    let result: SeriesInfo[] = data.map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      bookCount: s.books?.length || s.numBooks || 0,
      totalDuration: s.books?.reduce((sum: number, b: any) => sum + (b.media?.duration || 0), 0) || 0,
      coverUrl: s.books?.[0]?.id,
      books: s.books || [],
    }));

    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(lower));
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'bookCount-desc': return b.bookCount - a.bookCount;
        case 'bookCount-asc': return a.bookCount - b.bookCount;
        default: return 0;
      }
    });

    return result;
  }, [data, sortBy, searchQuery]);

  return {
    series,
    seriesCount: series.length,
    isLoading,
    error,
    refetch,
  };
}