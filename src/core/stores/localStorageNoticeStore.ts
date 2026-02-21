/**
 * src/core/stores/localStorageNoticeStore.ts
 *
 * Tracks whether user has seen the local storage notice.
 * Shows on fresh login and after app updates.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_VERSION } from '@/constants/version';

interface LocalStorageNoticeState {
  // User has dismissed with "Don't show again"
  neverShowAgain: boolean;
  // Last version user acknowledged the notice for
  lastAcknowledgedVersion: string | null;
  // Actions
  dismissNotice: (neverShow: boolean) => void;
  shouldShowNotice: () => boolean;
  reset: () => void;
}

export const useLocalStorageNoticeStore = create<LocalStorageNoticeState>()(
  persist(
    (set, get) => ({
      neverShowAgain: false,
      lastAcknowledgedVersion: null,

      dismissNotice: (neverShow: boolean) => {
        set({
          neverShowAgain: neverShow,
          lastAcknowledgedVersion: APP_VERSION,
        });
      },

      shouldShowNotice: () => {
        const state = get();

        // If user selected "never show again" AND current version matches, don't show
        if (state.neverShowAgain && state.lastAcknowledgedVersion === APP_VERSION) {
          return false;
        }

        // Show if never acknowledged (fresh install/login)
        if (!state.lastAcknowledgedVersion) {
          return true;
        }

        // Show if version changed (app update)
        // Compare major.minor only (e.g., 0.7.x -> 0.8.x triggers notice)
        const lastParts = state.lastAcknowledgedVersion.split('.');
        const currentParts = APP_VERSION.split('.');
        const lastMajorMinor = `${lastParts[0]}.${lastParts[1]}`;
        const currentMajorMinor = `${currentParts[0]}.${currentParts[1]}`;

        if (lastMajorMinor !== currentMajorMinor) {
          return true;
        }

        return false;
      },

      reset: () => {
        set({
          neverShowAgain: false,
          lastAcknowledgedVersion: null,
        });
      },
    }),
    {
      name: 'local-storage-notice',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
