/**
 * src/features/search/hooks/useServerSearch.ts
 *
 * Server-side search hook - much faster than loading all items
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/core/api';
import { LibraryItem } from '@/core/types';
import {
  BookSearchResult,
  SeriesSearchResult,
  AuthorSearchResult,
  NarratorSearchResult,
} from '@/core/types/api';

export interface SearchResults {
  books: LibraryItem[];
  series: SeriesResult[];
  authors: AuthorResult[];
  narrators: NarratorResult[];
  totalCount: number;
}

export interface SeriesResult {
  name: string;
  books: LibraryItem[];
}

export interface AuthorResult {
  name: string;
  books: LibraryItem[];
}

export interface NarratorResult {
  name: string;
  books: LibraryItem[];
}

const DEBOUNCE_MS = 300;

export function useServerSearch(libraryId: string) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    books: [],
    series: [],
    authors: [],
    narrators: [],
    totalCount: 0,
  });
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!libraryId || searchQuery.length < 2) {
      setResults({ books: [], series: [], authors: [], narrators: [], totalCount: 0 });
      setHasSearched(false);
      return;
    }

    // Cancel previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await apiClient.searchLibrary(libraryId, { q: searchQuery });

      // Extract books from response
      const books: LibraryItem[] = response.book?.map((b: BookSearchResult) => b.libraryItem) || [];

      // Extract series
      const seriesResults: SeriesResult[] = response.series?.map((s: SeriesSearchResult) => ({
        name: s.series?.name || '',
        books: s.books?.map((b: BookSearchResult) => b.libraryItem) || [],
      })).filter((s: SeriesResult) => s.name) || [];

      // Extract authors
      const authorResults: AuthorResult[] = response.authors?.map((a: AuthorSearchResult) => ({
        name: a.name || '',
        books: [], // Server doesn't return books with authors
      })).filter((a: AuthorResult) => a.name) || [];

      // Extract narrators
      const narratorResults: NarratorResult[] = response.narrators?.map((n: NarratorSearchResult) => ({
        name: n.name || '',
        books: [],
      })).filter((n: NarratorResult) => n.name) || [];

      // Group books by author/narrator for display
      const authorMap = new Map<string, LibraryItem[]>();
      const narratorMap = new Map<string, LibraryItem[]>();
      
      books.forEach(book => {
        const metadata = book.media?.metadata as any;
        const authorName = metadata?.authorName ||
          metadata?.authors?.[0]?.name || '';
        const narratorName = metadata?.narratorName || '';
        
        if (authorName) {
          const existing = authorMap.get(authorName) || [];
          existing.push(book);
          authorMap.set(authorName, existing);
        }
        
        if (narratorName) {
          const existing = narratorMap.get(narratorName) || [];
          existing.push(book);
          narratorMap.set(narratorName, existing);
        }
      });

      // Merge with API results
      const mergedAuthors = Array.from(authorMap.entries()).map(([name, bookList]) => ({
        name,
        books: bookList,
      }));

      const mergedNarrators = Array.from(narratorMap.entries()).map(([name, bookList]) => ({
        name,
        books: bookList,
      }));

      setResults({
        books,
        series: seriesResults,
        authors: mergedAuthors.length > 0 ? mergedAuthors : authorResults,
        narrators: mergedNarrators.length > 0 ? mergedNarrators : narratorResults,
        totalCount: books.length,
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Search error:', err);
      }
    } finally {
      setIsSearching(false);
    }
  }, [libraryId]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setResults({ books: [], series: [], authors: [], narrators: [], totalCount: 0 });
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults({ books: [], series: [], authors: [], narrators: [], totalCount: 0 });
    setHasSearched(false);
  }, []);

  return {
    query,
    setQuery,
    clearSearch,
    results,
    isSearching,
    hasSearched,
  };
}