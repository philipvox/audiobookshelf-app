/**
 * src/shared/stores/playerFacade.ts
 *
 * Re-exports from the player feature for cross-feature consumption.
 * Other features should import player stores from here instead of
 * directly from @/features/player/stores/*.
 */

// Core stores
export { usePlayerStore } from '@/features/player/stores/playerStore';
export { usePlayerSettingsStore } from '@/features/player/stores/playerSettingsStore';
export { useSpeedStore } from '@/features/player/stores/speedStore';
export { useSleepTimerStore } from '@/features/player/stores/sleepTimerStore';
export { useCompletionSheetStore } from '@/features/player/stores/completionSheetStore';
export { useSeekingStore } from '@/features/player/stores/seekingStore';

// Speed selectors
export { usePlaybackRate } from '@/features/player/stores/speedStore';

// Derived selectors
export {
  useCurrentChapterIndex,
  useCurrentChapter,
  useTimeRemaining,
} from '@/features/player/stores/playerSelectors';

// Types
export type { Chapter } from '@/features/player/stores/playerStore';
export type { ControlMode, ProgressMode } from '@/features/player/stores/playerSettingsStore';
