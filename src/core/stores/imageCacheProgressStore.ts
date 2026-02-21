/**
 * src/core/stores/imageCacheProgressStore.ts
 *
 * Global store for image cache progress.
 * Used to show progress bar across all screens when caching runs in background.
 */

import { create } from 'zustand';
import { CacheProgress } from '@/core/services/imageCacheService';

interface ImageCacheProgressState {
  // Progress state
  isActive: boolean;
  isBackground: boolean;
  progress: CacheProgress | null;
  startTime: number | null;

  // Speed tracking
  speedBytesPerSecond: number;
  estimatedSecondsRemaining: number | null;

  // Actions
  startCaching: () => void;
  updateProgress: (progress: CacheProgress) => void;
  setBackground: (isBackground: boolean) => void;
  complete: () => void;
  reset: () => void;
}

export const useImageCacheProgressStore = create<ImageCacheProgressState>((set, get) => ({
  isActive: false,
  isBackground: false,
  progress: null,
  startTime: null,
  speedBytesPerSecond: 0,
  estimatedSecondsRemaining: null,

  startCaching: () => {
    set({
      isActive: true,
      isBackground: false,
      progress: null,
      startTime: Date.now(),
      speedBytesPerSecond: 0,
      estimatedSecondsRemaining: null,
    });
  },

  updateProgress: (progress: CacheProgress) => {
    const { startTime } = get();
    const now = Date.now();
    const elapsedSeconds = startTime ? (now - startTime) / 1000 : 0;

    // Calculate speed
    const speedBytesPerSecond = elapsedSeconds > 0
      ? progress.bytesDownloaded / elapsedSeconds
      : 0;

    // Estimate remaining time
    // Estimate total bytes based on progress percentage
    const estimatedTotalBytes = progress.percentComplete > 0
      ? (progress.bytesDownloaded / progress.percentComplete) * 100
      : 0;
    const remainingBytes = estimatedTotalBytes - progress.bytesDownloaded;
    const estimatedSecondsRemaining = speedBytesPerSecond > 0
      ? remainingBytes / speedBytesPerSecond
      : null;

    set({
      progress,
      speedBytesPerSecond,
      estimatedSecondsRemaining,
    });
  },

  setBackground: (isBackground: boolean) => {
    set({ isBackground });
  },

  complete: () => {
    set({
      isActive: false,
      isBackground: false,
    });
  },

  reset: () => {
    set({
      isActive: false,
      isBackground: false,
      progress: null,
      startTime: null,
      speedBytesPerSecond: 0,
      estimatedSecondsRemaining: null,
    });
  },
}));

// Helper to format speed
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '-- MB/s';
  const mbps = bytesPerSecond / (1024 * 1024);
  if (mbps >= 1) {
    return `${mbps.toFixed(1)} MB/s`;
  }
  const kbps = bytesPerSecond / 1024;
  return `${kbps.toFixed(0)} KB/s`;
}

// Helper to format time remaining
export function formatTimeRemaining(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '--';

  if (seconds < 60) {
    return `${Math.ceil(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.ceil(seconds % 60);

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
