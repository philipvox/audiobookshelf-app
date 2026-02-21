/**
 * src/features/player/stores/playerHooks.ts
 *
 * Unified export of all player-related hooks.
 * This file provides a single import point for components.
 *
 * ARCHITECTURE:
 * Each hook is exported from its SOURCE store (single source of truth):
 * - Seeking hooks → seekingStore
 * - Speed hooks → speedStore
 * - Sleep timer hooks → sleepTimerStore
 * - Bookmark hooks → bookmarksStore
 * - Settings hooks → playerSettingsStore
 * - Completion hooks → completionSheetStore
 * - Core player hooks → playerStore
 * - Derived/computed hooks → playerSelectors
 *
 * Usage:
 *   import { useIsSeeking, usePlaybackRate, useSleepTimer } from '@/features/player/stores/playerHooks';
 */

// =============================================================================
// CORE PLAYER STATE (from playerStore)
// =============================================================================

export {
  usePlayerStore,
} from './playerStore';

// =============================================================================
// SEEKING STATE (from seekingStore - source of truth)
// =============================================================================

export {
  useSeekingStore,
  useIsSeeking,
  useSeekPosition,
  useSeekStartPosition,
  useSeekDirection,
  useSeekDelta,
  useSeekingState,
} from './seekingStore';

// =============================================================================
// SPEED STATE (from speedStore - source of truth)
// =============================================================================

export {
  useSpeedStore,
  usePlaybackRate,
  useGlobalDefaultRate,
  useBookSpeed,
  useHasCustomSpeed,
  useSpeedPresets,
} from './speedStore';

// =============================================================================
// SLEEP TIMER STATE (from sleepTimerStore - source of truth)
// =============================================================================

export {
  useSleepTimerStore,
  useSleepTimer,
  useIsSleepTimerActive,
  useShakeToExtendEnabled,
  useIsShakeDetectionActive,
  useSleepTimerState,
} from './sleepTimerStore';

// =============================================================================
// BOOKMARKS STATE (from bookmarksStore - source of truth)
// =============================================================================

export {
  useBookmarksStore,
  useBookmarks,
  useBookmarkCount,
  useBookmarkById,
  useBookmarksSortedByTime,
} from './bookmarksStore';

// =============================================================================
// SETTINGS STATE (from playerSettingsStore - source of truth)
// =============================================================================

export {
  usePlayerSettingsStore,
  useControlMode,
  useProgressMode,
  useSkipIntervals,
  usePlayerAppearance,
  useSmartRewindSettings,
} from './playerSettingsStore';

// =============================================================================
// COMPLETION SHEET STATE (from completionSheetStore - source of truth)
// =============================================================================

export {
  useCompletionSheetStore,
  useShowCompletionPrompt,
  useAutoMarkFinished,
  useIsCompletionSheetVisible,
  useCompletionSheetBook,
  useCompletionState,
} from './completionSheetStore';

// =============================================================================
// JOYSTICK SEEK STATE (from joystickSeekStore)
// =============================================================================

export {
  useJoystickSeekStore,
  useJoystickSeekSettings,
} from './joystickSeekStore';

// =============================================================================
// DERIVED/COMPUTED SELECTORS (from playerSelectors)
// These combine state from multiple stores
// =============================================================================

export {
  // Position
  useDisplayPosition,
  useEffectivePosition,
  usePositionState,

  // Progress
  useBookProgress,
  usePercentComplete,
  useTimeRemaining,
  useChapterProgress,

  // Chapters
  useCurrentChapterIndex,
  useCurrentChapter,
  useChapters,

  // Books
  useIsViewingDifferentBook,
  useViewingBook,
  usePlayingBook,

  // Playback
  usePlaybackState,
  usePlayerVisibility,
  useCurrentBookId,
} from './playerSelectors';
