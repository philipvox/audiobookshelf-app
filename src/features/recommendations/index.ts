export { usePreferencesStore, type UserPreferences } from './stores/preferencesStore';
export { useRecommendationsCacheStore } from './stores/recommendationsCacheStore';
export { useRecommendations } from './hooks/useRecommendations';
// Re-export dismissed items store (canonical location: @/shared/stores/dismissedItemsStore)
export {
  useDismissedItemsStore,
  useDismissedIds,
  useIsDismissed,
  useLastDismissed,
  useDismissedCount,
} from './stores/dismissedItemsStore';