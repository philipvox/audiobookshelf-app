/**
 * src/shared/stores/dnaSettingsStore.ts
 *
 * Store for BookDNA feature toggle.
 * Single boolean controls all DNA-powered features (mood chips, vibes, recommendations).
 *
 * Moved from features/profile/stores/ to shared/stores/ because it's consumed by
 * browse, search, library, recommendations, and profile features.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DNASettingsState {
  /** When false, all DNA-powered features are hidden/skipped */
  enableDNAFeatures: boolean;
  toggleDNAFeatures: () => void;
  setEnableDNAFeatures: (enabled: boolean) => void;
}

export const useDNASettingsStore = create<DNASettingsState>()(
  persist(
    (set, get) => ({
      enableDNAFeatures: true,

      toggleDNAFeatures: () => set({ enableDNAFeatures: !get().enableDNAFeatures }),
      setEnableDNAFeatures: (enabled) => set({ enableDNAFeatures: enabled }),
    }),
    {
      name: 'dna-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
