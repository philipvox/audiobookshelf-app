/**
 * src/features/player/stores/index.ts
 *
 * Player stores facade - centralized exports for all player-related stores.
 *
 * ARCHITECTURE (Phase 10 refactor - Single Source of Truth):
 * - Each child store owns its state (seeking, speed, sleepTimer, etc.)
 * - playerHooks.ts provides unified hook exports from SOURCE stores
 * - playerSelectors.ts provides DERIVED selectors that combine multiple stores
 * - Components should import from this index or playerHooks.ts
 *
 * This eliminates bidirectional sync and race conditions.
 */

// =============================================================================
// TYPES (from source stores)
// =============================================================================

export type { Chapter } from './playerStore';
export type { Bookmark } from './bookmarksStore';
export type { SeekDirection } from './seekingStore';
export type { ControlMode, ProgressMode } from './playerSettingsStore';

// =============================================================================
// STORE ACCESS (for actions/imperative code)
// =============================================================================

export { usePlayerStore } from './playerStore';
export { usePlayerSettingsStore } from './playerSettingsStore';
export { useBookmarksStore } from './bookmarksStore';
export { useSleepTimerStore } from './sleepTimerStore';
export { useSpeedStore } from './speedStore';
export { useCompletionSheetStore } from './completionSheetStore';
export { useSeekingStore } from './seekingStore';
export { useJoystickSeekStore } from './joystickSeekStore';

// =============================================================================
// ALL HOOKS (from playerHooks.ts - unified export point)
// =============================================================================

export {
  // Core player
  usePlayerStore as usePlayerStoreHook,

  // Seeking (source: seekingStore)
  useSeekingStore as useSeekingStoreHook,
  useIsSeeking,
  useSeekPosition,
  useSeekStartPosition,
  useSeekDirection,
  useSeekDelta,
  useSeekingState,

  // Speed (source: speedStore)
  useSpeedStore as useSpeedStoreHook,
  usePlaybackRate,
  useGlobalDefaultRate,
  useBookSpeed,
  useHasCustomSpeed,
  useSpeedPresets,

  // Sleep timer (source: sleepTimerStore)
  useSleepTimerStore as useSleepTimerStoreHook,
  useSleepTimer,
  useIsSleepTimerActive,
  useShakeToExtendEnabled,
  useIsShakeDetectionActive,
  useSleepTimerState,

  // Bookmarks (source: bookmarksStore)
  useBookmarksStore as useBookmarksStoreHook,
  useBookmarks,
  useBookmarkCount,
  useBookmarkById,
  useBookmarksSortedByTime,

  // Settings (source: playerSettingsStore)
  usePlayerSettingsStore as usePlayerSettingsStoreHook,
  useControlMode,
  useProgressMode,
  useSkipIntervals,
  usePlayerAppearance,
  useSmartRewindSettings,

  // Completion (source: completionSheetStore)
  useCompletionSheetStore as useCompletionSheetStoreHook,
  useShowCompletionPrompt,
  useAutoMarkFinished,
  useIsCompletionSheetVisible,
  useCompletionSheetBook,
  useCompletionState,

  // Joystick seek (source: joystickSeekStore)
  useJoystickSeekStore as useJoystickSeekStoreHook,
  useJoystickSeekSettings,

  // Derived selectors (source: playerSelectors - combine multiple stores)
  useDisplayPosition,
  useEffectivePosition,
  usePositionState,
  useBookProgress,
  usePercentComplete,
  useTimeRemaining,
  useChapterProgress,
  useCurrentChapterIndex,
  useCurrentChapter,
  useChapters,
  useIsViewingDifferentBook,
  useViewingBook,
  usePlayingBook,
  usePlaybackState,
  usePlayerVisibility,
  useCurrentBookId,
} from './playerHooks';
