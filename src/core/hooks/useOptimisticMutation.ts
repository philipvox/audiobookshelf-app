/**
 * src/core/hooks/useOptimisticMutation.ts
 *
 * Optimistic mutation hook for instant UI feedback.
 * Updates React Query cache immediately, then syncs with server.
 * Rolls back on failure.
 */

import { useMutation, useQueryClient, QueryKey, MutationOptions } from '@tanstack/react-query';

interface OptimisticMutationOptions<TData, TVariables, TContext> {
  // The mutation function that calls the API
  mutationFn: (variables: TVariables) => Promise<TData>;

  // Query keys to update optimistically
  queryKey: QueryKey;

  // Function to update cache optimistically before mutation
  optimisticUpdate: (oldData: TData | undefined, variables: TVariables) => TData;

  // Optional: Function to update cache after successful mutation
  onSuccessUpdate?: (oldData: TData | undefined, newData: TData, variables: TVariables) => TData;

  // Optional: Callback on success
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void;

  // Optional: Callback on error (after rollback)
  onError?: (error: Error, variables: TVariables, context: TContext | undefined) => void;

  // Optional: Callback on mutation settle (success or error)
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables, context: TContext | undefined) => void;
}

/**
 * Hook for optimistic mutations with automatic rollback
 */
export function useOptimisticMutation<TData, TVariables, TContext = { previousData: TData | undefined }>(
  options: OptimisticMutationOptions<TData, TVariables, TContext>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: options.mutationFn,

    // Before mutation: save current data and apply optimistic update
    onMutate: async (variables: TVariables) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: options.queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(options.queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<TData>(options.queryKey, (oldData) =>
        options.optimisticUpdate(oldData, variables)
      );

      // Return context with the previous data for rollback
      return { previousData } as TContext;
    },

    // On error: rollback to previous data
    onError: (error: Error, variables: TVariables, context: TContext | undefined) => {
      // Rollback to the previous value
      if (context && (context as any).previousData !== undefined) {
        queryClient.setQueryData(options.queryKey, (context as any).previousData);
      }

      options.onError?.(error, variables, context);
    },

    // On success: optionally update with server response
    onSuccess: (data: TData, variables: TVariables, context: TContext | undefined) => {
      if (options.onSuccessUpdate) {
        queryClient.setQueryData<TData>(options.queryKey, (oldData) =>
          options.onSuccessUpdate!(oldData, data, variables)
        );
      }

      options.onSuccess?.(data, variables, context);
    },

    // Always refetch after error or success
    onSettled: (data, error, variables, context) => {
      // Optionally invalidate to ensure we're in sync
      // queryClient.invalidateQueries({ queryKey: options.queryKey });

      options.onSettled?.(data, error ?? null, variables, context);
    },
  });
}

/**
 * Hook for optimistic progress updates
 * Instantly updates UI when user seeks/pauses, syncs with server in background
 */
export function useOptimisticProgress(itemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: { position: number; duration: number }) => {
      // Import dynamically to avoid circular dependencies
      const { backgroundSyncService } = await import('@/features/player/services/backgroundSyncService');
      await backgroundSyncService.saveProgress(itemId, variables.position, variables.duration);
      return variables;
    },

    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['progress', itemId] });

      // Snapshot previous
      const previousProgress = queryClient.getQueryData(['progress', itemId]);

      // Optimistically update
      queryClient.setQueryData(['progress', itemId], {
        itemId,
        currentTime: variables.position,
        duration: variables.duration,
        progress: variables.duration > 0 ? variables.position / variables.duration : 0,
        updatedAt: Date.now(),
      });

      return { previousProgress };
    },

    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousProgress) {
        queryClient.setQueryData(['progress', itemId], context.previousProgress);
      }
    },
  });
}

/**
 * Hook for optimistic collection updates
 */
export function useOptimisticCollection() {
  const queryClient = useQueryClient();

  const addToCollection = useMutation({
    mutationFn: async (variables: { collectionId: string; itemId: string }) => {
      const { apiClient } = await import('@/core/api');
      const collection = await apiClient.getCollection(variables.collectionId);
      const updatedBooks = [...(collection.books || []), { id: variables.itemId }];
      return apiClient.updateCollection(variables.collectionId, { books: updatedBooks as any });
    },

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['collections'] });

      const previousCollections = queryClient.getQueryData(['collections']);

      // Optimistically add item to collection
      queryClient.setQueryData(['collections'], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((collection) => {
          if (collection.id === variables.collectionId) {
            return {
              ...collection,
              books: [...(collection.books || []), { id: variables.itemId }],
            };
          }
          return collection;
        });
      });

      return { previousCollections };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousCollections) {
        queryClient.setQueryData(['collections'], context.previousCollections);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  const removeFromCollection = useMutation({
    mutationFn: async (variables: { collectionId: string; itemId: string }) => {
      const { apiClient } = await import('@/core/api');
      const collection = await apiClient.getCollection(variables.collectionId);
      const updatedBooks = (collection.books || []).filter((b: any) => b.id !== variables.itemId);
      return apiClient.updateCollection(variables.collectionId, { books: updatedBooks as any });
    },

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['collections'] });

      const previousCollections = queryClient.getQueryData(['collections']);

      // Optimistically remove item from collection
      queryClient.setQueryData(['collections'], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((collection) => {
          if (collection.id === variables.collectionId) {
            return {
              ...collection,
              books: (collection.books || []).filter((b: any) => b.id !== variables.itemId),
            };
          }
          return collection;
        });
      });

      return { previousCollections };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousCollections) {
        queryClient.setQueryData(['collections'], context.previousCollections);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  return { addToCollection, removeFromCollection };
}
