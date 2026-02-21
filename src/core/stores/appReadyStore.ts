/**
 * src/core/stores/appReadyStore.ts
 *
 * Simple store to track when the app boot sequence is fully complete.
 * LibraryScreen and other components can check this to avoid showing
 * data that will change during the boot refresh.
 *
 * Uses a module-level flag that resets on each bundle load (handles hot reload).
 */

import { create } from 'zustand';

// Module-level flags - reset on each bundle load (hot reload)
let bootCompleteFlag = false;
let refreshCompleteFlag = false;

interface AppReadyState {
  /** True when initial boot is complete (cached data loaded) */
  isBootComplete: boolean;
  /** True when background refresh is complete (fresh data loaded) - prevents re-sort flash */
  isRefreshComplete: boolean;
  setBootComplete: (complete: boolean) => void;
  setRefreshComplete: (complete: boolean) => void;
  getBootComplete: () => boolean;
  getRefreshComplete: () => boolean;
}

export const useAppReadyStore = create<AppReadyState>((set) => ({
  // Always read from module-level flag for consistency
  isBootComplete: bootCompleteFlag,
  isRefreshComplete: refreshCompleteFlag,
  setBootComplete: (complete) => {
    bootCompleteFlag = complete;
    set({ isBootComplete: complete });
  },
  setRefreshComplete: (complete) => {
    refreshCompleteFlag = complete;
    set({ isRefreshComplete: complete });
  },
  getBootComplete: () => bootCompleteFlag,
  getRefreshComplete: () => refreshCompleteFlag,
}));

// Export direct access for non-React contexts
export const isAppBootComplete = () => bootCompleteFlag;
export const setAppBootComplete = (complete: boolean) => {
  bootCompleteFlag = complete;
  useAppReadyStore.setState({ isBootComplete: complete });
};
export const isAppRefreshComplete = () => refreshCompleteFlag;
export const setAppRefreshComplete = (complete: boolean) => {
  refreshCompleteFlag = complete;
  useAppReadyStore.setState({ isRefreshComplete: complete });
};
