/**
 * Tests for ProgressStore
 */

import {
  useProgressStore,
  COMPLETION_THRESHOLD,
  MAX_SYNC_QUEUE_SIZE,
} from '../progressStore';

describe('ProgressStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useProgressStore.getState().clearAllProgress();
  });

  describe('Initial State', () => {
    it('has correct default values', () => {
      const state = useProgressStore.getState();

      expect(state.progressMap).toEqual({});
      expect(state.syncQueue).toEqual([]);
      expect(state.lastPlayedBookId).toBeNull();
      expect(state.isSyncing).toBe(false);
      expect(state.lastSyncTime).toBeNull();
      expect(state.syncError).toBeNull();
    });
  });

  describe('Progress Management', () => {
    it('updates progress for a book', () => {
      useProgressStore.getState().updateProgress('book-1', 500, 3600, 0);

      const progress = useProgressStore.getState().getProgress('book-1');
      expect(progress).not.toBeNull();
      expect(progress?.position).toBe(500);
      expect(progress?.duration).toBe(3600);
      expect(progress?.currentTrackIndex).toBe(0);
      expect(progress?.isComplete).toBe(false);
    });

    it('sets lastPlayedBookId when updating progress', () => {
      useProgressStore.getState().updateProgress('book-1', 100, 3600);

      expect(useProgressStore.getState().lastPlayedBookId).toBe('book-1');
    });

    it('calculates isComplete based on threshold', () => {
      // Not complete at 90%
      useProgressStore.getState().updateProgress('book-1', 3240, 3600);
      expect(useProgressStore.getState().getProgress('book-1')?.isComplete).toBe(false);

      // Complete at 99%+
      useProgressStore.getState().updateProgress('book-2', 3564, 3600);
      expect(useProgressStore.getState().getProgress('book-2')?.isComplete).toBe(true);
    });

    it('returns null for non-existent book', () => {
      expect(useProgressStore.getState().getProgress('non-existent')).toBeNull();
    });

    it('marks book as complete', () => {
      useProgressStore.getState().updateProgress('book-1', 1800, 3600);
      useProgressStore.getState().markComplete('book-1');

      const progress = useProgressStore.getState().getProgress('book-1');
      expect(progress?.isComplete).toBe(true);
      expect(progress?.position).toBe(3600); // Position set to end
    });

    it('ignores markComplete for non-existent book', () => {
      useProgressStore.getState().markComplete('non-existent');
      expect(useProgressStore.getState().progressMap).toEqual({});
    });

    it('clears progress for a book', () => {
      useProgressStore.getState().updateProgress('book-1', 500, 3600);
      useProgressStore.getState().updateProgress('book-2', 1000, 7200);
      useProgressStore.getState().clearProgress('book-1');

      expect(useProgressStore.getState().getProgress('book-1')).toBeNull();
      expect(useProgressStore.getState().getProgress('book-2')).not.toBeNull();
    });

    it('clears lastPlayedBookId when clearing that book', () => {
      useProgressStore.getState().updateProgress('book-1', 500, 3600);
      useProgressStore.getState().clearProgress('book-1');

      expect(useProgressStore.getState().lastPlayedBookId).toBeNull();
    });

    it('preserves lastPlayedBookId when clearing different book', () => {
      useProgressStore.getState().updateProgress('book-1', 500, 3600);
      useProgressStore.getState().updateProgress('book-2', 1000, 7200);
      useProgressStore.getState().clearProgress('book-1');

      expect(useProgressStore.getState().lastPlayedBookId).toBe('book-2');
    });
  });

  describe('Last Played Book', () => {
    it('sets last played book', () => {
      useProgressStore.getState().setLastPlayedBook('book-1');
      expect(useProgressStore.getState().lastPlayedBookId).toBe('book-1');
    });

    it('gets last played book progress', () => {
      useProgressStore.getState().updateProgress('book-1', 500, 3600);

      const lastPlayed = useProgressStore.getState().getLastPlayedBook();
      expect(lastPlayed).not.toBeNull();
      expect(lastPlayed?.bookId).toBe('book-1');
    });

    it('returns null when no last played book', () => {
      expect(useProgressStore.getState().getLastPlayedBook()).toBeNull();
    });

    it('returns null when last played book has no progress', () => {
      useProgressStore.getState().setLastPlayedBook('book-1');
      expect(useProgressStore.getState().getLastPlayedBook()).toBeNull();
    });
  });

  describe('Sync Queue', () => {
    it('adds item to sync queue', () => {
      useProgressStore.getState().addToSyncQueue('book-1', 500, 3600);

      const queue = useProgressStore.getState().getSyncQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].bookId).toBe('book-1');
      expect(queue[0].position).toBe(500);
      expect(queue[0].retryCount).toBe(0);
    });

    it('replaces existing queue entry for same book', () => {
      useProgressStore.getState().addToSyncQueue('book-1', 500, 3600);
      useProgressStore.getState().addToSyncQueue('book-1', 1000, 3600);

      const queue = useProgressStore.getState().getSyncQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].position).toBe(1000);
    });

    it('keeps multiple books in queue', () => {
      useProgressStore.getState().addToSyncQueue('book-1', 500, 3600);
      useProgressStore.getState().addToSyncQueue('book-2', 1000, 7200);

      const queue = useProgressStore.getState().getSyncQueue();
      expect(queue.length).toBe(2);
    });

    it('removes item from sync queue', () => {
      useProgressStore.getState().addToSyncQueue('book-1', 500, 3600);
      useProgressStore.getState().addToSyncQueue('book-2', 1000, 7200);
      useProgressStore.getState().removeFromSyncQueue('book-1');

      const queue = useProgressStore.getState().getSyncQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].bookId).toBe('book-2');
    });

    it('clears sync queue', () => {
      useProgressStore.getState().addToSyncQueue('book-1', 500, 3600);
      useProgressStore.getState().addToSyncQueue('book-2', 1000, 7200);
      useProgressStore.getState().clearSyncQueue();

      expect(useProgressStore.getState().getSyncQueue().length).toBe(0);
    });

    it('limits queue size', () => {
      // Add more than MAX_SYNC_QUEUE_SIZE items
      for (let i = 0; i < MAX_SYNC_QUEUE_SIZE + 10; i++) {
        useProgressStore.getState().addToSyncQueue(`book-${i}`, i * 100, 3600);
      }

      const queue = useProgressStore.getState().getSyncQueue();
      expect(queue.length).toBe(MAX_SYNC_QUEUE_SIZE);
      // Should keep the most recent items
      expect(queue[queue.length - 1].bookId).toBe(`book-${MAX_SYNC_QUEUE_SIZE + 9}`);
    });
  });

  describe('Sync State', () => {
    it('sets syncing state', () => {
      useProgressStore.getState().setSyncing(true);
      expect(useProgressStore.getState().isSyncing).toBe(true);

      useProgressStore.getState().setSyncing(false);
      expect(useProgressStore.getState().isSyncing).toBe(false);
    });

    it('sets sync error', () => {
      useProgressStore.getState().setSyncError('Network error');
      expect(useProgressStore.getState().syncError).toBe('Network error');

      useProgressStore.getState().setSyncError(null);
      expect(useProgressStore.getState().syncError).toBeNull();
    });

    it('marks sync complete', () => {
      useProgressStore.getState().setSyncing(true);
      useProgressStore.getState().setSyncError('Previous error');

      const before = Date.now();
      useProgressStore.getState().markSyncComplete();
      const after = Date.now();

      const state = useProgressStore.getState();
      expect(state.isSyncing).toBe(false);
      expect(state.syncError).toBeNull();
      expect(state.lastSyncTime).toBeGreaterThanOrEqual(before);
      expect(state.lastSyncTime).toBeLessThanOrEqual(after);
    });
  });

  describe('Bulk Operations', () => {
    it('imports progress', () => {
      const importData = {
        'book-1': {
          bookId: 'book-1',
          position: 500,
          duration: 3600,
          lastPlayed: Date.now(),
          isComplete: false,
          currentTrackIndex: 0,
        },
        'book-2': {
          bookId: 'book-2',
          position: 3564,
          duration: 3600,
          lastPlayed: Date.now(),
          isComplete: true,
          currentTrackIndex: 2,
        },
      };

      useProgressStore.getState().importProgress(importData);

      expect(useProgressStore.getState().getProgress('book-1')).not.toBeNull();
      expect(useProgressStore.getState().getProgress('book-2')).not.toBeNull();
    });

    it('merges imported progress with existing', () => {
      useProgressStore.getState().updateProgress('book-1', 100, 3600);

      const importData = {
        'book-2': {
          bookId: 'book-2',
          position: 500,
          duration: 7200,
          lastPlayed: Date.now(),
          isComplete: false,
          currentTrackIndex: 0,
        },
      };

      useProgressStore.getState().importProgress(importData);

      expect(useProgressStore.getState().getProgress('book-1')).not.toBeNull();
      expect(useProgressStore.getState().getProgress('book-2')).not.toBeNull();
    });

    it('exports progress', () => {
      useProgressStore.getState().updateProgress('book-1', 500, 3600);
      useProgressStore.getState().updateProgress('book-2', 1000, 7200);

      const exported = useProgressStore.getState().exportProgress();

      expect(Object.keys(exported).length).toBe(2);
      expect(exported['book-1'].position).toBe(500);
      expect(exported['book-2'].position).toBe(1000);
    });

    it('clears all progress', () => {
      useProgressStore.getState().updateProgress('book-1', 500, 3600);
      useProgressStore.getState().addToSyncQueue('book-1', 500, 3600);
      useProgressStore.getState().clearAllProgress();

      const state = useProgressStore.getState();
      expect(state.progressMap).toEqual({});
      expect(state.syncQueue).toEqual([]);
      expect(state.lastPlayedBookId).toBeNull();
    });
  });

  describe('Completion Threshold', () => {
    it('exports correct threshold value', () => {
      expect(COMPLETION_THRESHOLD).toBe(0.95);
    });

    it('marks complete at exactly threshold', () => {
      // 95% of 1000 = 950
      useProgressStore.getState().updateProgress('book-1', 950, 1000);
      expect(useProgressStore.getState().getProgress('book-1')?.isComplete).toBe(true);
    });

    it('does not mark complete below threshold', () => {
      // 94% of 1000 = 940
      useProgressStore.getState().updateProgress('book-1', 940, 1000);
      expect(useProgressStore.getState().getProgress('book-1')?.isComplete).toBe(false);
    });
  });
});
