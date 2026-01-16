/**
 * src/shared/hooks/useContinueListening.ts
 *
 * UNIFIED PROGRESS + LIBRARY ARCHITECTURE
 *
 * This hook returns books the user is listening to OR has added to their library.
 * Uses progressStore as the primary source of truth.
 *
 * Data flow:
 * 1. progressStore (local SQLite) provides progress + library membership data
 * 2. libraryCache provides book metadata (title, author, cover, etc.)
 * 3. Server fetch syncs in background (doesn't block UI)
 *
 * Benefits:
 * - Instant progress updates when playing/pausing
 * - Books appear immediately when added to library
 * - No refresh needed to see current progress
 * - Works offline with cached data
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api';
import { queryKeys } from '@/core/queryClient';
import { LibraryItem } from '@/core/types';
import { useCompletionStore } from '@/features/completion';
import { useProgressStore } from '@/core/stores/progressStore';
import { useLibraryCache } from '@/core/cache/libraryCache';

interface ItemsInProgressResponse {
  libraryItems: (LibraryItem & {
    progressLastUpdate?: number;
    userMediaProgress?: {
      progress: number;
      currentTime: number;
      duration: number;
      isFinished: boolean;
      lastUpdate: number;
    };
  })[];
}

/**
 * Extended item type with library membership info
 * Extends LibraryItem directly so it remains assignable to LibraryItem
 */
export interface ContinueListeningItem extends LibraryItem {
  progressLastUpdate?: number;
  /** Whether the book was explicitly added to library (vs just in-progress) */
  isInLibrary: boolean;
  /** Whether the user has started listening (progress > 0) */
  hasStarted: boolean;
  /** Timestamp of most recent interaction (for display: "Added X ago" or "Played X ago") */
  lastInteraction: number;
}

/**
 * Hook for getting books the user is listening to OR has added to library.
 * Uses local progressStore for instant updates, syncs with server in background.
 */
export function useContinueListening() {
  // Get completed books from completion store
  const isComplete = useCompletionStore((state) => state.isComplete);

  // PRIMARY: Get progress + library data from local store (instant, reactive)
  const progressVersion = useProgressStore((state) => state.version);
  const isProgressLoaded = useProgressStore((state) => state.isLoaded);
  const getLibraryBookIds = useProgressStore((state) => state.getLibraryBookIds);
  const getProgress = useProgressStore((state) => state.getProgress);

  // Get book metadata from library cache
  const getItem = useLibraryCache((state) => state.getItem);
  const isLibraryLoaded = useLibraryCache((state) => state.isLoaded);

  // SECONDARY: Background server sync (keeps local data fresh)
  // This runs in background and updates progressStore via finishedBooksSync
  const { refetch, isLoading: isServerLoading } = useQuery({
    queryKey: queryKeys.user.inProgress(),
    queryFn: async () => {
      const response = await apiClient.get<ItemsInProgressResponse>('/api/me/items-in-progress');
      return response?.libraryItems || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - we rely on local store for real-time
    // Don't block UI - local store has data
    enabled: isProgressLoaded && isLibraryLoaded,
  });

  // Build items list from local progress + library cache
  const items = useMemo((): ContinueListeningItem[] => {
    if (!isProgressLoaded || !isLibraryLoaded) {
      return [];
    }

    // Use unified library IDs (includes both in-progress AND added-to-library)
    const libraryBookIds = getLibraryBookIds();

    return libraryBookIds
      .filter((bookId) => {
        // Skip books marked as complete
        if (isComplete(bookId)) {
          return false;
        }

        // Verify book exists in library cache
        const item = getItem(bookId);
        if (!item) {
          return false;
        }

        return true;
      })
      .map((bookId) => {
        const item = getItem(bookId)!;
        const progressData = getProgress(bookId);

        const hasStarted = (progressData?.progress ?? 0) > 0;
        const lastInteraction = Math.max(
          progressData?.lastPlayedAt ?? 0,
          progressData?.addedToLibraryAt ?? 0
        );

        // Attach progress + library data to item
        // Merge progress data with existing userMediaProgress if present
        const existingProgress = item.userMediaProgress || item.mediaProgress;
        const mergedProgress = existingProgress
          ? {
              ...existingProgress,
              progress: progressData?.progress ?? existingProgress.progress,
              currentTime: progressData?.currentTime ?? existingProgress.currentTime,
              isFinished: progressData?.isFinished ?? existingProgress.isFinished,
              lastUpdate: progressData?.lastPlayedAt ?? existingProgress.lastUpdate,
            }
          : undefined;

        return {
          ...item,
          progressLastUpdate: progressData?.lastPlayedAt || 0,
          userMediaProgress: mergedProgress,
          // New library membership fields
          isInLibrary: progressData?.isInLibrary ?? false,
          hasStarted,
          lastInteraction,
        } as ContinueListeningItem;
      });
    // Note: Items are already sorted by most recent interaction in getLibraryBookIds()
  }, [
    progressVersion, // Re-compute when progress changes
    isProgressLoaded,
    isLibraryLoaded,
    getLibraryBookIds,
    getProgress,
    getItem,
    isComplete,
  ]);

  return {
    items,
    isLoading: !isProgressLoaded || !isLibraryLoaded,
    isServerLoading,
    error: null, // Local store doesn't have errors
    refetch,
  };
}

/**
 * Legacy hook that still uses server fetch as primary source.
 * Use this if you need server-authoritative data (e.g., for sync verification).
 */
export function useContinueListeningFromServer() {
  const isComplete = useCompletionStore((state) => state.isComplete);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.user.inProgress(),
    queryFn: async () => {
      const response = await apiClient.get<ItemsInProgressResponse>('/api/me/items-in-progress');
      return response?.libraryItems || [];
    },
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
  });

  const items = (data || [])
    .filter((item) => {
      if (isComplete(item.id)) {
        return false;
      }
      const progress = item.userMediaProgress?.progress;
      const hasProgress = progress !== undefined && progress > 0 && progress < 1;
      const hasProgressUpdate = !!item.progressLastUpdate;
      return hasProgress || hasProgressUpdate;
    })
    .sort((a, b) => {
      const aTime = a.progressLastUpdate || a.userMediaProgress?.lastUpdate || 0;
      const bTime = b.progressLastUpdate || b.userMediaProgress?.lastUpdate || 0;
      return bTime - aTime;
    });

  return {
    items,
    isLoading,
    error,
    refetch,
  };
}