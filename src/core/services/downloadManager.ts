/**
 * src/core/services/downloadManager.ts
 *
 * Download manager for offline audio files.
 * Handles download queue, progress tracking, and file management.
 */

import * as FileSystem from 'expo-file-system';
import { sqliteCache } from './sqliteCache';
import { apiClient } from '@/core/api';
import { LibraryItem } from '@/core/types';
import { useAuthStore } from '@/features/auth/stores/authStore';

// =============================================================================
// TYPES
// =============================================================================

export interface DownloadTask {
  itemId: string;
  status: 'pending' | 'downloading' | 'complete' | 'error' | 'paused';
  progress: number;
  error?: string;
}

type DownloadListener = (tasks: DownloadTask[]) => void;
type ProgressListener = (itemId: string, progress: number) => void;

// =============================================================================
// DOWNLOAD MANAGER
// =============================================================================

class DownloadManager {
  private activeDownloads: Map<string, FileSystem.DownloadResumable> = new Map();
  private listeners: Set<DownloadListener> = new Set();
  private progressListeners: Set<ProgressListener> = new Set();
  private isProcessingQueue = false;

  // Directory for downloaded files
  private readonly DOWNLOAD_DIR = `${FileSystem.documentDirectory}audiobooks/`;

  /**
   * Initialize the download manager
   */
  async init(): Promise<void> {
    // Ensure download directory exists
    const dirInfo = await FileSystem.getInfoAsync(this.DOWNLOAD_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.DOWNLOAD_DIR, { intermediates: true });
    }

    // Resume any paused downloads
    await this.resumePausedDownloads();

    // Start processing the queue
    this.processQueue();
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Queue a book for download
   */
  async queueDownload(item: LibraryItem, priority = 0): Promise<void> {
    const itemId = item.id;

    // Check if already downloaded
    const existing = await sqliteCache.getDownload(itemId);
    if (existing?.status === 'complete') {
      console.log('[DownloadManager] Already downloaded:', itemId);
      return;
    }

    // Add to database with pending status
    await sqliteCache.setDownload({
      itemId,
      status: 'pending',
      progress: 0,
      filePath: null,
      fileSize: null,
      downloadedAt: null,
      error: null,
    });

    // Add to queue
    await sqliteCache.addToDownloadQueue(itemId, priority);

    // Cache the library item metadata for offline access
    await sqliteCache.setLibraryItems(item.libraryId, [item]);

    this.notifyListeners();

    // Start processing queue
    this.processQueue();
  }

  /**
   * Cancel a download
   */
  async cancelDownload(itemId: string): Promise<void> {
    // Cancel active download
    const download = this.activeDownloads.get(itemId);
    if (download) {
      try {
        await download.pauseAsync();
      } catch {
        // Ignore errors when pausing
      }
      this.activeDownloads.delete(itemId);
    }

    // Remove from database and queue
    await sqliteCache.deleteDownload(itemId);

    // Delete any downloaded files
    await this.deleteFiles(itemId);

    this.notifyListeners();
  }

  /**
   * Pause a download
   */
  async pauseDownload(itemId: string): Promise<void> {
    const download = this.activeDownloads.get(itemId);
    if (download) {
      await download.pauseAsync();
      this.activeDownloads.delete(itemId);

      await sqliteCache.setDownload({
        itemId,
        status: 'paused',
        progress: (await sqliteCache.getDownload(itemId))?.progress || 0,
        filePath: null,
        fileSize: null,
        downloadedAt: null,
        error: null,
      });

      this.notifyListeners();
    }
  }

  /**
   * Resume a paused download
   */
  async resumeDownload(itemId: string): Promise<void> {
    const download = await sqliteCache.getDownload(itemId);
    if (download?.status === 'paused') {
      await sqliteCache.setDownload({
        ...download,
        status: 'pending',
      });
      await sqliteCache.addToDownloadQueue(itemId, 10); // High priority for resumed
      this.processQueue();
    }
  }

  /**
   * Delete downloaded files
   */
  async deleteDownload(itemId: string): Promise<void> {
    await sqliteCache.deleteDownload(itemId);
    await this.deleteFiles(itemId);
    this.notifyListeners();
  }

  /**
   * Get download status for an item
   */
  async getDownloadStatus(itemId: string): Promise<DownloadTask | null> {
    const record = await sqliteCache.getDownload(itemId);
    if (!record) return null;

    return {
      itemId: record.itemId,
      status: record.status,
      progress: record.progress,
      error: record.error || undefined,
    };
  }

  /**
   * Get all downloads
   */
  async getAllDownloads(): Promise<DownloadTask[]> {
    const records = await sqliteCache.getAllDownloads();
    return records.map((r) => ({
      itemId: r.itemId,
      status: r.status,
      progress: r.progress,
      error: r.error || undefined,
    }));
  }

  /**
   * Check if item is downloaded
   */
  async isDownloaded(itemId: string): Promise<boolean> {
    return sqliteCache.isDownloaded(itemId);
  }

  /**
   * Get local file path for downloaded item
   */
  getLocalPath(itemId: string): string {
    return `${this.DOWNLOAD_DIR}${itemId}/`;
  }

  /**
   * Get total downloaded size
   */
  async getTotalDownloadedSize(): Promise<number> {
    const downloads = await sqliteCache.getDownloadsByStatus('complete');
    return downloads.reduce((sum, d) => sum + (d.fileSize || 0), 0);
  }

  // ===========================================================================
  // QUEUE PROCESSING
  // ===========================================================================

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    if (this.activeDownloads.size > 0) return; // Only one download at a time

    this.isProcessingQueue = true;

    try {
      const nextItemId = await sqliteCache.getNextDownload();
      if (!nextItemId) {
        return;
      }

      // Get the library item from cache
      const item = await sqliteCache.getLibraryItem(nextItemId);
      if (!item) {
        // Can't download without metadata
        await sqliteCache.removeFromDownloadQueue(nextItemId);
        await sqliteCache.failDownload(nextItemId, 'Item metadata not found');
        this.notifyListeners();
        return;
      }

      // Remove from queue before starting
      await sqliteCache.removeFromDownloadQueue(nextItemId);

      // Start download
      await this.startDownload(item);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async startDownload(item: LibraryItem): Promise<void> {
    const itemId = item.id;
    const destDir = this.getLocalPath(itemId);

    try {
      // Create item directory
      await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });

      // Update status to downloading
      await sqliteCache.updateDownloadProgress(itemId, 0);
      this.notifyListeners();

      // Get auth info for API calls
      const { serverUrl, token } = useAuthStore.getState();
      if (!serverUrl || !token) {
        throw new Error('Not authenticated');
      }

      // Get audio files to download
      const audioFiles = item.media?.audioFiles || [];
      if (audioFiles.length === 0) {
        throw new Error('No audio files found');
      }

      let totalSize = 0;
      let downloadedSize = 0;

      // Calculate total size
      for (const file of audioFiles) {
        totalSize += file.metadata?.size || 0;
      }

      // Download each audio file
      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        const fileUrl = `${serverUrl}/api/items/${itemId}/file/${file.ino}`;
        const destPath = `${destDir}${i.toString().padStart(3, '0')}_${file.ino}.m4a`;

        const download = FileSystem.createDownloadResumable(
          fileUrl,
          destPath,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
          (downloadProgress) => {
            const fileProgress = downloadProgress.totalBytesWritten;
            const overallProgress = totalSize > 0
              ? (downloadedSize + fileProgress) / totalSize
              : (i + fileProgress / (file.metadata?.size || 1)) / audioFiles.length;

            this.updateProgress(itemId, Math.min(overallProgress, 0.99));
          }
        );

        this.activeDownloads.set(itemId, download);
        const result = await download.downloadAsync();

        if (!result) {
          throw new Error('Download failed');
        }

        downloadedSize += file.metadata?.size || 0;
      }

      // Download cover image
      await this.downloadCover(item, destDir);

      // Mark complete
      this.activeDownloads.delete(itemId);
      await sqliteCache.completeDownload(itemId, destDir, totalSize);
      this.notifyListeners();

      console.log('[DownloadManager] Download complete:', itemId);

      // Process next item in queue
      this.processQueue();
    } catch (error) {
      this.activeDownloads.delete(itemId);
      const message = error instanceof Error ? error.message : 'Download failed';
      await sqliteCache.failDownload(itemId, message);
      this.notifyListeners();

      console.error('[DownloadManager] Download failed:', itemId, error);

      // Process next item in queue
      this.processQueue();
    }
  }

  private async updateProgress(itemId: string, progress: number): Promise<void> {
    await sqliteCache.updateDownloadProgress(itemId, progress);

    // Notify progress listeners
    for (const listener of this.progressListeners) {
      listener(itemId, progress);
    }
  }

  private async downloadCover(item: LibraryItem, destDir: string): Promise<void> {
    try {
      const { serverUrl, token } = useAuthStore.getState();
      if (!serverUrl || !token) return;

      const coverUrl = `${serverUrl}/api/items/${item.id}/cover`;
      const destPath = `${destDir}cover.jpg`;

      await FileSystem.downloadAsync(coverUrl, destPath, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Cover is optional, don't fail the download
    }
  }

  private async deleteFiles(itemId: string): Promise<void> {
    const path = this.getLocalPath(itemId);
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        await FileSystem.deleteAsync(path, { idempotent: true });
      }
    } catch (error) {
      console.warn('[DownloadManager] Failed to delete files:', itemId, error);
    }
  }

  private async resumePausedDownloads(): Promise<void> {
    const paused = await sqliteCache.getDownloadsByStatus('paused');
    for (const download of paused) {
      await sqliteCache.addToDownloadQueue(download.itemId, 5);
    }

    // Also re-queue any that were downloading when app closed
    const downloading = await sqliteCache.getDownloadsByStatus('downloading');
    for (const download of downloading) {
      await sqliteCache.setDownload({
        ...download,
        status: 'pending',
      });
      await sqliteCache.addToDownloadQueue(download.itemId, 10);
    }
  }

  // ===========================================================================
  // LISTENERS
  // ===========================================================================

  subscribe(listener: DownloadListener): () => void {
    this.listeners.add(listener);
    this.getAllDownloads().then(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeToProgress(listener: ProgressListener): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  private async notifyListeners(): Promise<void> {
    const downloads = await this.getAllDownloads();
    for (const listener of this.listeners) {
      listener(downloads);
    }
  }
}

// Singleton instance
export const downloadManager = new DownloadManager();
