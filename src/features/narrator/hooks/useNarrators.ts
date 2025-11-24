import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LibraryItem } from '@/core/types';
import { SortOption } from '@/shared/components/FilterSortBar';

export interface NarratorInfo {
  id: string;
  name: string;
  bookCount: number;
  books: LibraryItem[];
}

interface UseNarratorsOptions {
  sortBy?: SortOption;
  searchQuery?: string;
}

interface UseNarratorsResult {
  narrators: NarratorInfo[];
  narratorCount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useNarrators(
  libraryId: string,
  options: UseNarratorsOptions = {}
): UseNarratorsResult {
  const { sortBy = 'name-asc', searchQuery = '' } = options;

  // Use pre-cached narrator data from bootstrap
  const { data, isLoading, error, refetch } = useQuery<NarratorInfo[]>({
    queryKey: ['narrators', libraryId],
    enabled: !!libraryId,
    staleTime: 10 * 60 * 1000,
  });

  const narrators = useMemo(() => {
    if (!data?.length) return [];

    let result = [...data];

    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter((n) => n.name.toLowerCase().includes(lower));
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
    narrators,
    narratorCount: narrators.length,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}