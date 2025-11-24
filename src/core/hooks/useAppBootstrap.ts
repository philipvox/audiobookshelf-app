import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api';
import { LibraryItem } from '@/core/types';

interface BootstrapResult {
  isReady: boolean;
  error: Error | null;
}

export function useAppBootstrap(libraryId: string | undefined): BootstrapResult {
  const queryClient = useQueryClient();
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!libraryId) return;

    const bootstrap = async () => {
      try {
        const staleTime = 10 * 60 * 1000;

        // Load all library items first (needed for narrators + search)
        const allItems = await queryClient.fetchQuery({
          queryKey: ['allLibraryItems', libraryId],
          queryFn: async () => {
            const items: LibraryItem[] = [];
            let page = 0;
            const limit = 100;
            let hasMore = true;

            while (hasMore) {
              const response = await apiClient.getLibraryItems(libraryId, {
                limit,
                page,
                include: 'progress',
              });
              items.push(...response.results);
              hasMore = items.length < response.total;
              page++;
            }
            return items;
          },
          staleTime,
        });

        // Extract and cache narrators from items
        const narratorMap = new Map<string, { id: string; name: string; bookCount: number; books: LibraryItem[] }>();
        allItems.forEach((item) => {
          const narrators = (item.media?.metadata as any)?.narrators || [];
          narrators.forEach((name: string) => {
            if (!name || typeof name !== 'string') return;
            const trimmed = name.trim();
            if (!trimmed) return;
            const id = trimmed.toLowerCase().replace(/\s+/g, '-');
            const existing = narratorMap.get(id);
            if (existing) {
              existing.bookCount++;
              existing.books.push(item);
            } else {
              narratorMap.set(id, { id, name: trimmed, bookCount: 1, books: [item] });
            }
          });
        });
        queryClient.setQueryData(['narrators', libraryId], Array.from(narratorMap.values()));

        // Load series and authors in parallel
        await Promise.all([
          queryClient.fetchQuery({
            queryKey: ['series', libraryId],
            queryFn: () => apiClient.getLibrarySeries(libraryId),
            staleTime,
          }),
          queryClient.fetchQuery({
            queryKey: ['authors', libraryId],
            queryFn: () => apiClient.getLibraryAuthors(libraryId),
            staleTime,
          }),
          queryClient.fetchQuery({
            queryKey: ['collections'],
            queryFn: () => apiClient.getCollections(),
            staleTime,
          }),
        ]);

        setIsReady(true);
      } catch (err) {
        console.error('Bootstrap failed:', err);
        setError(err as Error);
        setIsReady(true); // Still show app, will show errors
      }
    };

    bootstrap();
  }, [libraryId, queryClient]);

  return { isReady, error };
}