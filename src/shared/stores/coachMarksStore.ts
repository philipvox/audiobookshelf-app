/**
 * src/shared/stores/coachMarksStore.ts
 *
 * Persisted store tracking whether the user has seen the onboarding coach marks.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CoachMarksState {
  /** True after the user has completed or dismissed the walkthrough */
  hasSeenCoachMarks: boolean;
  /** Mark the walkthrough as completed */
  markAsSeen: () => void;
  /** Reset so the walkthrough shows again (dev/settings use) */
  reset: () => void;
}

export const useCoachMarksStore = create(
  persist<CoachMarksState>(
    (set) => ({
      hasSeenCoachMarks: false,
      markAsSeen: () => set({ hasSeenCoachMarks: true }),
      reset: () => set({ hasSeenCoachMarks: false }),
    }),
    {
      name: 'coach-marks-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
