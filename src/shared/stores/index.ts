/**
 * src/shared/stores/index.ts
 *
 * Re-export shared Zustand stores
 */

export * from './myLibraryStore';
export * from './dnaSettingsStore';

// Stores moved from features to shared (cross-feature consumption)
export * from './starPositionStore';
export * from './playlistSettingsStore';
export * from './dismissedItemsStore';
export * from './preferencesStore';
export * from './completionStore';

// Coach marks (first-run walkthrough)
export * from './coachMarksStore';

// Facade re-exports for player and queue stores
export * from './playerFacade';
export * from './queueFacade';
