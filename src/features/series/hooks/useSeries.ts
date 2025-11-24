/**
 * src/features/series/hooks/useSeries.ts
 *
 * Hook to process series from AudiobookShelf API.
 */

import { useMemo } from 'react';
import { useLibrarySeries } from './useLibrarySeries';
import { seriesAdapter, SeriesInfo } from '../services/seriesAdapter';

interface UseSeriesOptions {
  sortBy?: 'name' | 'bookCount' | 'recent';
  searchQuery?: string;
}

interface UseSeriesResult {
  series: SeriesInfo[];
  seriesCount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch and process series from API
 */
export function useSeries(
  libraryId: string,
  options: UseSeriesOptions = {}
): UseSeriesResult {
  const { sortBy = 'name', searchQuery = '' } = options;

  // Fetch series from API
  const { series: apiSeries, isLoading, error, refetch } = useLibrarySeries(libraryId);

  // Process series
  const series = useMemo(() => {
    // Convert to SeriesInfo
    let processed = seriesAdapter.adaptSeries(apiSeries);

    // Filter by search query
    if (searchQuery) {
      processed = seriesAdapter.filterSeries(processed, searchQuery);
    }

    // Sort
    processed = seriesAdapter.sortSeries(processed, sortBy);

    return processed;
  }, [apiSeries, sortBy, searchQuery]);

  return {
    series,
    seriesCount: series.length,
    isLoading,
    error,
    refetch,
  };
}