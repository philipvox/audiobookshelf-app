import { useState, useEffect, useMemo } from 'react';
import { searchService } from '../services/searchService';
import { LibraryItem } from '@/core/types';

const DEBOUNCE_DELAY = 300;

interface UseSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: LibraryItem[];
  isSearching: boolean;
  hasSearched: boolean;
}

export function useSearch(libraryItems: LibraryItem[]): UseSearchResult {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (libraryItems.length > 0) {
      searchService.buildIndex(libraryItems);
    }
  }, [libraryItems]);

  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setIsSearching(false);
      if (query.trim()) {
        setHasSearched(true);
      }
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return [];
    }
    return searchService.search(debouncedQuery);
  }, [debouncedQuery]);

  return {
    query,
    setQuery,
    results,
    isSearching,
    hasSearched,
  };
}
