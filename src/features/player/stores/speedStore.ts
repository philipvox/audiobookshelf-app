/**
 * src/features/player/stores/speedStore.ts
 *
 * Playback speed management store.
 * Extracted from playerStore.ts for modularity (Phase 5 refactor).
 *
 * Features:
 * - Per-book speed memory (remembers speed for each book)
 * - Global default speed for new books
 * - Active playback rate persistence for app restart
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import audioService for applying rate changes
import { audioService } from '@/features/player/services/audioService';

// =============================================================================
// CONSTANTS
// =============================================================================

const BOOK_SPEED_MAP_KEY = 'playerBookSpeedMap';
const GLOBAL_DEFAULT_RATE_KEY = 'playerGlobalDefaultRate';
const ACTIVE_PLAYBACK_RATE_KEY = 'playerActivePlaybackRate';

// =============================================================================
// TYPES
// =============================================================================

interface SpeedState {
  playbackRate: number;                  // Current playback rate
  bookSpeedMap: Record<string, number>;  // bookId → playback speed
  globalDefaultRate: number;             // Default speed for new books
}

interface SpeedActions {
  /**
   * Set playback rate and persist for current book
   * @param rate - The playback rate (e.g., 1.0, 1.5, 2.0)
   * @param bookId - Optional book ID to save per-book speed
   */
  setPlaybackRate: (rate: number, bookId?: string) => Promise<void>;

  /**
   * Set the global default rate for new books
   */
  setGlobalDefaultRate: (rate: number) => Promise<void>;

  /**
   * Get speed for a specific book (returns book speed or global default)
   */
  getBookSpeed: (bookId: string) => number;

  /**
   * Apply a book's speed when loading it
   * Returns the rate that was applied
   */
  applyBookSpeed: (bookId: string) => Promise<number>;

  /**
   * Load speed settings from storage
   */
  loadSpeedSettings: () => Promise<void>;
}

// =============================================================================
// LOGGING
// =============================================================================

const DEBUG = __DEV__;
const log = (msg: string, ...args: any[]) => {
  if (DEBUG) console.log(`[SpeedStore] ${msg}`, ...args);
};

// =============================================================================
// STORE
// =============================================================================

export const useSpeedStore = create<SpeedState & SpeedActions>()(
  subscribeWithSelector((set, get) => ({
    // =========================================================================
    // INITIAL STATE
    // =========================================================================

    playbackRate: 1.0,
    bookSpeedMap: {},
    globalDefaultRate: 1.0,

    // =========================================================================
    // ACTIONS
    // =========================================================================

    setPlaybackRate: async (rate: number, bookId?: string) => {
      const { bookSpeedMap } = get();

      // Apply rate to audio service
      await audioService.setPlaybackRate(rate);
      set({ playbackRate: rate });

      // Always persist the active playback rate for app restart recovery
      try {
        await AsyncStorage.setItem(ACTIVE_PLAYBACK_RATE_KEY, rate.toString());
      } catch {}

      // Save per-book speed if a book ID is provided
      if (bookId) {
        const updatedMap = { ...bookSpeedMap, [bookId]: rate };
        set({ bookSpeedMap: updatedMap });

        try {
          await AsyncStorage.setItem(BOOK_SPEED_MAP_KEY, JSON.stringify(updatedMap));
        } catch {}
      }
    },

    setGlobalDefaultRate: async (rate: number) => {
      set({ globalDefaultRate: rate });
      try {
        await AsyncStorage.setItem(GLOBAL_DEFAULT_RATE_KEY, rate.toString());
      } catch {}
    },

    getBookSpeed: (bookId: string) => {
      const { bookSpeedMap, globalDefaultRate } = get();
      return bookSpeedMap[bookId] ?? globalDefaultRate;
    },

    applyBookSpeed: async (bookId: string) => {
      const bookSpeed = get().getBookSpeed(bookId);
      set({ playbackRate: bookSpeed });

      if (bookSpeed !== 1.0) {
        await audioService.setPlaybackRate(bookSpeed).catch(() => {});
      }

      return bookSpeed;
    },

    loadSpeedSettings: async () => {
      try {
        const [
          bookSpeedMapStr,
          globalDefaultRateStr,
          activePlaybackRateStr,
        ] = await Promise.all([
          AsyncStorage.getItem(BOOK_SPEED_MAP_KEY),
          AsyncStorage.getItem(GLOBAL_DEFAULT_RATE_KEY),
          AsyncStorage.getItem(ACTIVE_PLAYBACK_RATE_KEY),
        ]);

        const bookSpeedMap = bookSpeedMapStr ? JSON.parse(bookSpeedMapStr) : {};
        const globalDefaultRate = globalDefaultRateStr ? parseFloat(globalDefaultRateStr) : 1.0;

        // Restore playback rate from active rate if available
        let playbackRate = globalDefaultRate;
        if (activePlaybackRateStr) {
          playbackRate = parseFloat(activePlaybackRateStr);
          log(`Restored active playback rate: ${playbackRate}x`);
        }

        // Apply the restored rate to audioService immediately
        if (playbackRate !== 1.0) {
          log(`Applying restored playback rate to audioService: ${playbackRate}x`);
          audioService.setPlaybackRate(playbackRate).catch(() => {
            // Audio service may not be loaded yet - rate will be applied when book loads
          });
        }

        set({
          bookSpeedMap,
          globalDefaultRate,
          playbackRate,
        });
      } catch (error) {
        log('Error loading speed settings:', error);
        // Use defaults
      }
    },
  }))
);

// =============================================================================
// SELECTORS
// =============================================================================

/**
 * Get current playback rate
 */
export const usePlaybackRate = () => useSpeedStore((s) => s.playbackRate);

/**
 * Get global default rate
 */
export const useGlobalDefaultRate = () => useSpeedStore((s) => s.globalDefaultRate);

/**
 * Get book-specific speed (uses global default if not set)
 */
export const useBookSpeed = (bookId: string) =>
  useSpeedStore((s) => s.bookSpeedMap[bookId] ?? s.globalDefaultRate);

/**
 * Check if a book has a custom speed set
 */
export const useHasCustomSpeed = (bookId: string) =>
  useSpeedStore((s) => bookId in s.bookSpeedMap);
