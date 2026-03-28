/**
 * src/features/queue/stores/__tests__/queueStore.test.ts
 *
 * Tests for queue store state management logic.
 * Tests the synchronous parts of the store.
 */

import { QueueBookMeta } from '../queueStore';

// Mock all dependencies before importing the store
jest.mock('@/core/services/sqliteCache', () => ({
  sqliteCache: {
    getQueue: jest.fn().mockResolvedValue([]),
    addToQueue: jest.fn().mockResolvedValue('queue-item-1'),
    removeFromQueue: jest.fn().mockResolvedValue(undefined),
    clearQueue: jest.fn().mockResolvedValue(undefined),
    reorderQueue: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/core/cache/libraryCache', () => ({
  getNextBookInSeries: jest.fn().mockReturnValue(null),
  useLibraryCache: {
    getState: jest.fn().mockReturnValue({
      getItem: jest.fn().mockReturnValue(undefined),
    }),
  },
}));

describe('queueStore - state management', () => {
  // Create a fresh store for each test to avoid state pollution
  let useQueueStore: any;

  const createMockMeta = (title: string): QueueBookMeta => ({
    title,
    authorName: 'Test Author',
    duration: 3600,
  });

  const meta1 = createMockMeta('First Book');
  const meta2 = createMockMeta('Second Book');
  const meta3 = createMockMeta('Third Book');

  beforeEach(() => {
    // Clear module cache to get fresh store
    jest.resetModules();
    // Re-import after reset
    const storeModule = require('../queueStore');
    useQueueStore = storeModule.useQueueStore;
  });

  describe('initial state', () => {
    it('starts with empty queue', () => {
      const state = useQueueStore.getState();
      expect(state.queue).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(false);
      expect(state.autoplayEnabled).toBe(true);
      expect(state.autoSeriesBookId).toBeNull();
    });
  });

  describe('isInQueue', () => {
    it('returns false for empty queue', () => {
      expect(useQueueStore.getState().isInQueue('any-book')).toBe(false);
    });

    it('returns true when book is in queue', () => {
      // Manually set queue state
      useQueueStore.setState({
        queue: [{
          id: 'q1',
          bookId: 'book-1',
          meta: meta1,
          position: 0,
          addedAt: Date.now(),
          played: false,
        }],
      });

      expect(useQueueStore.getState().isInQueue('book-1')).toBe(true);
    });

    it('returns false when book is not in queue', () => {
      useQueueStore.setState({
        queue: [{
          id: 'q1',
          bookId: 'book-1',
          meta: meta1,
          position: 0,
          addedAt: Date.now(),
          played: false,
        }],
      });

      expect(useQueueStore.getState().isInQueue('book-2')).toBe(false);
    });
  });

  describe('getNextBook', () => {
    it('returns null for empty queue', () => {
      expect(useQueueStore.getState().getNextBook()).toBeNull();
    });

    it('returns first book in queue', () => {
      useQueueStore.setState({
        queue: [
          { id: 'q1', bookId: 'book-1', meta: meta1, position: 0, addedAt: Date.now(), played: false },
          { id: 'q2', bookId: 'book-2', meta: meta2, position: 1, addedAt: Date.now(), played: false },
        ],
      });

      const nextBook = useQueueStore.getState().getNextBook();
      expect(nextBook).not.toBeNull();
      expect(nextBook.id).toBe('book-1');
    });

    it('does not remove book from queue', () => {
      useQueueStore.setState({
        queue: [
          { id: 'q1', bookId: 'book-1', meta: meta1, position: 0, addedAt: Date.now(), played: false },
        ],
      });

      useQueueStore.getState().getNextBook();
      expect(useQueueStore.getState().queue.length).toBe(1);
    });
  });

  describe('setState - queue manipulation', () => {
    it('can manually add items to queue', () => {
      useQueueStore.setState({
        queue: [
          { id: 'q1', bookId: 'book-1', meta: meta1, position: 0, addedAt: Date.now(), played: false },
        ],
      });

      expect(useQueueStore.getState().queue.length).toBe(1);
    });

    it('can manually clear queue', () => {
      useQueueStore.setState({
        queue: [
          { id: 'q1', bookId: 'book-1', meta: meta1, position: 0, addedAt: Date.now(), played: false },
          { id: 'q2', bookId: 'book-2', meta: meta2, position: 1, addedAt: Date.now(), played: false },
        ],
      });

      useQueueStore.setState({ queue: [] });
      expect(useQueueStore.getState().queue.length).toBe(0);
    });

    it('maintains order when set', () => {
      useQueueStore.setState({
        queue: [
          { id: 'q1', bookId: 'book-1', meta: meta1, position: 0, addedAt: 1, played: false },
          { id: 'q2', bookId: 'book-2', meta: meta2, position: 1, addedAt: 2, played: false },
          { id: 'q3', bookId: 'book-3', meta: meta3, position: 2, addedAt: 3, played: false },
        ],
      });

      const queue = useQueueStore.getState().queue;
      expect(queue[0].bookId).toBe('book-1');
      expect(queue[1].bookId).toBe('book-2');
      expect(queue[2].bookId).toBe('book-3');
    });
  });

  describe('autoplay state', () => {
    it('defaults to enabled', () => {
      expect(useQueueStore.getState().autoplayEnabled).toBe(true);
    });

    it('can be set to disabled', () => {
      useQueueStore.setState({ autoplayEnabled: false });
      expect(useQueueStore.getState().autoplayEnabled).toBe(false);
    });

    it('can be toggled', () => {
      useQueueStore.setState({ autoplayEnabled: false });
      useQueueStore.setState({ autoplayEnabled: true });
      expect(useQueueStore.getState().autoplayEnabled).toBe(true);
    });
  });

  describe('autoSeriesBookId', () => {
    it('defaults to null', () => {
      expect(useQueueStore.getState().autoSeriesBookId).toBeNull();
    });

    it('can be set when series book is auto-added', () => {
      useQueueStore.setState({ autoSeriesBookId: 'series-book-1' });
      expect(useQueueStore.getState().autoSeriesBookId).toBe('series-book-1');
    });

    it('can be cleared', () => {
      useQueueStore.setState({ autoSeriesBookId: 'series-book-1' });
      useQueueStore.setState({ autoSeriesBookId: null });
      expect(useQueueStore.getState().autoSeriesBookId).toBeNull();
    });
  });

  describe('loading state', () => {
    it('defaults to not loading', () => {
      expect(useQueueStore.getState().isLoading).toBe(false);
    });

    it('can be set to loading', () => {
      useQueueStore.setState({ isLoading: true });
      expect(useQueueStore.getState().isLoading).toBe(true);
    });
  });

  describe('initialized state', () => {
    it('defaults to not initialized', () => {
      expect(useQueueStore.getState().isInitialized).toBe(false);
    });

    it('can be set to initialized', () => {
      useQueueStore.setState({ isInitialized: true });
      expect(useQueueStore.getState().isInitialized).toBe(true);
    });
  });

  describe('QueueBook structure', () => {
    it('queue items have required properties', () => {
      const queueItem = {
        id: 'q1',
        bookId: 'book-1',
        meta: meta1,
        position: 0,
        addedAt: Date.now(),
        played: false,
      };

      useQueueStore.setState({ queue: [queueItem] });

      const item = useQueueStore.getState().queue[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('bookId');
      expect(item).toHaveProperty('meta');
      expect(item).toHaveProperty('position');
      expect(item).toHaveProperty('addedAt');
    });

    it('meta property contains slim metadata', () => {
      useQueueStore.setState({
        queue: [{
          id: 'q1',
          bookId: 'book-1',
          meta: meta1,
          position: 0,
          addedAt: Date.now(),
          played: false,
        }],
      });

      const queuedMeta = useQueueStore.getState().queue[0].meta;
      expect(queuedMeta.title).toBe('First Book');
      expect(queuedMeta.authorName).toBe('Test Author');
      expect(queuedMeta.duration).toBe(3600);
    });
  });
});
