/**
 * src/core/events/listeners.ts
 *
 * App-wide event listeners.
 * Initialize once at app startup.
 */

import { eventBus } from './eventBus';
import { trackEvent } from '@/core/monitoring';
import { queryClient, queryKeys } from '@/core/queryClient';
import { websocketService } from '@/core/services/websocketService';

/**
 * Initialize app-wide event listeners.
 * Call this once at app startup.
 */
export function initializeEventListeners(): () => void {
  const unsubscribers: (() => void)[] = [];

  // === BOOK STARTED ===
  // When a new book starts playing, invalidate in-progress queries so the list re-sorts
  unsubscribers.push(
    eventBus.on('book:started', async ({ bookId }) => {
      console.log('[EventListeners] Book started, invalidating in-progress queries:', bookId);

      // Invalidate user progress lists so the newly started book appears at top
      queryClient.invalidateQueries({ queryKey: queryKeys.user.inProgress() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.continueListening() });
    })
  );

  // === BOOK COMPLETION ===
  unsubscribers.push(
    eventBus.on('book:finished', async ({ bookId, seriesId }) => {
      // Track for analytics
      trackEvent('book_completed', { bookId, seriesId });

      // Invalidate queries so series progress updates immediately
      // This ensures SeriesDetailScreen shows updated progress
      console.log('[EventListeners] Book finished, invalidating queries:', { bookId, seriesId });

      // Invalidate book progress
      queryClient.invalidateQueries({ queryKey: queryKeys.user.progress(bookId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.book.progress(bookId) });

      // Invalidate user progress lists (continue listening, in progress)
      queryClient.invalidateQueries({ queryKey: queryKeys.user.progressAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.inProgress() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.continueListening() });

      // If this book is part of a series, invalidate series queries
      if (seriesId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.series.detail(seriesId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.series.items(seriesId) });
      }

      // Refresh library cache to update book progress in series view
      try {
        const { useLibraryCache } = await import('@/core/cache/libraryCache');
        useLibraryCache.getState().refreshCache();
      } catch (err) {
        console.warn('[EventListeners] Failed to refresh library cache:', err);
      }
    })
  );

  // === PROGRESS SYNCED (from server) ===
  unsubscribers.push(
    eventBus.on('progress:synced', ({ bookId }) => {
      // Invalidate book progress query so UI shows updated position
      queryClient.invalidateQueries({ queryKey: queryKeys.user.progress(bookId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.book.progress(bookId) });
    })
  );

  // === SYNC CONFLICTS (server wins) ===
  unsubscribers.push(
    eventBus.on('progress:conflict', async ({ bookId, localPosition, serverPosition, winner }) => {
      // Track for analytics
      trackEvent('sync_conflict_resolved', {
        bookId,
        localPosition,
        serverPosition,
        winner,
      });

      // When server wins a conflict, invalidate the book and refresh UI
      console.log('[EventListeners] Conflict resolved (server wins), refreshing:', bookId);

      queryClient.invalidateQueries({ queryKey: queryKeys.user.progress(bookId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.book.progress(bookId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.inProgress() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.continueListening() });

      // Refresh library cache to update series views
      try {
        const { useLibraryCache } = await import('@/core/cache/libraryCache');
        useLibraryCache.getState().refreshCache();
      } catch (err) {
        console.warn('[EventListeners] Failed to refresh library cache:', err);
      }
    })
  );

  // === SYNC FAILURES ===
  unsubscribers.push(
    eventBus.on('progress:sync_failed', ({ bookId, error, retryCount }) => {
      if (retryCount >= 3) {
        // Track persistent failures
        trackEvent('sync_failed_exhausted', { bookId, error });
      }
    })
  );

  // === DOWNLOAD COMPLETION ===
  unsubscribers.push(
    eventBus.on('download:complete', ({ bookId, totalSize }) => {
      trackEvent('download_completed', { bookId, totalSize });
    })
  );

  // === DOWNLOAD FAILURES ===
  unsubscribers.push(
    eventBus.on('download:failed', ({ bookId, error }) => {
      trackEvent('download_failed', { bookId, error });
    })
  );

  // === AUTH EXPIRATION ===
  unsubscribers.push(
    eventBus.on('auth:token_expired', ({ endpoint }) => {
      trackEvent('auth_token_expired', { endpoint });
    })
  );

  // === APP LIFECYCLE ===
  unsubscribers.push(
    eventBus.on('app:cold_start', ({ loadTimeMs }) => {
      trackEvent('app_cold_start', { loadTimeMs });
    })
  );

  // === WEBSOCKET: PROGRESS UPDATES FROM OTHER DEVICES ===
  unsubscribers.push(
    eventBus.on('websocket:progress_updated', async ({ libraryItemId, currentTime, progress, isFinished }) => {
      console.log('[EventListeners] WebSocket progress update:', libraryItemId);

      // Track for analytics
      trackEvent('websocket_progress_received', { libraryItemId, isFinished });

      // Invalidate book progress queries
      queryClient.invalidateQueries({ queryKey: queryKeys.user.progress(libraryItemId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.book.progress(libraryItemId) });

      // Invalidate user progress lists (continue listening, in progress)
      queryClient.invalidateQueries({ queryKey: queryKeys.user.inProgress() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.continueListening() });

      // If finished, refresh the library cache to update series views
      if (isFinished) {
        try {
          const { useLibraryCache } = await import('@/core/cache/libraryCache');
          useLibraryCache.getState().refreshCache();
        } catch (err) {
          console.warn('[EventListeners] Failed to refresh library cache:', err);
        }
      }
    })
  );

  // === WEBSOCKET: ITEM ADDED ===
  unsubscribers.push(
    eventBus.on('websocket:item_added', async ({ libraryItemId, libraryId }) => {
      console.log('[EventListeners] WebSocket item added:', libraryItemId);

      trackEvent('websocket_item_added', { libraryItemId, libraryId });

      // Invalidate library queries to show new item
      queryClient.invalidateQueries({ queryKey: queryKeys.library.items(libraryId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.library.all });

      // Refresh library cache
      try {
        const { useLibraryCache } = await import('@/core/cache/libraryCache');
        useLibraryCache.getState().refreshCache();
      } catch (err) {
        console.warn('[EventListeners] Failed to refresh library cache:', err);
      }
    })
  );

  // === WEBSOCKET: ITEM UPDATED ===
  unsubscribers.push(
    eventBus.on('websocket:item_updated', async ({ libraryItemId, libraryId }) => {
      console.log('[EventListeners] WebSocket item updated:', libraryItemId);

      trackEvent('websocket_item_updated', { libraryItemId, libraryId });

      // Invalidate specific item query
      queryClient.invalidateQueries({ queryKey: queryKeys.library.item(libraryItemId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.book.detail(libraryItemId) });

      // Invalidate library item lists
      queryClient.invalidateQueries({ queryKey: queryKeys.library.items(libraryId) });

      // Refresh library cache
      try {
        const { useLibraryCache } = await import('@/core/cache/libraryCache');
        useLibraryCache.getState().refreshCache();
      } catch (err) {
        console.warn('[EventListeners] Failed to refresh library cache:', err);
      }
    })
  );

  // === WEBSOCKET: ITEM REMOVED ===
  unsubscribers.push(
    eventBus.on('websocket:item_removed', async ({ libraryItemId, libraryId }) => {
      console.log('[EventListeners] WebSocket item removed:', libraryItemId);

      trackEvent('websocket_item_removed', { libraryItemId, libraryId });

      // Invalidate specific item queries
      queryClient.invalidateQueries({ queryKey: queryKeys.library.item(libraryItemId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.book.detail(libraryItemId) });

      // Invalidate library lists
      queryClient.invalidateQueries({ queryKey: queryKeys.library.items(libraryId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.library.all });

      // Invalidate user progress (in case this was in progress)
      queryClient.invalidateQueries({ queryKey: queryKeys.user.inProgress() });

      // Refresh library cache
      try {
        const { useLibraryCache } = await import('@/core/cache/libraryCache');
        useLibraryCache.getState().refreshCache();
      } catch (err) {
        console.warn('[EventListeners] Failed to refresh library cache:', err);
      }
    })
  );

  // === WEBSOCKET: LIBRARY SCAN COMPLETE ===
  unsubscribers.push(
    eventBus.on('websocket:library_scan_complete', async ({ libraryId, itemsAdded, itemsUpdated }) => {
      console.log('[EventListeners] WebSocket library scan complete:', libraryId);

      trackEvent('websocket_library_scan_complete', { libraryId, itemsAdded, itemsUpdated });

      // Invalidate all library queries
      queryClient.invalidateQueries({ queryKey: queryKeys.library.items(libraryId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.series.list(libraryId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.authors.list(libraryId) });

      // Refresh library cache
      try {
        const { useLibraryCache } = await import('@/core/cache/libraryCache');
        useLibraryCache.getState().refreshCache();
      } catch (err) {
        console.warn('[EventListeners] Failed to refresh library cache:', err);
      }
    })
  );

  // === WEBSOCKET: CONNECTION MANAGEMENT ===
  unsubscribers.push(
    eventBus.on('websocket:connected', ({ serverUrl, userId }) => {
      trackEvent('websocket_connected', { serverUrl, userId });
    })
  );

  unsubscribers.push(
    eventBus.on('websocket:disconnected', ({ reason }) => {
      trackEvent('websocket_disconnected', { reason });
    })
  );

  // Connect WebSocket when network comes online
  unsubscribers.push(
    eventBus.on('network:online', () => {
      console.log('[EventListeners] Network online - reconnecting WebSocket');
      websocketService.reconnect();
    })
  );

  // Disconnect WebSocket when going offline
  unsubscribers.push(
    eventBus.on('network:offline', () => {
      console.log('[EventListeners] Network offline - disconnecting WebSocket');
      websocketService.disconnect('network');
    })
  );

  console.log('[EventListeners] Initialized');

  // Return cleanup function
  return () => {
    unsubscribers.forEach((unsub) => unsub());
    websocketService.disconnect('manual');
    console.log('[EventListeners] Cleaned up');
  };
}
