/**
 * src/features/reading-history-wizard/stores/galleryStore.ts
 *
 * Store for the Mark Books Gallery wizard UI state.
 * Tracks processed authors/series during a session and filter state.
 *
 * NOTE: Finished book tracking has been moved to SQLite (user_books table)
 * via useUserBooks.ts hooks. This store only manages wizard navigation state.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DurationFilter = 'under_5h' | '5_10h' | '10_20h' | 'over_20h' | null;
export type SyncStatusFilter = 'synced' | 'not_synced';

export interface FilterState {
  genres: string[];
  authors: string[];
  series: string[];
  syncStatus: SyncStatusFilter[];
  duration: DurationFilter;
}

interface GalleryState {
  // Processed items - these go to the back of the list on return
  // Stores timestamp of when processed (for potential sorting by recency)
  processedAuthors: Map<string, number>;
  processedSeries: Map<string, number>;

  // Session tracking
  sessionStartedAt: number | null;
  isSessionActive: boolean;

  // View state
  currentView: 'all' | 'smart' | 'author' | 'series';

  // Filters for Reading History screen
  filters: FilterState;
}

interface GalleryActions {
  // Process tracking (items go to back of list)
  markAuthorProcessed: (authorName: string) => void;
  markSeriesProcessed: (seriesName: string) => void;
  isAuthorProcessed: (authorName: string) => boolean;
  isSeriesProcessed: (seriesName: string) => boolean;

  // Session
  startSession: () => void;
  endSession: () => void;

  // View
  setView: (view: GalleryState['currentView']) => void;

  // Filters
  setFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;
  hasActiveFilters: () => boolean;
  getActiveFilterCount: () => number;

  // Reset
  reset: () => void;
}

type GalleryStore = GalleryState & GalleryActions;

const emptyFilters: FilterState = {
  genres: [],
  authors: [],
  series: [],
  syncStatus: [],
  duration: null,
};

const initialState: GalleryState = {
  processedAuthors: new Map(),
  processedSeries: new Map(),
  sessionStartedAt: null,
  isSessionActive: false,
  currentView: 'all',
  filters: emptyFilters,
};

export const useGalleryStore = create<GalleryStore>()(
  persist(
    (set, get) => ({
      ...initialState,

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

      // Session management
      startSession: () => {
        set({
          sessionStartedAt: Date.now(),
          isSessionActive: true,
        });
      },

      endSession: () => {
        set({ isSessionActive: false });
      },

      // View management
      setView: (view) => set({ currentView: view }),

      // Filters
      setFilters: (newFilters) => {
        const { filters } = get();
        set({ filters: { ...filters, ...newFilters } });
      },

      clearFilters: () => set({ filters: emptyFilters }),

      hasActiveFilters: () => {
        const { filters } = get();
        return (
          filters.genres.length > 0 ||
          filters.authors.length > 0 ||
          filters.series.length > 0 ||
          filters.syncStatus.length > 0 ||
          filters.duration !== null
        );
      },

      getActiveFilterCount: () => {
        const { filters } = get();
        let count = 0;
        count += filters.genres.length;
        count += filters.authors.length;
        count += filters.series.length;
        count += filters.syncStatus.length;
        if (filters.duration !== null) count += 1;
        return count;
      },

      // Reset store
      reset: () => set(initialState),
    }),
    {
      name: 'reading-history-gallery-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Custom serialization for Map
      partialize: (state) => ({
        processedAuthors: Array.from(state.processedAuthors.entries()),
        processedSeries: Array.from(state.processedSeries.entries()),
        sessionStartedAt: state.sessionStartedAt,
        currentView: state.currentView,
        filters: state.filters,
      }),
      // Custom deserialization - merge converts arrays back to Maps
      merge: (persistedState: any, currentState) => {
        return {
          ...currentState,
          ...persistedState,
          // Always ensure Maps are properly restored
          processedAuthors: Array.isArray(persistedState?.processedAuthors)
            ? new Map(persistedState.processedAuthors)
            : currentState.processedAuthors,
          processedSeries: Array.isArray(persistedState?.processedSeries)
            ? new Map(persistedState.processedSeries)
            : currentState.processedSeries,
          // Restore filters or use empty defaults
          filters: persistedState?.filters || emptyFilters,
        };
      },
    }
  )
);

// Convenience hooks
export const useCurrentView = () =>
  useGalleryStore((s) => s.currentView);

export const useFilters = () =>
  useGalleryStore((s) => s.filters);

export const useHasActiveFilters = () =>
  useGalleryStore((s) => s.hasActiveFilters());

export const useActiveFilterCount = () =>
  useGalleryStore((s) => s.getActiveFilterCount());
