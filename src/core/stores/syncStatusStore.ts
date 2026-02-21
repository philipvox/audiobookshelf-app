/**
 * src/core/stores/syncStatusStore.ts
 *
 * Reactive sync status store for UI components.
 * P3 Fix - Provides visibility into sync state and manual retry capability.
 */

import { create } from 'zustand';
import { sqliteCache } from '@/core/services/sqliteCache';
import { syncQueue } from '@/core/services/syncQueue';
import { backgroundSyncService } from '@/features/player/services/backgroundSyncService';
import { eventBus } from '@/core/events';
import { networkMonitor } from '@/core/services/networkMonitor';

interface SyncStatusState {
  /** Number of items pending sync */
  pendingCount: number;
  /** Last successful sync timestamp */
  lastSyncedAt: number | null;
  /** Whether a sync is currently in progress */
  isSyncing: boolean;
  /** Whether the device is online */
  isOnline: boolean;
  /** Last error message if sync failed */
  lastError: string | null;

  // Actions
  /** Refresh sync status from storage */
  refreshStatus: () => Promise<void>;
  /** Trigger manual retry of all pending syncs */
  retrySync: () => Promise<void>;
  /** Mark sync as started */
  setSyncing: (syncing: boolean) => void;
  /** Record a sync error */
  setError: (error: string | null) => void;
  /** Update online status */
  setOnline: (online: boolean) => void;
}

export const useSyncStatusStore = create<SyncStatusState>((set, get) => ({
  pendingCount: 0,
  lastSyncedAt: null,
  isSyncing: false,
  isOnline: true,
  lastError: null,

  refreshStatus: async () => {
    try {
      // Get pending items from sync queue
      const queuePending = await syncQueue.getPendingCount();

      // Get unsynced progress from SQLite
      const unsyncedProgress = await sqliteCache.getUnsyncedProgress();

      // Get background sync status
      const bgStatus = backgroundSyncService.getStatus();

      // Total pending = queue + SQLite unsynced (deduplicated by taking max)
      const pendingCount = Math.max(queuePending, unsyncedProgress.length, bgStatus.queueSize);

      set({
        pendingCount,
        isOnline: networkMonitor.isConnected(),
      });
    } catch (error) {
      console.error('[SyncStatus] Failed to refresh status:', error);
    }
  },

  retrySync: async () => {
    const state = get();
    if (state.isSyncing) return;

    set({ isSyncing: true, lastError: null });

    try {
      // Process sync queue
      await syncQueue.processQueue();

      // Also sync unsynced from SQLite via background service
      await backgroundSyncService.syncUnsyncedFromStorage();

      // Force sync if needed
      await backgroundSyncService.forceSyncAll();

      set({
        lastSyncedAt: Date.now(),
        isSyncing: false,
      });

      // Refresh status after sync
      await get().refreshStatus();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      set({
        isSyncing: false,
        lastError: errorMessage,
      });
    }
  },

  setSyncing: (syncing) => set({ isSyncing: syncing }),

  setError: (error) => set({ lastError: error }),

  setOnline: (online) => set({ isOnline: online }),
}));

/**
 * Initialize sync status event listeners
 * Call this once at app startup
 */
export function initSyncStatusListeners(): () => void {
  const store = useSyncStatusStore.getState();

  // Initial status refresh
  store.refreshStatus();

  // Listen for sync success events - eventBus.on returns unsubscribe function
  const unsubSynced = eventBus.on('progress:synced', () => {
    useSyncStatusStore.setState({
      lastSyncedAt: Date.now(),
      lastError: null,
    });
    store.refreshStatus();
  });

  // Listen for sync failure events
  const unsubFailed = eventBus.on('progress:sync_failed', (data) => {
    useSyncStatusStore.setState({
      lastError: data.error,
    });
    store.refreshStatus();
  });

  // Listen for network changes - subscribe takes NetworkState
  const unsubNetwork = networkMonitor.subscribe((state) => {
    const connected = state.isConnected;
    useSyncStatusStore.setState({ isOnline: connected });
    if (connected) {
      // Auto-refresh and try sync when coming back online
      store.refreshStatus();
    }
  });

  // Periodic refresh (every 30 seconds)
  const intervalId = setInterval(() => {
    store.refreshStatus();
  }, 30000);

  // Return cleanup function
  return () => {
    unsubSynced();
    unsubFailed();
    unsubNetwork();
    clearInterval(intervalId);
  };
}

// Selectors
export const usePendingSyncCount = () => useSyncStatusStore((s) => s.pendingCount);
export const useIsSyncing = () => useSyncStatusStore((s) => s.isSyncing);
export const useHasSyncErrors = () => useSyncStatusStore((s) => s.lastError !== null);
export const useSyncStatus = () => useSyncStatusStore((s) => ({
  pendingCount: s.pendingCount,
  isSyncing: s.isSyncing,
  isOnline: s.isOnline,
  lastError: s.lastError,
  lastSyncedAt: s.lastSyncedAt,
}));
