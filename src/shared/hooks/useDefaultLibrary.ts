/**
 * src/shared/hooks/useDefaultLibrary.ts
 *
 * Hook to fetch and return the user's selected library.
 * Persists the selection to AsyncStorage so it survives app restarts.
 *
 * Moved from features/library/hooks/ to shared/hooks/ because it's
 * consumed by browse, profile, and library features.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/core/api';
import { queryKeys } from '@/core/queryClient';
import { Library } from '@/core/types';

const SELECTED_LIBRARY_KEY = 'selectedLibraryId';

interface UseDefaultLibraryResult {
  library: Library | undefined;
  libraries: Library[];
  isLoading: boolean;
  error: Error | null;
  setLibrary: (id: string) => void;
}

/**
 * Fetch libraries and return the user's selected one (persisted to AsyncStorage).
 * Falls back to the first library if the saved ID is invalid or missing.
 */
export function useDefaultLibrary(): UseDefaultLibraryResult {
  const { data: libraries, isLoading, error } = useQuery({
    queryKey: queryKeys.libraries.all,
    queryFn: () => apiClient.getLibraries(),
    staleTime: 5 * 60 * 1000,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load saved selection on mount
  useEffect(() => {
    AsyncStorage.getItem(SELECTED_LIBRARY_KEY).then((id) => {
      if (id) setSelectedId(id);
      setLoaded(true);
    });
  }, []);

  // Resolve the active library: saved selection if valid, otherwise first
  const resolvedLibrary =
    (loaded && selectedId && libraries?.find((l) => l.id === selectedId)) ||
    libraries?.[0];

  const setLibrary = useCallback((id: string) => {
    setSelectedId(id);
    AsyncStorage.setItem(SELECTED_LIBRARY_KEY, id);
  }, []);

  return {
    library: resolvedLibrary,
    libraries: libraries ?? [],
    isLoading,
    error: error as Error | null,
    setLibrary,
  };
}
