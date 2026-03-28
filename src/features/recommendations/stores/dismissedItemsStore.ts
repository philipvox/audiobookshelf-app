/**
 * src/features/recommendations/stores/dismissedItemsStore.ts
 *
 * Re-export shim — store moved to src/shared/stores/dismissedItemsStore.ts
 * Kept for backward compatibility with feature-internal imports.
 */
export {
  useDismissedItemsStore,
  useDismissedIds,
  useIsDismissed,
  useLastDismissed,
  useDismissedCount,
} from '@/shared/stores/dismissedItemsStore';
