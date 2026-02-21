/**
 * src/shared/stores/librarySyncStore.ts
 *
 * Persisted store for library sync metadata.
 * Tracks linked playlist IDs and tombstones for union-merge conflict resolution.
 *
 * MIGRATED: Now uses playlists (per-user) instead of collections (shared).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOMBSTONE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface Tombstone {
  id: string;
  removedAt: number;
}

interface LibrarySyncState {
  // Linked playlist IDs (null = not set up)
  libraryPlaylistId: string | null;
  seriesPlaylistId: string | null;

  // Legacy collection IDs (kept for migration detection only)
  libraryCollectionId: string | null;
  seriesCollectionId: string | null;

  // Tombstones for tracking removals (union merge)
  bookTombstones: Tombstone[];
  seriesTombstones: Tombstone[];

  // Last successful sync timestamp
  lastSyncAt: number | null;

  // Actions
  setLibraryPlaylistId: (id: string | null) => void;
  setSeriesPlaylistId: (id: string | null) => void;
  // Legacy setters (for migration cleanup)
  setLibraryCollectionId: (id: string | null) => void;
  setSeriesCollectionId: (id: string | null) => void;
  addBookTombstone: (bookId: string) => void;
  addSeriesTombstone: (seriesName: string) => void;
  clearBookTombstone: (bookId: string) => void;
  clearSeriesTombstone: (seriesName: string) => void;
  pruneOldTombstones: () => void;
  setLastSyncAt: (ts: number) => void;
  reset: () => void;
}

export const useLibrarySyncStore = create<LibrarySyncState>()(
  persist(
    (set, get) => ({
      libraryPlaylistId: null,
      seriesPlaylistId: null,
      libraryCollectionId: null,
      seriesCollectionId: null,
      bookTombstones: [],
      seriesTombstones: [],
      lastSyncAt: null,

      setLibraryPlaylistId: (id: string | null) => {
        set({ libraryPlaylistId: id });
      },

      setSeriesPlaylistId: (id: string | null) => {
        set({ seriesPlaylistId: id });
      },

      setLibraryCollectionId: (id: string | null) => {
        set({ libraryCollectionId: id });
      },

      setSeriesCollectionId: (id: string | null) => {
        set({ seriesCollectionId: id });
      },

      addBookTombstone: (bookId: string) => {
        const { bookTombstones } = get();
        if (bookTombstones.some(t => t.id === bookId)) return;
        set({ bookTombstones: [...bookTombstones, { id: bookId, removedAt: Date.now() }] });
      },

      addSeriesTombstone: (seriesName: string) => {
        const { seriesTombstones } = get();
        if (seriesTombstones.some(t => t.id === seriesName)) return;
        set({ seriesTombstones: [...seriesTombstones, { id: seriesName, removedAt: Date.now() }] });
      },

      clearBookTombstone: (bookId: string) => {
        const { bookTombstones } = get();
        set({ bookTombstones: bookTombstones.filter(t => t.id !== bookId) });
      },

      clearSeriesTombstone: (seriesName: string) => {
        const { seriesTombstones } = get();
        set({ seriesTombstones: seriesTombstones.filter(t => t.id !== seriesName) });
      },

      pruneOldTombstones: () => {
        const now = Date.now();
        const { bookTombstones, seriesTombstones } = get();
        set({
          bookTombstones: bookTombstones.filter(t => now - t.removedAt < TOMBSTONE_MAX_AGE_MS),
          seriesTombstones: seriesTombstones.filter(t => now - t.removedAt < TOMBSTONE_MAX_AGE_MS),
        });
      },

      setLastSyncAt: (ts: number) => {
        set({ lastSyncAt: ts });
      },

      reset: () => {
        set({
          libraryPlaylistId: null,
          seriesPlaylistId: null,
          libraryCollectionId: null,
          seriesCollectionId: null,
          bookTombstones: [],
          seriesTombstones: [],
          lastSyncAt: null,
        });
      },
    }),
    {
      name: 'library-sync-storage',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        libraryPlaylistId: state.libraryPlaylistId,
        seriesPlaylistId: state.seriesPlaylistId,
        libraryCollectionId: state.libraryCollectionId,
        seriesCollectionId: state.seriesCollectionId,
        bookTombstones: state.bookTombstones,
        seriesTombstones: state.seriesTombstones,
        lastSyncAt: state.lastSyncAt,
      }),
      // Migration: v1 (collections) → v2 (playlists)
      // Clear old collection IDs and force fresh sync with playlists
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          return {
            ...persistedState,
            libraryPlaylistId: null,
            seriesPlaylistId: null,
            // Clear old collection IDs
            libraryCollectionId: null,
            seriesCollectionId: null,
            // Reset sync timestamp to force full re-sync
            lastSyncAt: null,
          };
        }
        return persistedState;
      },
    }
  )
);
