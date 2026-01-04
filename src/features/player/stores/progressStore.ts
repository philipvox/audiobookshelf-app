/**
 * src/features/player/stores/progressStore.ts
 *
 * Progress tracking store for audiobook playback.
 * Manages per-book progress data and sync state.
 *
 * Contains:
 * - Per-book progress (position, duration, last played)
 * - Progress sync queue
 * - Last played book tracking
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// Types
// =============================================================================

export interface BookProgress {
  bookId: string;
  position: number; // Current position in seconds
  duration: number; // Total duration in seconds
  lastPlayed: number; // Timestamp of last playback
  isComplete: boolean; // Whether book is considered complete
  currentTrackIndex: number; // Current track for multi-file books
}

export interface SyncQueueItem {
  bookId: string;
  position: number;
  duration: number;
  timestamp: number;
  retryCount: number;
}

export interface ProgressState {
  // Per-book progress data
  progressMap: Record<string, BookProgress>;

  // Sync queue for offline progress updates
  syncQueue: SyncQueueItem[];

  // Last played book ID
  lastPlayedBookId: string | null;

  // Sync state
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncError: string | null;
}

export interface ProgressActions {
  // Progress management
  updateProgress: (
    bookId: string,
    position: number,
    duration: number,
    trackIndex?: number
  ) => void;
  getProgress: (bookId: string) => BookProgress | null;
  markComplete: (bookId: string) => void;
  clearProgress: (bookId: string) => void;

  // Last played
  setLastPlayedBook: (bookId: string) => void;
  getLastPlayedBook: () => BookProgress | null;

  // Sync queue
  addToSyncQueue: (bookId: string, position: number, duration: number) => void;
  removeFromSyncQueue: (bookId: string) => void;
  clearSyncQueue: () => void;
  getSyncQueue: () => SyncQueueItem[];

  // Sync state
  setSyncing: (isSyncing: boolean) => void;
  setSyncError: (error: string | null) => void;
  markSyncComplete: () => void;

  // Bulk operations
  importProgress: (progressMap: Record<string, BookProgress>) => void;
  exportProgress: () => Record<string, BookProgress>;
  clearAllProgress: () => void;
}

export type ProgressStore = ProgressState & ProgressActions;

// =============================================================================
// Constants
// =============================================================================

// Threshold for considering a book complete (95%)
// Matches FINISHED_THRESHOLD from useReadingHistory for consistency
export const COMPLETION_THRESHOLD = 0.95;

// Maximum sync queue size
export const MAX_SYNC_QUEUE_SIZE = 100;

// Maximum retry count for sync items
export const MAX_SYNC_RETRIES = 5;

// =============================================================================
// Default State
// =============================================================================

const defaultState: ProgressState = {
  progressMap: {},
  syncQueue: [],
  lastPlayedBookId: null,
  isSyncing: false,
  lastSyncTime: null,
  syncError: null,
};

// =============================================================================
// Helper Functions
// =============================================================================

function calculateIsComplete(position: number, duration: number): boolean {
  if (duration <= 0) return false;
  return position / duration >= COMPLETION_THRESHOLD;
}

// =============================================================================
// Store
// =============================================================================

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...defaultState,

      // Progress management
      updateProgress: (
        bookId: string,
        position: number,
        duration: number,
        trackIndex: number = 0
      ) => {
        const now = Date.now();
        const isComplete = calculateIsComplete(position, duration);

        set((state) => ({
          progressMap: {
            ...state.progressMap,
            [bookId]: {
              bookId,
              position,
              duration,
              lastPlayed: now,
              isComplete,
              currentTrackIndex: trackIndex,
            },
          },
          lastPlayedBookId: bookId,
        }));
      },

      getProgress: (bookId: string): BookProgress | null => {
        return get().progressMap[bookId] ?? null;
      },

      markComplete: (bookId: string) => {
        const existing = get().progressMap[bookId];
        if (!existing) return;

        set((state) => ({
          progressMap: {
            ...state.progressMap,
            [bookId]: {
              ...existing,
              isComplete: true,
              position: existing.duration, // Set position to end
            },
          },
        }));
      },

      clearProgress: (bookId: string) => {
        set((state) => {
          const { [bookId]: _, ...rest } = state.progressMap;
          return {
            progressMap: rest,
            lastPlayedBookId:
              state.lastPlayedBookId === bookId ? null : state.lastPlayedBookId,
          };
        });
      },

      // Last played
      setLastPlayedBook: (bookId: string) => {
        set({ lastPlayedBookId: bookId });
      },

      getLastPlayedBook: (): BookProgress | null => {
        const { lastPlayedBookId, progressMap } = get();
        if (!lastPlayedBookId) return null;
        return progressMap[lastPlayedBookId] ?? null;
      },

      // Sync queue
      addToSyncQueue: (bookId: string, position: number, duration: number) => {
        const now = Date.now();

        set((state) => {
          // Remove any existing entry for this book
          const filteredQueue = state.syncQueue.filter(
            (item) => item.bookId !== bookId
          );

          // Add new entry
          const newQueue = [
            ...filteredQueue,
            {
              bookId,
              position,
              duration,
              timestamp: now,
              retryCount: 0,
            },
          ];

          // Limit queue size
          const limitedQueue = newQueue.slice(-MAX_SYNC_QUEUE_SIZE);

          return { syncQueue: limitedQueue };
        });
      },

      removeFromSyncQueue: (bookId: string) => {
        set((state) => ({
          syncQueue: state.syncQueue.filter((item) => item.bookId !== bookId),
        }));
      },

      clearSyncQueue: () => {
        set({ syncQueue: [] });
      },

      getSyncQueue: (): SyncQueueItem[] => {
        return get().syncQueue;
      },

      // Sync state
      setSyncing: (isSyncing: boolean) => {
        set({ isSyncing });
      },

      setSyncError: (error: string | null) => {
        set({ syncError: error });
      },

      markSyncComplete: () => {
        set({
          isSyncing: false,
          lastSyncTime: Date.now(),
          syncError: null,
        });
      },

      // Bulk operations
      importProgress: (progressMap: Record<string, BookProgress>) => {
        set((state) => ({
          progressMap: {
            ...state.progressMap,
            ...progressMap,
          },
        }));
      },

      exportProgress: (): Record<string, BookProgress> => {
        return get().progressMap;
      },

      clearAllProgress: () => {
        set({
          progressMap: {},
          syncQueue: [],
          lastPlayedBookId: null,
          lastSyncTime: null,
          syncError: null,
        });
      },
    }),
    {
      name: 'player-progress',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        progressMap: state.progressMap,
        syncQueue: state.syncQueue,
        lastPlayedBookId: state.lastPlayedBookId,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);

// =============================================================================
// Selectors
// =============================================================================

export const selectProgress = (bookId: string) => (state: ProgressStore) =>
  state.progressMap[bookId] ?? null;

export const selectLastPlayedBook = (state: ProgressStore) => {
  const { lastPlayedBookId, progressMap } = state;
  if (!lastPlayedBookId) return null;
  return progressMap[lastPlayedBookId] ?? null;
};

export const selectSyncQueueSize = (state: ProgressStore) =>
  state.syncQueue.length;

export const selectHasPendingSync = (state: ProgressStore) =>
  state.syncQueue.length > 0;

// =============================================================================
// Hooks for common patterns
// =============================================================================

/**
 * Get progress for a specific book.
 */
export function useBookProgress(bookId: string | null): BookProgress | null {
  return useProgressStore((state) =>
    bookId ? state.progressMap[bookId] ?? null : null
  );
}

/**
 * Get whether a book is complete.
 */
export function useIsBookComplete(bookId: string | null): boolean {
  return useProgressStore((state) =>
    bookId ? state.progressMap[bookId]?.isComplete ?? false : false
  );
}

/**
 * Get sync queue size.
 */
export function useSyncQueueSize(): number {
  return useProgressStore((state) => state.syncQueue.length);
}

/**
 * Get sync state.
 */
export function useIsSyncing(): boolean {
  return useProgressStore((state) => state.isSyncing);
}
