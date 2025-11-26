/**
 * src/features/player/services/progressService.ts
 *
 * Service for syncing playback progress to the AudiobookShelf server.
 * Auto-saves position locally and syncs to server periodically.
 */

import { apiClient } from '@/core/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ProgressData {
  itemId: string;
  currentTime: number;
  duration: number;
  progress: number;
  isFinished: boolean;
}

const PROGRESS_KEY_PREFIX = 'progress_';

class ProgressService {
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime: number = 0;
  private pendingSync: ProgressData | null = null;

  startAutoSync(): void {
    if (this.syncInterval) {
      return;
    }

    this.syncInterval = setInterval(() => {
      this.syncPendingProgress();
    }, 5 * 60 * 1000);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async saveProgress(data: ProgressData): Promise<void> {
    try {
      await this.saveProgressLocal(data);
      this.pendingSync = data;

      const now = Date.now();
      if (now - this.lastSyncTime > 30 * 1000) {
        await this.syncPendingProgress();
      }
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }

  async syncOnPause(data: ProgressData): Promise<void> {
    try {
      await this.saveProgressLocal(data);
      await this.syncToServer(data);
    } catch (error) {
      console.error('Failed to sync progress on pause:', error);
    }
  }

  async saveLocalOnly(data: ProgressData): Promise<void> {
    try {
      await this.saveProgressLocal(data);
    } catch (error) {
      console.error('Failed to save local progress:', error);
    }
  }

  async markAsFinished(itemId: string, duration: number): Promise<void> {
    const data: ProgressData = {
      itemId,
      currentTime: duration,
      duration,
      progress: 1.0,
      isFinished: true,
    };

    try {
      await this.saveProgressLocal(data);
      await this.syncToServer(data);
    } catch (error) {
      console.error('Failed to mark as finished:', error);
      throw error;
    }
  }

  async getLocalProgress(itemId: string): Promise<number> {
    try {
      const key = PROGRESS_KEY_PREFIX + itemId;
      const value = await AsyncStorage.getItem(key);

      if (!value) {
        return 0;
      }

      // Try parsing as JSON first (current format)
      try {
        const parsed = JSON.parse(value);
        
        // Check if it's our ProgressData object
        if (typeof parsed === 'object' && parsed !== null && 'currentTime' in parsed) {
          const currentTime = parsed.currentTime;
          return typeof currentTime === 'number' && !isNaN(currentTime) ? currentTime : 0;
        }
        
        // Parsed but not our expected format - might be a plain number
        if (typeof parsed === 'number' && !isNaN(parsed)) {
          return parsed;
        }
      } catch {
        // JSON parse failed, try as plain number string (legacy format)
        const num = parseFloat(value);
        if (!isNaN(num)) {
          return num;
        }
      }

      return 0;
    } catch (error) {
      console.error('Failed to get local progress:', error);
      return 0;
    }
  }

  async getFullProgressData(itemId: string): Promise<ProgressData | null> {
    try {
      const key = PROGRESS_KEY_PREFIX + itemId;
      const value = await AsyncStorage.getItem(key);

      if (!value) {
        return null;
      }

      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null && 'currentTime' in parsed) {
        return parsed as ProgressData;
      }

      return null;
    } catch {
      return null;
    }
  }

  async clearLocalProgress(itemId: string): Promise<void> {
    try {
      const key = PROGRESS_KEY_PREFIX + itemId;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear local progress:', error);
    }
  }

  private async saveProgressLocal(data: ProgressData): Promise<void> {
    try {
      const key = PROGRESS_KEY_PREFIX + data.itemId;
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save progress locally:', error);
      throw error;
    }
  }

  private async syncPendingProgress(): Promise<void> {
    if (!this.pendingSync) {
      return;
    }

    const data = this.pendingSync;
    this.pendingSync = null;

    await this.syncToServer(data);
  }

  private async syncToServer(data: ProgressData): Promise<void> {
    try {
      await apiClient.updateProgress(data.itemId, {
        currentTime: data.currentTime,
        duration: data.duration,
        progress: data.progress,
        isFinished: data.isFinished,
      });

      this.lastSyncTime = Date.now();
    } catch (error) {
      console.error('Failed to sync progress to server:', error);
    }
  }
}

export const progressService = new ProgressService();