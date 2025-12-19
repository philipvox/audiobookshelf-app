/**
 * src/features/reading-history-wizard/stores/galleryStore.ts
 *
 * Store for the Mark Books Gallery feature.
 * Tracks which books are marked as finished during a session.
 * Uses optimistic updates with background sync.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from '@/core/api/endpoints/user';
import * as Haptics from 'expo-haptics';

export interface MarkedBook {
  bookId: string;
  markedAt: number;
  source: 'tap' | 'bulk_author' | 'bulk_series';
  synced: boolean;
}

export interface UndoAction {
  type: 'mark' | 'unmark' | 'bulk_mark';
  bookIds: string[];
  timestamp: number;
  label: string; // e.g., "Marked 12 books by Brandon Sanderson"
}

interface GalleryState {
  // Marked books in current/recent session
  markedBooks: Map<string, MarkedBook>;

  // Processed items - these go to the back of the list on return
  // Stores timestamp of when processed (for potential sorting by recency)
  processedAuthors: Map<string, number>;
  processedSeries: Map<string, number>;

  // Undo stack (last action only, expires after 15s)
  lastAction: UndoAction | null;

  // Session tracking
  sessionStartedAt: number | null;
  isSessionActive: boolean;

  // View state
  currentView: 'all' | 'smart' | 'author' | 'series';
}

interface GalleryActions {
  // Core actions
  markBook: (bookId: string, source?: MarkedBook['source']) => Promise<void>;
  unmarkBook: (bookId: string) => Promise<void>;
  toggleBook: (bookId: string) => Promise<void>;

  // Bulk actions
  markAllByAuthor: (authorName: string, bookIds: string[]) => Promise<void>;
  markAllInSeries: (seriesName: string, bookIds: string[]) => Promise<void>;

  // Process tracking (items go to back of list)
  markAuthorProcessed: (authorName: string) => void;
  markSeriesProcessed: (seriesName: string) => void;
  isAuthorProcessed: (authorName: string) => boolean;
  isSeriesProcessed: (seriesName: string) => boolean;

  // Undo
  undo: () => Promise<void>;
  clearUndo: () => void;

  // Session
  startSession: () => void;
  endSession: () => Promise<void>;

  // View
  setView: (view: GalleryState['currentView']) => void;

  // Queries
  isMarked: (bookId: string) => boolean;
  getMarkedCount: () => number;
  getMarkedBookIds: () => string[];

  // Sync
  syncToServer: () => Promise<void>;

  // Reset
  reset: () => void;
}

type GalleryStore = GalleryState & GalleryActions;

const initialState: GalleryState = {
  markedBooks: new Map(),
  processedAuthors: new Map(),
  processedSeries: new Map(),
  lastAction: null,
  sessionStartedAt: null,
  isSessionActive: false,
  currentView: 'all',
};

export const useGalleryStore = create<GalleryStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Mark a single book
      markBook: async (bookId, source = 'tap') => {
        const { markedBooks, lastAction } = get();

        // Already marked? Skip
        if (markedBooks.has(bookId)) return;

        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Optimistic update
        const newMarked = new Map(markedBooks);
        newMarked.set(bookId, {
          bookId,
          markedAt: Date.now(),
          source,
          synced: false,
        });

        set({
          markedBooks: newMarked,
          lastAction: {
            type: 'mark',
            bookIds: [bookId],
            timestamp: Date.now(),
            label: 'Marked 1 book',
          },
        });

        // Sync to server in background
        try {
          await userApi.markAsFinished(bookId);
          const updated = new Map(get().markedBooks);
          const book = updated.get(bookId);
          if (book) {
            book.synced = true;
            set({ markedBooks: updated });
          }
        } catch (error) {
          console.warn('[GalleryStore] Failed to sync mark:', error);
        }
      },

      // Unmark a single book
      unmarkBook: async (bookId) => {
        const { markedBooks } = get();

        // Not marked? Skip
        if (!markedBooks.has(bookId)) return;

        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Optimistic update
        const newMarked = new Map(markedBooks);
        newMarked.delete(bookId);

        set({
          markedBooks: newMarked,
          lastAction: {
            type: 'unmark',
            bookIds: [bookId],
            timestamp: Date.now(),
            label: 'Unmarked 1 book',
          },
        });

        // Sync to server
        try {
          await userApi.markAsNotStarted(bookId);
        } catch (error) {
          console.warn('[GalleryStore] Failed to sync unmark:', error);
        }
      },

      // Toggle mark state
      toggleBook: async (bookId) => {
        const { isMarked, markBook, unmarkBook } = get();
        if (isMarked(bookId)) {
          await unmarkBook(bookId);
        } else {
          await markBook(bookId);
        }
      },

      // Bulk mark by author
      markAllByAuthor: async (authorName, bookIds) => {
        const { markedBooks } = get();

        // Filter to only unmark books
        const toMark = bookIds.filter((id) => !markedBooks.has(id));
        if (toMark.length === 0) return;

        // Haptic feedback (stronger for bulk)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Optimistic update
        const newMarked = new Map(markedBooks);
        toMark.forEach((bookId) => {
          newMarked.set(bookId, {
            bookId,
            markedAt: Date.now(),
            source: 'bulk_author',
            synced: false,
          });
        });

        set({
          markedBooks: newMarked,
          lastAction: {
            type: 'bulk_mark',
            bookIds: toMark,
            timestamp: Date.now(),
            label: `Marked ${toMark.length} books by ${authorName}`,
          },
        });

        // Sync to server in background
        Promise.allSettled(toMark.map((id) => userApi.markAsFinished(id))).then(
          (results) => {
            const updated = new Map(get().markedBooks);
            results.forEach((result, i) => {
              if (result.status === 'fulfilled') {
                const book = updated.get(toMark[i]);
                if (book) book.synced = true;
              }
            });
            set({ markedBooks: updated });
          }
        );
      },

      // Bulk mark by series
      markAllInSeries: async (seriesName, bookIds) => {
        const { markedBooks } = get();

        const toMark = bookIds.filter((id) => !markedBooks.has(id));
        if (toMark.length === 0) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const newMarked = new Map(markedBooks);
        toMark.forEach((bookId) => {
          newMarked.set(bookId, {
            bookId,
            markedAt: Date.now(),
            source: 'bulk_series',
            synced: false,
          });
        });

        set({
          markedBooks: newMarked,
          lastAction: {
            type: 'bulk_mark',
            bookIds: toMark,
            timestamp: Date.now(),
            label: `Marked ${toMark.length} books in ${seriesName}`,
          },
        });

        Promise.allSettled(toMark.map((id) => userApi.markAsFinished(id))).then(
          (results) => {
            const updated = new Map(get().markedBooks);
            results.forEach((result, i) => {
              if (result.status === 'fulfilled') {
                const book = updated.get(toMark[i]);
                if (book) book.synced = true;
              }
            });
            set({ markedBooks: updated });
          }
        );
      },

      // Mark author as processed (goes to back of list)
      markAuthorProcessed: (authorName) => {
        const { processedAuthors } = get();
        const updated = new Map(processedAuthors);
        updated.set(authorName, Date.now());
        set({ processedAuthors: updated });
      },

      // Mark series as processed (goes to back of list)
      markSeriesProcessed: (seriesName) => {
        const { processedSeries } = get();
        const updated = new Map(processedSeries);
        updated.set(seriesName, Date.now());
        set({ processedSeries: updated });
      },

      // Check if author was processed
      isAuthorProcessed: (authorName) => get().processedAuthors.has(authorName),

      // Check if series was processed
      isSeriesProcessed: (seriesName) => get().processedSeries.has(seriesName),

      // Undo last action
      undo: async () => {
        const { lastAction, markedBooks } = get();
        if (!lastAction) return;

        // Check if action is still valid (within 15 seconds)
        if (Date.now() - lastAction.timestamp > 15000) {
          set({ lastAction: null });
          return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (lastAction.type === 'mark' || lastAction.type === 'bulk_mark') {
          // Undo marks = unmark the books
          const newMarked = new Map(markedBooks);
          lastAction.bookIds.forEach((id) => newMarked.delete(id));
          set({ markedBooks: newMarked, lastAction: null });

          // Sync to server
          Promise.allSettled(
            lastAction.bookIds.map((id) => userApi.markAsNotStarted(id))
          );
        } else if (lastAction.type === 'unmark') {
          // Undo unmark = mark the book again
          const newMarked = new Map(markedBooks);
          lastAction.bookIds.forEach((bookId) => {
            newMarked.set(bookId, {
              bookId,
              markedAt: Date.now(),
              source: 'tap',
              synced: false,
            });
          });
          set({ markedBooks: newMarked, lastAction: null });

          Promise.allSettled(
            lastAction.bookIds.map((id) => userApi.markAsFinished(id))
          );
        }
      },

      clearUndo: () => set({ lastAction: null }),

      // Session management
      startSession: () => {
        set({
          sessionStartedAt: Date.now(),
          isSessionActive: true,
        });
      },

      endSession: async () => {
        // Sync any remaining unsynced marks
        await get().syncToServer();
        set({ isSessionActive: false });
      },

      // View management
      setView: (view) => set({ currentView: view }),

      // Queries
      isMarked: (bookId) => get().markedBooks.has(bookId),

      getMarkedCount: () => get().markedBooks.size,

      getMarkedBookIds: () => Array.from(get().markedBooks.keys()),

      // Sync all unsynced marks
      syncToServer: async () => {
        const { markedBooks } = get();
        const unsynced = Array.from(markedBooks.values()).filter(
          (b) => !b.synced
        );

        if (unsynced.length === 0) return;

        const results = await Promise.allSettled(
          unsynced.map((b) => userApi.markAsFinished(b.bookId))
        );

        const updated = new Map(get().markedBooks);
        results.forEach((result, i) => {
          if (result.status === 'fulfilled') {
            const book = updated.get(unsynced[i].bookId);
            if (book) book.synced = true;
          }
        });
        set({ markedBooks: updated });
      },

      // Reset store
      reset: () => set(initialState),
    }),
    {
      name: 'reading-history-gallery-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Custom serialization for Map
      partialize: (state) => ({
        markedBooks: Array.from(state.markedBooks.entries()),
        processedAuthors: Array.from(state.processedAuthors.entries()),
        processedSeries: Array.from(state.processedSeries.entries()),
        sessionStartedAt: state.sessionStartedAt,
        currentView: state.currentView,
      }),
      // Custom deserialization - merge converts arrays back to Maps
      merge: (persistedState: any, currentState) => {
        return {
          ...currentState,
          ...persistedState,
          // Always ensure Maps are properly restored
          markedBooks: Array.isArray(persistedState?.markedBooks)
            ? new Map(persistedState.markedBooks)
            : currentState.markedBooks,
          processedAuthors: Array.isArray(persistedState?.processedAuthors)
            ? new Map(persistedState.processedAuthors)
            : currentState.processedAuthors,
          processedSeries: Array.isArray(persistedState?.processedSeries)
            ? new Map(persistedState.processedSeries)
            : currentState.processedSeries,
        };
      },
    }
  )
);

// Convenience hooks
export const useIsBookMarked = (bookId: string) =>
  useGalleryStore((s) => s.isMarked(bookId));

export const useMarkedCount = () =>
  useGalleryStore((s) => s.getMarkedCount());

export const useCurrentView = () =>
  useGalleryStore((s) => s.currentView);
