/**
 * src/features/library/hooks/useDefaultLibrary.ts
 *
 * Hook to fetch and return the user's default library.
 * For now, returns the first library in the list.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api';
import { Library } from '@/core/types';

interface UseDefaultLibraryResult {
  library: Library | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch the user's default library (first library for now)
 */
export function useDefaultLibrary(): UseDefaultLibraryResult {
  const { data: libraries, isLoading, error } = useQuery({
    queryKey: ['libraries'],
    queryFn: () => apiClient.getLibraries(),
    staleTime: 5 * 60 * 1000, // 5 minutes - libraries don't change often
  });

  // Use first library as default (can be enhanced later with user preference)
  const defaultLibrary = libraries?.[0];

  return {
    library: defaultLibrary,
    isLoading,
    error: error as Error | null,
  };
}
