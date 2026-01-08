/**
 * src/core/hooks/useDownloads.ts
 *
 * Hooks for managing downloads and tracking download status.
 */

import { useState, useEffect, useCallback } from 'react';
import { downloadManager, DownloadTask } from '@/core/services/downloadManager';
import { LibraryItem } from '@/core/types';

/**
 * Get all downloads with live updates
 */
export function useDownloads() {
  const [downloads, setDownloads] = useState<DownloadTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = downloadManager.subscribe((tasks) => {
      setDownloads(tasks);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const queueDownload = useCallback(async (item: LibraryItem, priority = 0) => {
    await downloadManager.queueDownload(item, priority);
  }, []);

  const cancelDownload = useCallback(async (itemId: string) => {
    await downloadManager.cancelDownload(itemId);
  }, []);

  const pauseDownload = useCallback(async (itemId: string) => {
    await downloadManager.pauseDownload(itemId);
  }, []);

  const resumeDownload = useCallback(async (itemId: string) => {
    await downloadManager.resumeDownload(itemId);
  }, []);

  const deleteDownload = useCallback(async (itemId: string) => {
    await downloadManager.deleteDownload(itemId);
  }, []);

  return {
    downloads,
    isLoading,
    queueDownload,
    cancelDownload,
    pauseDownload,
    resumeDownload,
    deleteDownload,
    completedCount: downloads.filter((d) => d.status === 'complete').length,
    pendingCount: downloads.filter((d) => d.status === 'pending').length,
    downloadingCount: downloads.filter((d) => d.status === 'downloading').length,
  };
}

/**
 * Get download status for a specific item
 */
export function useDownloadStatus(itemId: string) {
  const [status, setStatus] = useState<DownloadTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);

    // Get initial status
    downloadManager.getDownloadStatus(itemId).then((s) => {
      setStatus(s);
      setIsLoading(false);
    });

    // Subscribe to updates
    const unsubscribe = downloadManager.subscribe((tasks) => {
      const task = tasks.find((t) => t.itemId === itemId);
      setStatus(task || null);
    });

    return unsubscribe;
  }, [itemId]);

  return {
    status,
    isLoading,
    isDownloaded: status?.status === 'complete',
    isDownloading: status?.status === 'downloading',
    isPending: status?.status === 'pending',
    isPaused: status?.status === 'paused',
    hasError: status?.status === 'error',
    progress: status?.progress || 0,
    bytesDownloaded: status?.bytesDownloaded || 0,
    totalBytes: status?.totalBytes || 0,
    error: status?.error,
  };
}

/**
 * Get download progress with throttled updates
 */
export function useDownloadProgress(itemId: string) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Get initial progress
    downloadManager.getDownloadStatus(itemId).then((status) => {
      if (status) {
        setProgress(status.progress);
      }
    });

    // Subscribe to progress updates
    const unsubscribe = downloadManager.subscribeToProgress((id, p) => {
      if (id === itemId) {
        setProgress(p);
      }
    });

    return unsubscribe;
  }, [itemId]);

  return progress;
}

/**
 * Check if item is available offline
 */
export function useIsOfflineAvailable(itemId: string) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    downloadManager.isDownloaded(itemId).then((downloaded) => {
      setIsAvailable(downloaded);
      setIsLoading(false);
    });

    // Subscribe to updates
    const unsubscribe = downloadManager.subscribe((tasks) => {
      const task = tasks.find((t) => t.itemId === itemId);
      setIsAvailable(task?.status === 'complete');
    });

    return unsubscribe;
  }, [itemId]);

  return { isAvailable, isLoading };
}
