/**
 * src/features/mood-discovery/stores/moodSessionStore.ts
 *
 * Store for ephemeral mood-based discovery sessions.
 * Sessions expire after 24 hours - this is "What do you want RIGHT NOW?"
 * not permanent profile data.
 *
 * Supports the 4-step discovery quiz:
 * 1. Mood (required) - What emotional experience
 * 2. Pace (optional) - How fast it moves
 * 3. Weight (optional) - How emotionally demanding
 * 4. World (optional) - Setting type
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Mood,
  Pace,
  Weight,
  World,
  LengthPreference,
  MoodSession,
  QuizStep,
  QuizDraft,
  INITIAL_QUIZ_DRAFT,
  SESSION_DURATION_MS,
} from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface MoodSessionState {
  /** Current mood session (null if none or expired) */
  session: MoodSession | null;

  /** Draft state while user is going through the quiz */
  draft: QuizDraft;

  // Quiz Navigation Actions
  /** Set the mood selection */
  setMood: (mood: Mood) => void;
  /** Set the pace selection */
  setPace: (pace: Pace) => void;
  /** Set the weight selection */
  setWeight: (weight: Weight) => void;
  /** Set the world selection */
  setWorld: (world: World) => void;
  /** Go to next step */
  nextStep: () => void;
  /** Go to previous step */
  prevStep: () => void;
  /** Jump to specific step */
  goToStep: (step: QuizStep) => void;
  /** Reset draft to initial state */
  resetDraft: () => void;

  // Session Actions
  /** Commit draft to active session (starts 24hr expiry) */
  commitSession: () => void;
  /** Clear the active session */
  clearSession: () => void;
  /** Check if session is expired and clear if so */
  validateSession: () => boolean;
  /** Get remaining time on session in ms (0 if expired/none) */
  getTimeRemaining: () => number;
  /** Update session with quick-tune adjustments */
  quickTune: (updates: Partial<Pick<MoodSession, 'mood' | 'pace' | 'weight' | 'world' | 'length'>>) => void;
  /** Set length preference (can be adjusted on results) */
  setLength: (length: LengthPreference) => void;
}

// ============================================================================
// STORE
// ============================================================================

export const useMoodSessionStore = create<MoodSessionState>()(
  persist(
    (set, get) => ({
      session: null,
      draft: { ...INITIAL_QUIZ_DRAFT },

      // Quiz Navigation
      setMood: (mood) => {
        const { draft } = get();
        set({ draft: { ...draft, mood } });
      },

      setPace: (pace) => {
        const { draft } = get();
        set({ draft: { ...draft, pace } });
      },

      setWeight: (weight) => {
        const { draft } = get();
        set({ draft: { ...draft, weight } });
      },

      setWorld: (world) => {
        const { draft } = get();
        set({ draft: { ...draft, world } });
      },

      nextStep: () => {
        const { draft } = get();
        if (draft.currentStep < 4) {
          set({ draft: { ...draft, currentStep: (draft.currentStep + 1) as QuizStep } });
        }
      },

      prevStep: () => {
        const { draft } = get();
        if (draft.currentStep > 1) {
          set({ draft: { ...draft, currentStep: (draft.currentStep - 1) as QuizStep } });
        }
      },

      goToStep: (step) => {
        const { draft } = get();
        set({ draft: { ...draft, currentStep: step } });
      },

      resetDraft: () => {
        set({ draft: { ...INITIAL_QUIZ_DRAFT } });
      },

      // Session Actions
      commitSession: () => {
        const { draft } = get();
        if (!draft.mood) return; // Mood is required

        const now = Date.now();
        const session: MoodSession = {
          mood: draft.mood,
          pace: draft.pace,
          weight: draft.weight,
          world: draft.world,
          length: 'any', // Default, can be adjusted on results
          createdAt: now,
          expiresAt: now + SESSION_DURATION_MS,
        };
        set({ session, draft: { ...INITIAL_QUIZ_DRAFT } });
      },

      clearSession: () => {
        set({ session: null });
      },

      validateSession: () => {
        const { session } = get();
        if (!session) return false;

        const now = Date.now();
        if (now >= session.expiresAt) {
          set({ session: null });
          return false;
        }
        return true;
      },

      getTimeRemaining: () => {
        const { session } = get();
        if (!session) return 0;

        const remaining = session.expiresAt - Date.now();
        return Math.max(0, remaining);
      },

      quickTune: (updates) => {
        const { session } = get();
        if (!session) return;

        // Quick tune extends the session by resetting expiry
        const now = Date.now();
        set({
          session: {
            ...session,
            ...updates,
            expiresAt: now + SESSION_DURATION_MS,
          },
        });
      },

      setLength: (length) => {
        const { session } = get();
        if (session) {
          set({ session: { ...session, length } });
        }
      },
    }),
    {
      name: 'mood-session-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the session, not the draft
      partialize: (state) => ({ session: state.session }),
      // On rehydration, validate session expiry
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.validateSession();
        }
      },
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

/** Check if there's an active (non-expired) session */
export const useHasActiveSession = () =>
  useMoodSessionStore((state) => {
    if (!state.session) return false;
    return Date.now() < state.session.expiresAt;
  });

/** Get the active session (returns null if expired) */
export const useActiveSession = () =>
  useMoodSessionStore((state) => {
    if (!state.session) return null;
    if (Date.now() >= state.session.expiresAt) return null;
    return state.session;
  });

/** Get draft state for the discovery UI */
export const useMoodDraft = () =>
  useMoodSessionStore(
    useShallow((state) => state.draft)
  );

/** Get quiz navigation actions */
export const useQuizActions = () =>
  useMoodSessionStore(
    useShallow((state) => ({
      setMood: state.setMood,
      setPace: state.setPace,
      setWeight: state.setWeight,
      setWorld: state.setWorld,
      nextStep: state.nextStep,
      prevStep: state.prevStep,
      goToStep: state.goToStep,
      resetDraft: state.resetDraft,
      commitSession: state.commitSession,
    }))
  );

/** Get draft actions (legacy compatibility) */
export const useMoodDraftActions = () =>
  useMoodSessionStore(
    useShallow((state) => ({
      toggleVibe: state.setMood, // Legacy: now single-select mood
      setLength: state.setLength,
      setWorld: state.setWorld,
      resetDraft: state.resetDraft,
      commitSession: state.commitSession,
    }))
  );

/** Get session info for display */
export const useSessionInfo = () =>
  useMoodSessionStore(
    useShallow((state) => ({
      hasSession: state.session !== null && Date.now() < (state.session?.expiresAt ?? 0),
      expiresAt: state.session?.expiresAt ?? 0,
      clearSession: state.clearSession,
      quickTune: state.quickTune,
    }))
  );

/** Calculate time remaining from expiresAt - use this in components */
export function getTimeRemainingFromExpiry(expiresAt: number): number {
  if (!expiresAt) return 0;
  return Math.max(0, expiresAt - Date.now());
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format remaining time as human-readable string
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

/**
 * Check if a session has enough preferences to show results
 */
export function isSessionValid(session: MoodSession | null): boolean {
  if (!session) return false;
  if (Date.now() >= session.expiresAt) return false;
  // Must have a mood selected
  return session.mood !== null;
}

/**
 * Get a display label for the current session
 */
export function getSessionDisplayLabel(session: MoodSession): string {
  const parts: string[] = [];

  // Add mood
  const moodLabels: Record<Mood, string> = {
    comfort: 'Comfort',
    thrills: 'Thrills',
    escape: 'Escape',
    laughs: 'Laughs',
    feels: 'Feels',
    thinking: 'Thinking',
  };
  parts.push(moodLabels[session.mood]);

  // Add non-default preferences
  if (session.pace !== 'any') {
    const paceLabels: Record<Pace, string> = {
      slow: 'Slow',
      steady: 'Steady',
      fast: 'Fast',
      any: '',
    };
    parts.push(paceLabels[session.pace]);
  }

  if (session.weight !== 'any') {
    const weightLabels: Record<Weight, string> = {
      light: 'Light',
      balanced: 'Balanced',
      heavy: 'Heavy',
      any: '',
    };
    parts.push(weightLabels[session.weight]);
  }

  if (session.world !== 'any') {
    const worldLabels: Record<World, string> = {
      contemporary: 'Contemporary',
      historical: 'Historical',
      fantasy: 'Fantasy',
      scifi: 'Sci-Fi',
      any: '',
    };
    parts.push(worldLabels[session.world]);
  }

  return parts.filter(Boolean).join(' + ');
}
