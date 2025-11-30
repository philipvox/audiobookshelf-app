/**
 * src/features/player/services/progressService.ts
 *
 * Handles local progress storage for offline playback using SQLite.
 * SQLite provides faster read/write operations compared to AsyncStorage.
 */

import { sqliteCache } from '@/core/services/sqliteCache';

interface LocalProgress {
  itemId: string;
  currentTime: number;
  duration: number;
  progress: number;
  isFinished: boolean;
  updatedAt?: number;
}

class ProgressService {
  /**
   * Save progress locally (for offline playback) using SQLite
   */
  async saveLocalOnly(progress: LocalProgress): Promise<void> {
    try {
      await sqliteCache.setPlaybackProgress(
        progress.itemId,
        progress.currentTime,
        progress.duration,
        false // Not synced yet
      );
    } catch (e) {
      console.warn('[ProgressService] Failed to save local progress:', e);
    }
  }

  /**
   * Get local progress for a book
   */
  async getLocalProgress(itemId: string): Promise<number> {
    try {
      const progress = await sqliteCache.getPlaybackProgress(itemId);
      return progress?.position || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get full progress data for a book
   */
  async getProgressData(itemId: string): Promise<LocalProgress | null> {
    try {
      const progress = await sqliteCache.getPlaybackProgress(itemId);
      if (progress) {
        return {
          itemId: progress.itemId,
          currentTime: progress.position,
          duration: progress.duration,
          progress: progress.duration > 0 ? progress.position / progress.duration : 0,
          isFinished: progress.position >= progress.duration * 0.99,
          updatedAt: progress.updatedAt,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Clear progress for a book
   * Note: We just set position to 0 rather than deleting
   */
  async clearProgress(itemId: string): Promise<void> {
    try {
      await sqliteCache.setPlaybackProgress(itemId, 0, 0, true);
    } catch {
      // Ignore
    }
  }

  /**
   * Get all unsynced progress entries (for background sync)
   */
  async getUnsyncedProgress(): Promise<LocalProgress[]> {
    try {
      const unsycned = await sqliteCache.getUnsyncedProgress();
      return unsycned.map(p => ({
        itemId: p.itemId,
        currentTime: p.position,
        duration: p.duration,
        progress: p.duration > 0 ? p.position / p.duration : 0,
        isFinished: p.position >= p.duration * 0.99,
        updatedAt: p.updatedAt,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Mark progress as synced (after successful server sync)
   */
  async markSynced(itemId: string): Promise<void> {
    try {
      await sqliteCache.markProgressSynced(itemId);
    } catch {
      // Ignore
    }
  }
}

export const progressService = new ProgressService();
