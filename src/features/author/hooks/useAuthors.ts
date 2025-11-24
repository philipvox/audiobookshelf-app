import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api';
import { AuthorInfo } from '../services/authorAdapter';
import { SortOption } from '@/shared/components/FilterSortBar';

interface UseAuthorsOptions {
  sortBy?: SortOption;
  searchQuery?: string;
}

export function useAuthors(libraryId: string, options: UseAuthorsOptions = {}) {
  const { sortBy = 'name-asc', searchQuery = '' } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['authors', libraryId],
    queryFn: () => apiClient.getLibraryAuthors(libraryId),
    enabled: !!libraryId,
    staleTime: 10 * 60 * 1000,
  });

  const authors = useMemo(() => {
    if (!data) return [];
    
    let result: AuthorInfo[] = data.map((author) => ({
      id: author.id,
      name: author.name,
      imagePath: author.imagePath,
      bookCount: (author as any).numBooks || 0,
    }));

    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(lower));
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
    authors,
    authorCount: authors.length,
    isLoading,
    error,
    refetch,
  };
}