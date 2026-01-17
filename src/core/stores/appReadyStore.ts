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

// Module-level flag - resets on each bundle load (hot reload)
let bootCompleteFlag = false;

interface AppReadyState {
  isBootComplete: boolean;
  setBootComplete: (complete: boolean) => void;
  getBootComplete: () => boolean;
}

export const useAppReadyStore = create<AppReadyState>((set) => ({
  // Always read from module-level flag for consistency
  isBootComplete: bootCompleteFlag,
  setBootComplete: (complete) => {
    bootCompleteFlag = complete;
    set({ isBootComplete: complete });
  },
  getBootComplete: () => bootCompleteFlag,
}));

// Export direct access for non-React contexts
export const isAppBootComplete = () => bootCompleteFlag;
export const setAppBootComplete = (complete: boolean) => {
  bootCompleteFlag = complete;
  useAppReadyStore.setState({ isBootComplete: complete });
};
