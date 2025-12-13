/**
 * src/features/home/hooks/useContinueListening.ts
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api';
import { queryKeys } from '@/core/queryClient';
import { LibraryItem } from '@/core/types';
import { useCompletionStore } from '@/features/completion';

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

export function useContinueListening() {
  // Get completed books from completion store
  const isComplete = useCompletionStore((state) => state.isComplete);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.user.inProgress(),
    queryFn: async () => {
      const response = await apiClient.get<ItemsInProgressResponse>('/api/me/items-in-progress');
      // console.log('[ContinueListening] Raw count:', response?.libraryItems?.length);
      return response?.libraryItems || [];
    },
    staleTime: 1000 * 60 * 2,
    // Keep showing previous data while refetching for instant display
    placeholderData: (previousData) => previousData,
  });

  // The items ARE the library items - they come with progressLastUpdate at top level
  // and may have userMediaProgress attached
  const items = (data || [])
    .filter(item => {
      // Skip books marked as complete
      if (isComplete(item.id)) {
        return false;
      }

      // Has progress data
      const progress = item.userMediaProgress?.progress;
      const hasProgress = progress !== undefined && progress > 0 && progress < 1;

      // Or has progressLastUpdate (means it's in progress)
      const hasProgressUpdate = !!item.progressLastUpdate;

      // console.log('[ContinueListening] Item:', item.media?.metadata?.title, 'progress:', progress, 'lastUpdate:', item.progressLastUpdate);

      return hasProgress || hasProgressUpdate;
    })
    .sort((a, b) => {
      const aTime = a.progressLastUpdate || a.userMediaProgress?.lastUpdate || 0;
      const bTime = b.progressLastUpdate || b.userMediaProgress?.lastUpdate || 0;
      return bTime - aTime;
    });

  // console.log('[ContinueListening] Final items:', items.length);

  return {
    items,
    isLoading,
    error,
    refetch,
  };
}