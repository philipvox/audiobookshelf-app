/**
 * src/features/completion/stores/completionStore.ts
 *
 * Re-export shim — store moved to src/shared/stores/completionStore.ts
 * Kept for backward compatibility with feature-internal imports.
 */
export {
  useCompletionStore,
  useIsComplete,
  useMarkComplete,
  useMarkIncomplete,
  useToggleComplete,
} from '@/shared/stores/completionStore';
