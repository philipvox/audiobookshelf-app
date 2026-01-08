/**
 * src/core/services/finishedBooksSync.ts
 *
 * Service for syncing finished book status between local SQLite and server.
 * Handles both pushing local changes to server and importing from server.
 */

import { sqliteCache } from './sqliteCache';
import { userApi } from '@/core/api/endpoints/user';
import { apiClient } from '@/core/api';
import { syncLogger as log } from '@/shared/utils/logger';
import { useLibraryCache } from '@/core/cache/libraryCache';

/**
 * Sync finished books between local SQLite and server.
 */
export const finishedBooksSync = {
  /**
   * Sync local unsynced finished books to server.
   * Called on app startup and after marking books.
   */
  async syncToServer(): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    try {
      const unsynced = await sqliteCache.getUnsyncedUserBooks();
      const toSync = unsynced.filter((b) => !b.finishedSynced);

      for (const book of toSync) {
        try {
          if (book.isFinished) {
            await userApi.markAsFinished(book.bookId, book.duration);
          } else {
            await userApi.markAsNotStarted(book.bookId);
          }
          await sqliteCache.markUserBookSynced(book.bookId, { finished: true });
          synced++;
        } catch (err) {
          log.warn(`Failed to sync ${book.bookId}:`, err);
          failed++;
        }
      }

      if (synced > 0 || failed > 0) {
        log.info(`Synced ${synced}, failed ${failed}`);
      }
    } catch (err) {
      log.error('syncToServer error:', err);
    }

    return { synced, failed };
  },

  /**
   * Import finished books from server.
   * Called on app startup to get server's finished state.
   */
  async importFromServer(): Promise<number> {
    let imported = 0;

    try {
      // Get library items from cache (they should be loaded by now)
      const libraryId = useLibraryCache.getState().currentLibraryId;
      if (!libraryId) {
        log.warn('No current library ID - skipping import');
        return 0;
      }
      const response = await apiClient.getLibraryItems(libraryId, { limit: 1000 });
      const items = response.results || [];

      for (const item of items) {
        const serverProgress = (item as any).userMediaProgress;
        if (!serverProgress) continue;

        // Check if server has this book as finished (95% threshold for consistency)
        if (serverProgress.isFinished || serverProgress.progress >= 0.95) {
          const existing = await sqliteCache.getUserBook(item.id);

          // Only import if not already finished locally
          if (!existing?.isFinished) {
            await sqliteCache.markUserBookFinished(item.id, true, 'progress');
            await sqliteCache.markUserBookSynced(item.id, { finished: true });
            imported++;
          }
        }
      }

      if (imported > 0) {
        log.info(`Imported ${imported} finished books from server`);
      }
    } catch (err) {
      log.warn('importFromServer error:', err);
    }

    return imported;
  },

  /**
   * Full sync: import from server first, then sync local changes.
   */
  async fullSync(): Promise<{ imported: number; synced: number; failed: number }> {
    // Import from server first (get server's state)
    const imported = await this.importFromServer();

    // Then sync local changes to server
    const { synced, failed } = await this.syncToServer();

    return { imported, synced, failed };
  },

  /**
   * Sync a single book to server immediately.
   * Used after marking a book as finished.
   */
  async syncBook(bookId: string, isFinished: boolean, duration?: number): Promise<boolean> {
    try {
      if (isFinished) {
        await userApi.markAsFinished(bookId, duration);
      } else {
        await userApi.markAsNotStarted(bookId);
      }
      await sqliteCache.markUserBookSynced(bookId, { finished: true });
      return true;
    } catch (err) {
      log.warn(`Failed to sync book ${bookId}:`, err);
      return false;
    }
  },
};

export default finishedBooksSync;
