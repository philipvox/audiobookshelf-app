/**
 * src/core/services/syncQueue.ts
 *
 * Sync queue for offline-first mutations.
 * Queues mutations when offline and processes them when connection is restored.
 */

import { sqliteCache } from './sqliteCache';
// Import directly to avoid circular dependency with @/core/api
import { apiClient } from '@/core/api/apiClient';
import { logger } from '@/shared/utils/logger';

// Safe NetInfo import - may not be available in Expo Go
let NetInfo: typeof import('@react-native-community/netinfo').default | null = null;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch {
  // NetInfo not available
}

interface SyncQueueItem {
  id: number;
  action: string;
  payload: string;
  createdAt: string;
  retryCount: number;
}

class SyncQueue {
  private isProcessing = false;
  private maxRetries = 3;
  private unsubscribe: (() => void) | null = null;

  /**
   * Add action to sync queue
   */
  async enqueue(action: string, payload: object): Promise<void> {
    await sqliteCache.addToSyncQueue({
      action,
      payload: JSON.stringify(payload),
      createdAt: new Date().toISOString(),
      retryCount: 0,
    });

    // Try to process immediately if online
    this.processQueue();
  }

  /**
   * Process pending sync items
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    // Check network status if NetInfo is available
    if (NetInfo) {
      try {
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) return;
      } catch {
        // Assume online on error
      }
    }

    this.isProcessing = true;

    try {
      const pendingItems = await sqliteCache.getSyncQueue();
      logger.debug(`[SyncQueue] Processing ${pendingItems.length} pending items`);

      for (const item of pendingItems) {
        try {
          logger.debug(`[SyncQueue] Processing: ${item.action}`);
          await this.processItem(item);
          await sqliteCache.removeSyncQueueItem(item.id);
          logger.debug(`[SyncQueue] Completed: ${item.action}`);
        } catch (error) {
          logger.warn('[SyncQueue] Failed to process item:', item.action, error);

          // Increment retry count
          if (item.retryCount < this.maxRetries) {
            await sqliteCache.updateSyncQueueRetry(item.id, item.retryCount + 1);
          } else {
            // Max retries reached, remove and log
            logger.error('[SyncQueue] Max retries reached, removing:', item);
            await sqliteCache.removeSyncQueueItem(item.id);
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processItem(item: SyncQueueItem): Promise<void> {
    // Fix HIGH: Safe JSON parsing with descriptive error
    let payload: unknown;
    try {
      payload = JSON.parse(item.payload);
    } catch (parseError) {
      throw new Error(
        `[SyncQueue] Invalid JSON in queue item ${item.id} (action: ${item.action}): ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`
      );
    }

    // Validate payload is an object
    if (!payload || typeof payload !== 'object') {
      throw new Error(
        `[SyncQueue] Invalid payload type in queue item ${item.id} (action: ${item.action}): expected object, got ${typeof payload}`
      );
    }

    // Cast to record for property access
    const data = payload as Record<string, unknown>;

    switch (item.action) {
      case 'favorite':
        // AudiobookShelf doesn't have a native favorites API, so we use myLibrary store
        // For server sync, we could use a custom collection named "Favorites"
        logger.debug('[SyncQueue] Processing favorite:', data.itemId);
        break;

      case 'unfavorite':
        logger.debug('[SyncQueue] Processing unfavorite:', data.itemId);
        break;

      case 'progress': {
        // Fix HIGH: Validate required fields for progress sync
        const itemId = data.itemId as string;
        const currentTime = data.currentTime as number;
        const duration = data.duration as number;
        if (!itemId || typeof currentTime !== 'number' || typeof duration !== 'number') {
          throw new Error(`[SyncQueue] Progress item missing required fields: itemId=${itemId}, currentTime=${currentTime}, duration=${duration}`);
        }
        await apiClient.updateProgress(itemId, {
          currentTime,
          duration,
          progress: duration > 0 ? currentTime / duration : 0,
        });
        await sqliteCache.markProgressSynced(itemId);
        break;
      }

      case 'add_to_playlist': {
        const playlistId = data.playlistId as string;
        const itemId = data.itemId as string;
        if (!playlistId || !itemId) {
          throw new Error(`[SyncQueue] add_to_playlist missing required fields: playlistId=${playlistId}, itemId=${itemId}`);
        }
        logger.debug(`[SyncQueue] playlist batch/add: ${itemId} to ${playlistId}`);
        const { playlistsApi } = await import('@/core/api/endpoints/playlists');
        await playlistsApi.batchAdd(playlistId, [itemId]);
        logger.debug(`[SyncQueue] playlist batch/add complete`);
        break;
      }

      case 'remove_from_playlist': {
        const playlistId = data.playlistId as string;
        const itemId = data.itemId as string;
        if (!playlistId || !itemId) {
          throw new Error(`[SyncQueue] remove_from_playlist missing required fields: playlistId=${playlistId}, itemId=${itemId}`);
        }
        logger.debug(`[SyncQueue] playlist batch/remove: ${itemId} from ${playlistId}`);
        const { playlistsApi } = await import('@/core/api/endpoints/playlists');
        await playlistsApi.batchRemove(playlistId, [itemId]);
        logger.debug(`[SyncQueue] playlist batch/remove complete`);
        break;
      }

      case 'playlist_update_series': {
        const playlistId = data.playlistId as string;
        const description = data.description as string;
        if (!playlistId || !description) {
          throw new Error(`[SyncQueue] playlist_update_series missing required fields: playlistId=${playlistId}`);
        }
        const { playlistsApi } = await import('@/core/api/endpoints/playlists');
        await playlistsApi.update(playlistId, { description });
        break;
      }

      // Legacy collection actions (kept for processing any queued items from before migration)
      case 'add_to_collection': {
        const collectionId = data.collectionId as string;
        const itemId = data.itemId as string;
        if (!collectionId || !itemId) break;
        await apiClient.batchAddToCollection(collectionId, [itemId]);
        break;
      }

      case 'remove_from_collection': {
        const collectionId = data.collectionId as string;
        const itemId = data.itemId as string;
        if (!collectionId || !itemId) break;
        await apiClient.batchRemoveFromCollection(collectionId, [itemId]);
        break;
      }

      case 'library_update_series': {
        const collectionId = data.collectionId as string;
        const description = data.description as string;
        if (!collectionId || !description) break;
        await apiClient.updateCollection(collectionId, { description } as any);
        break;
      }

      default:
        logger.warn('[SyncQueue] Unknown action:', item.action);
    }
  }

  /**
   * Start listening for network changes
   */
  startNetworkListener(): void {
    if (this.unsubscribe) return;

    if (NetInfo) {
      this.unsubscribe = NetInfo.addEventListener((state) => {
        if (state.isConnected) {
          logger.debug('[SyncQueue] Network connected, processing queue...');
          this.processQueue();
        }
      });
    }

    // Process any pending items on startup
    this.processQueue();
  }

  /**
   * Stop listening for network changes
   */
  stopNetworkListener(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Get pending sync count
   */
  async getPendingCount(): Promise<number> {
    const items = await sqliteCache.getSyncQueue();
    return items.length;
  }

  /**
   * Clear all pending items
   */
  async clear(): Promise<void> {
    await sqliteCache.clearSyncQueue();
  }
}

// Singleton instance
export const syncQueue = new SyncQueue();
