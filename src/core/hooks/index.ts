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

// Unified user book data hooks (single source of truth)
export {
  // Query keys
  userBooksKeys,
  // Single book hooks
  useUserBook,
  useBookProgress,
  useIsFavorite,
  useIsFinished,
  useBookPlaybackSpeed,
  // Collection hooks
  useFavoriteBooks,
  useFinishedBooks,
  useInProgressBooks,
  useUnsyncedBooks,
  // Mutation hooks
  useUpdateProgress,
  useToggleFavorite,
  useMarkFinished,
  useSetPlaybackSpeed,
  useUpdateUserBook,
  useMarkSynced,
  // Combined hooks
  useBookStatus,
  useBookActions,
  useUserBookCounts,
} from './useUserBooks';