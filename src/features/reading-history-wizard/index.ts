/**
 * src/features/reading-history-wizard/index.ts
 *
 * Public exports for the Mark Books Finished feature.
 * Uses Tinder-style swipe interface.
 */

// Screens
export { MarkBooksScreen } from './screens/MarkBooksScreen';
export { ReadingHistoryScreen } from './screens/ReadingHistoryScreen';

// Components
export { SwipeableBookCard } from './components/SwipeableBookCard';

// Store
export {
  useGalleryStore,
  useIsBookMarked,
  useMarkedCount,
  useCurrentView,
} from './stores/galleryStore';
export type { MarkedBook, UndoAction } from './stores/galleryStore';

// Hooks
export {
  useReadingHistory,
  useIsBookFinished,
  useFinishedCount,
} from './hooks/useReadingHistory';
export type { ReadingPreferences, PreferenceBoost } from './hooks/useReadingHistory';
