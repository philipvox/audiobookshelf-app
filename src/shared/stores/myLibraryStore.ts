/**
 * src/shared/stores/myLibraryStore.ts
 *
 * Zustand store for managing user's personal library
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MyLibraryState {
  // Library items (book IDs)
  libraryIds: string[];

  // Favorite series (series names)
  favoriteSeriesNames: string[];

  // Selection mode
  isSelecting: boolean;
  selectedIds: string[];

  // Preferences
  hideSingleBookSeries: boolean;

  // Actions
  addToLibrary: (bookId: string) => void;
  removeFromLibrary: (bookId: string) => void;
  removeMultiple: (bookIds: string[]) => void;
  isInLibrary: (bookId: string) => boolean;

  // Series favorites
  addSeriesToFavorites: (seriesName: string) => void;
  removeSeriesFromFavorites: (seriesName: string) => void;
  isSeriesFavorite: (seriesName: string) => boolean;

  // Preferences
  setHideSingleBookSeries: (hide: boolean) => void;

  // Selection actions
  startSelecting: () => void;
  stopSelecting: () => void;
  toggleSelection: (bookId: string) => void;
  selectAll: (bookIds: string[]) => void;
  clearSelection: () => void;
}

export const useMyLibraryStore = create<MyLibraryState>()(
  persist(
    (set, get) => ({
      libraryIds: [],
      favoriteSeriesNames: [],
      isSelecting: false,
      selectedIds: [],
      hideSingleBookSeries: false,

      addToLibrary: (bookId: string) => {
        const { libraryIds } = get();
        if (!libraryIds.includes(bookId)) {
          set({ libraryIds: [...libraryIds, bookId] });
        }
      },

      removeFromLibrary: (bookId: string) => {
        const { libraryIds, selectedIds } = get();
        set({
          libraryIds: libraryIds.filter(id => id !== bookId),
          selectedIds: selectedIds.filter(id => id !== bookId),
        });
      },

      removeMultiple: (bookIds: string[]) => {
        const { libraryIds } = get();
        set({
          libraryIds: libraryIds.filter(id => !bookIds.includes(id)),
          selectedIds: [],
          isSelecting: false,
        });
      },

      isInLibrary: (bookId: string) => {
        return get().libraryIds.includes(bookId);
      },

      // Series favorites
      addSeriesToFavorites: (seriesName: string) => {
        const { favoriteSeriesNames } = get();
        if (!favoriteSeriesNames.includes(seriesName)) {
          set({ favoriteSeriesNames: [...favoriteSeriesNames, seriesName] });
        }
      },

      removeSeriesFromFavorites: (seriesName: string) => {
        const { favoriteSeriesNames } = get();
        set({ favoriteSeriesNames: favoriteSeriesNames.filter(name => name !== seriesName) });
      },

      isSeriesFavorite: (seriesName: string) => {
        return get().favoriteSeriesNames.includes(seriesName);
      },

      // Preferences
      setHideSingleBookSeries: (hide: boolean) => {
        set({ hideSingleBookSeries: hide });
      },

      startSelecting: () => {
        set({ isSelecting: true, selectedIds: [] });
      },

      stopSelecting: () => {
        set({ isSelecting: false, selectedIds: [] });
      },

      toggleSelection: (bookId: string) => {
        const { selectedIds } = get();
        if (selectedIds.includes(bookId)) {
          set({ selectedIds: selectedIds.filter(id => id !== bookId) });
        } else {
          set({ selectedIds: [...selectedIds, bookId] });
        }
      },

      selectAll: (bookIds: string[]) => {
        set({ selectedIds: bookIds });
      },

      clearSelection: () => {
        set({ selectedIds: [] });
      },
    }),
    {
      name: 'my-library-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        libraryIds: state.libraryIds,
        favoriteSeriesNames: state.favoriteSeriesNames,
        hideSingleBookSeries: state.hideSingleBookSeries,
      }),
    }
  )
);