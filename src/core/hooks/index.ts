export { useAppBootstrap } from './useAppBootstrap';
export { useLibraryPrefetch } from './useLibraryPrefetch';
export {
  useOptimisticMutation,
  useOptimisticProgress,
  useOptimisticCollection,
} from './useOptimisticMutation';

// Offline-first hooks
export { useSyncStatus } from './useSyncStatus';
export type { SyncStatus } from './useSyncStatus';
export {
  useDownloads,
  useDownloadStatus,
  useDownloadProgress,
  useIsOfflineAvailable,
} from './useDownloads';