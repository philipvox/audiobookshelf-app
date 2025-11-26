/**
 * src/features/downloads/services/downloadService.ts
 */

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LibraryItem } from '@/core/types';

const DOWNLOADS_DIR = `${FileSystem.documentDirectory}downloads/`;
const DOWNLOADS_METADATA_KEY = 'downloads_metadata';

export interface DownloadedBook {
  id: string;
  libraryItemId: string;
  title: string;
  author: string;
  coverPath?: string;
  localAudioPath: string;
  localCoverPath?: string;
  totalSize: number;
  downloadedAt: number;
  duration: number;
}

export interface DownloadProgress {
  libraryItemId: string;
  progress: number;
  bytesWritten: number;
  totalBytes: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';
  error?: string;
}

type ProgressCallback = (progress: DownloadProgress) => void;

class DownloadService {
  private activeDownloads: Map<string, FileSystem.DownloadResumable> = new Map();
  private progressCallbacks: Map<string, ProgressCallback> = new Map();

  constructor() {
    this.ensureDownloadsDirectory();
  }

  private async ensureDownloadsDirectory(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
    }
  }

  async getDownloadedBooks(): Promise<DownloadedBook[]> {
    try {
      const data = await AsyncStorage.getItem(DOWNLOADS_METADATA_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private async saveDownloadedBooks(books: DownloadedBook[]): Promise<void> {
    await AsyncStorage.setItem(DOWNLOADS_METADATA_KEY, JSON.stringify(books));
  }

  async isDownloaded(libraryItemId: string): Promise<boolean> {
    const books = await this.getDownloadedBooks();
    return books.some((b) => b.libraryItemId === libraryItemId);
  }

  async getDownloadedBook(libraryItemId: string): Promise<DownloadedBook | null> {
    const books = await this.getDownloadedBooks();
    return books.find((b) => b.libraryItemId === libraryItemId) || null;
  }

  async downloadBook(
    item: LibraryItem,
    serverUrl: string,
    token: string,
    onProgress?: ProgressCallback
  ): Promise<DownloadedBook> {
    const libraryItemId = item.id;

    if (await this.isDownloaded(libraryItemId)) {
      throw new Error('Book already downloaded');
    }

    if (this.activeDownloads.has(libraryItemId)) {
      throw new Error('Download already in progress');
    }

    const bookDir = `${DOWNLOADS_DIR}${libraryItemId}/`;
    await FileSystem.makeDirectoryAsync(bookDir, { intermediates: true });

    if (onProgress) {
      this.progressCallbacks.set(libraryItemId, onProgress);
    }

    onProgress?.({
      libraryItemId,
      progress: 0,
      bytesWritten: 0,
      totalBytes: 0,
      status: 'pending',
    });

    try {
      const audioFile = item.media?.audioFiles?.[0];
      if (!audioFile) {
        throw new Error('No audio file found');
      }

      const audioUrl = `${serverUrl}/api/items/${libraryItemId}/file/${audioFile.ino}?token=${token}`;
      const localAudioPath = `${bookDir}audio${this.getExtension(audioFile.metadata?.filename || '.m4b')}`;

      const downloadResumable = FileSystem.createDownloadResumable(
        audioUrl,
        localAudioPath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          onProgress?.({
            libraryItemId,
            progress,
            bytesWritten: downloadProgress.totalBytesWritten,
            totalBytes: downloadProgress.totalBytesExpectedToWrite,
            status: 'downloading',
          });
        }
      );

      this.activeDownloads.set(libraryItemId, downloadResumable);

      const result = await downloadResumable.downloadAsync();
      if (!result?.uri) {
        throw new Error('Download failed');
      }

      let localCoverPath: string | undefined;
      if (item.media?.coverPath) {
        try {
          const coverUrl = `${serverUrl}/api/items/${libraryItemId}/cover?token=${token}`;
          localCoverPath = `${bookDir}cover.jpg`;
          await FileSystem.downloadAsync(coverUrl, localCoverPath);
        } catch {
          // Cover download is optional
        }
      }

      const fileInfo = await FileSystem.getInfoAsync(localAudioPath);
      const totalSize = (fileInfo as { size?: number }).size || 0;

      const downloadedBook: DownloadedBook = {
        id: `download_${libraryItemId}`,
        libraryItemId,
        title: item.media?.metadata?.title || 'Unknown',
        author: item.media?.metadata?.authorName || 'Unknown',
        coverPath: item.media?.coverPath,
        localAudioPath,
        localCoverPath,
        totalSize,
        downloadedAt: Date.now(),
        duration: item.media?.duration || 0,
      };

      const books = await this.getDownloadedBooks();
      books.push(downloadedBook);
      await this.saveDownloadedBooks(books);

      onProgress?.({
        libraryItemId,
        progress: 1,
        bytesWritten: totalSize,
        totalBytes: totalSize,
        status: 'completed',
      });

      this.activeDownloads.delete(libraryItemId);
      this.progressCallbacks.delete(libraryItemId);

      return downloadedBook;
    } catch (error) {
      this.activeDownloads.delete(libraryItemId);
      this.progressCallbacks.delete(libraryItemId);

      try {
        await FileSystem.deleteAsync(bookDir, { idempotent: true });
      } catch {}

      onProgress?.({
        libraryItemId,
        progress: 0,
        bytesWritten: 0,
        totalBytes: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Download failed',
      });

      throw error;
    }
  }

  private getExtension(filename: string): string {
    const ext = filename.split('.').pop();
    return ext ? `.${ext}` : '.m4b';
  }

  async cancelDownload(libraryItemId: string): Promise<void> {
    const download = this.activeDownloads.get(libraryItemId);
    if (download) {
      await download.cancelAsync();
      this.activeDownloads.delete(libraryItemId);
      this.progressCallbacks.delete(libraryItemId);

      const bookDir = `${DOWNLOADS_DIR}${libraryItemId}/`;
      try {
        await FileSystem.deleteAsync(bookDir, { idempotent: true });
      } catch {}
    }
  }

  async deleteDownload(libraryItemId: string): Promise<void> {
    await this.cancelDownload(libraryItemId);

    const bookDir = `${DOWNLOADS_DIR}${libraryItemId}/`;
    try {
      await FileSystem.deleteAsync(bookDir, { idempotent: true });
    } catch {}

    const books = await this.getDownloadedBooks();
    const filtered = books.filter((b) => b.libraryItemId !== libraryItemId);
    await this.saveDownloadedBooks(filtered);
  }

  async getTotalStorageUsed(): Promise<number> {
    const books = await this.getDownloadedBooks();
    return books.reduce((sum, book) => sum + book.totalSize, 0);
  }

  async clearAllDownloads(): Promise<void> {
    for (const [, download] of this.activeDownloads) {
      await download.cancelAsync();
    }
    this.activeDownloads.clear();
    this.progressCallbacks.clear();

    const dirInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(DOWNLOADS_DIR, { idempotent: true });
      await this.ensureDownloadsDirectory();
    }

    await this.saveDownloadedBooks([]);
  }

  isDownloading(libraryItemId: string): boolean {
    return this.activeDownloads.has(libraryItemId);
  }
}

export const downloadService = new DownloadService();