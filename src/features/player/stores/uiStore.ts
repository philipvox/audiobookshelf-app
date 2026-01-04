/**
 * src/features/player/stores/uiStore.ts
 *
 * Player UI state store.
 * Manages transient UI state that doesn't need persistence.
 *
 * Contains:
 * - Loading and buffering states
 * - Player visibility states
 * - Modal/sheet states
 * - Animation states
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// =============================================================================
// Types
// =============================================================================

export interface PlayerUIState {
  // Loading states
  isLoading: boolean;
  isBuffering: boolean;
  loadingProgress: number; // 0-100

  // Player visibility
  isFullScreenPlayerVisible: boolean;
  isMiniPlayerVisible: boolean;

  // Sheet/Modal states
  isChapterSheetOpen: boolean;
  isSpeedSheetOpen: boolean;
  isSleepTimerSheetOpen: boolean;
  isQueueSheetOpen: boolean;

  // Gesture states
  isSeekGestureActive: boolean;
  isVolumeGestureActive: boolean;

  // Shake detection
  isShakeDetectionActive: boolean;

  // Error display
  errorToShow: string | null;
  errorDismissTimeout: NodeJS.Timeout | null;
}

export interface PlayerUIActions {
  // Loading states
  setLoading: (isLoading: boolean) => void;
  setBuffering: (isBuffering: boolean) => void;
  setLoadingProgress: (progress: number) => void;

  // Player visibility
  showFullScreenPlayer: () => void;
  hideFullScreenPlayer: () => void;
  showMiniPlayer: () => void;
  hideMiniPlayer: () => void;
  hideAllPlayers: () => void;

  // Sheet controls
  openChapterSheet: () => void;
  closeChapterSheet: () => void;
  openSpeedSheet: () => void;
  closeSpeedSheet: () => void;
  openSleepTimerSheet: () => void;
  closeSleepTimerSheet: () => void;
  openQueueSheet: () => void;
  closeQueueSheet: () => void;
  closeAllSheets: () => void;

  // Gesture states
  setSeekGestureActive: (active: boolean) => void;
  setVolumeGestureActive: (active: boolean) => void;

  // Shake detection
  setShakeDetectionActive: (active: boolean) => void;

  // Error display
  showError: (message: string, autoDismissMs?: number) => void;
  clearError: () => void;

  // Reset
  resetUI: () => void;
}

export type PlayerUIStore = PlayerUIState & PlayerUIActions;

// =============================================================================
// Default State
// =============================================================================

const defaultState: PlayerUIState = {
  isLoading: false,
  isBuffering: false,
  loadingProgress: 0,
  isFullScreenPlayerVisible: false,
  isMiniPlayerVisible: false,
  isChapterSheetOpen: false,
  isSpeedSheetOpen: false,
  isSleepTimerSheetOpen: false,
  isQueueSheetOpen: false,
  isSeekGestureActive: false,
  isVolumeGestureActive: false,
  isShakeDetectionActive: false,
  errorToShow: null,
  errorDismissTimeout: null,
};

// =============================================================================
// Store
// =============================================================================

export const usePlayerUIStore = create<PlayerUIStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    ...defaultState,

    // Loading states
    setLoading: (isLoading: boolean) => {
      set({ isLoading, loadingProgress: isLoading ? 0 : 100 });
    },

    setBuffering: (isBuffering: boolean) => {
      set({ isBuffering });
    },

    setLoadingProgress: (progress: number) => {
      set({ loadingProgress: Math.max(0, Math.min(100, progress)) });
    },

    // Player visibility
    showFullScreenPlayer: () => {
      set({
        isFullScreenPlayerVisible: true,
        isMiniPlayerVisible: false,
      });
    },

    hideFullScreenPlayer: () => {
      set({
        isFullScreenPlayerVisible: false,
        isMiniPlayerVisible: true,
      });
    },

    showMiniPlayer: () => {
      set({
        isMiniPlayerVisible: true,
        isFullScreenPlayerVisible: false,
      });
    },

    hideMiniPlayer: () => {
      set({ isMiniPlayerVisible: false });
    },

    hideAllPlayers: () => {
      set({
        isFullScreenPlayerVisible: false,
        isMiniPlayerVisible: false,
      });
    },

    // Sheet controls
    openChapterSheet: () => {
      get().closeAllSheets();
      set({ isChapterSheetOpen: true });
    },

    closeChapterSheet: () => {
      set({ isChapterSheetOpen: false });
    },

    openSpeedSheet: () => {
      get().closeAllSheets();
      set({ isSpeedSheetOpen: true });
    },

    closeSpeedSheet: () => {
      set({ isSpeedSheetOpen: false });
    },

    openSleepTimerSheet: () => {
      get().closeAllSheets();
      set({ isSleepTimerSheetOpen: true });
    },

    closeSleepTimerSheet: () => {
      set({ isSleepTimerSheetOpen: false });
    },

    openQueueSheet: () => {
      get().closeAllSheets();
      set({ isQueueSheetOpen: true });
    },

    closeQueueSheet: () => {
      set({ isQueueSheetOpen: false });
    },

    closeAllSheets: () => {
      set({
        isChapterSheetOpen: false,
        isSpeedSheetOpen: false,
        isSleepTimerSheetOpen: false,
        isQueueSheetOpen: false,
      });
    },

    // Gesture states
    setSeekGestureActive: (active: boolean) => {
      set({ isSeekGestureActive: active });
    },

    setVolumeGestureActive: (active: boolean) => {
      set({ isVolumeGestureActive: active });
    },

    // Shake detection
    setShakeDetectionActive: (active: boolean) => {
      set({ isShakeDetectionActive: active });
    },

    // Error display
    showError: (message: string, autoDismissMs: number = 5000) => {
      // Clear any existing timeout
      const existingTimeout = get().errorDismissTimeout;
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new error with auto-dismiss
      const timeout = setTimeout(() => {
        get().clearError();
      }, autoDismissMs);

      set({
        errorToShow: message,
        errorDismissTimeout: timeout,
      });
    },

    clearError: () => {
      const existingTimeout = get().errorDismissTimeout;
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      set({
        errorToShow: null,
        errorDismissTimeout: null,
      });
    },

    // Reset
    resetUI: () => {
      const existingTimeout = get().errorDismissTimeout;
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      set(defaultState);
    },
  }))
);

// =============================================================================
// Selectors
// =============================================================================

export const selectIsLoading = (state: PlayerUIStore) => state.isLoading;
export const selectIsBuffering = (state: PlayerUIStore) => state.isBuffering;
export const selectLoadingProgress = (state: PlayerUIStore) => state.loadingProgress;

export const selectIsAnyPlayerVisible = (state: PlayerUIStore) =>
  state.isFullScreenPlayerVisible || state.isMiniPlayerVisible;

export const selectIsAnySheetOpen = (state: PlayerUIStore) =>
  state.isChapterSheetOpen ||
  state.isSpeedSheetOpen ||
  state.isSleepTimerSheetOpen ||
  state.isQueueSheetOpen;

export const selectIsAnyGestureActive = (state: PlayerUIStore) =>
  state.isSeekGestureActive || state.isVolumeGestureActive;

// =============================================================================
// Hooks for common patterns
// =============================================================================

/**
 * Get loading state.
 */
export function useIsPlayerLoading(): boolean {
  return usePlayerUIStore((state) => state.isLoading);
}

/**
 * Get buffering state.
 */
export function useIsPlayerBuffering(): boolean {
  return usePlayerUIStore((state) => state.isBuffering);
}

/**
 * Get full screen player visibility.
 */
export function useIsFullScreenPlayerVisible(): boolean {
  return usePlayerUIStore((state) => state.isFullScreenPlayerVisible);
}

/**
 * Get mini player visibility.
 */
export function useIsMiniPlayerVisible(): boolean {
  return usePlayerUIStore((state) => state.isMiniPlayerVisible);
}

/**
 * Get error to show.
 */
export function usePlayerError(): string | null {
  return usePlayerUIStore((state) => state.errorToShow);
}

/**
 * Get shake detection state.
 */
export function useIsShakeDetectionActive(): boolean {
  return usePlayerUIStore((state) => state.isShakeDetectionActive);
}
