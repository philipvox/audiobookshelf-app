/**
 * src/core/errors/index.ts
 *
 * Error handling module exports
 */

// Types
export {
  type AppError,
  type ErrorCategory,
  type ErrorSeverity,
  type RecoveryStrategy,
  type ErrorCode,
  type ErrorHandler,
  type ErrorFilter,
  type CreateErrorOptions,
  isAppError,
  isNetworkError,
  isAuthError,
  isRecoverableError,
  NetworkErrorCode,
  AuthErrorCode,
  SyncErrorCode,
  DownloadErrorCode,
  PlaybackErrorCode,
  DatabaseErrorCode,
} from './types';

// Messages
export {
  errorMessages,
  getUserMessage,
  getRecoveryMessage,
  getCategoryMessage,
} from './errorMessages';

// Service
export {
  errorService,
  createError,
  wrapError,
  handleError,
  withRetry,
} from './errorService';

// Components
export { ErrorBoundary, withErrorBoundary } from './ErrorBoundary';

// Network error handling
export {
  classifyNetworkError,
  withNetworkErrorHandling,
  shouldUseOfflineFallback,
  getNetworkStatusMessage,
} from './networkErrorHandler';

// Sync error handling
export {
  classifySyncError,
  getSyncFailureReason,
  shouldRetrySyncError,
  getSyncRetryDelay,
  getSyncStatusMessage,
  resolveProgressConflict,
  type SyncFailureReason,
  type SyncItemStatus,
  type SyncStatus,
} from './syncErrorHandler';

// Download error handling
export {
  classifyDownloadError,
  getDownloadFailureType,
  shouldRetryDownload,
  getDownloadErrorAction,
  formatDownloadError,
  checkStorageForDownload,
  type DownloadFailureType,
} from './downloadErrorHandler';

// Playback error handling
export {
  classifyPlaybackError,
  getPlaybackFailureType,
  getPlaybackRecoveryAction,
  canAutoRecoverPlayback,
  formatPlaybackError,
  validateAudioFile,
  type PlaybackFailureType,
} from './playbackErrorHandler';

// Auth error handling
export {
  classifyAuthError,
  getAuthFailureType,
  requiresReauth,
  isLoginFailure,
  getAuthErrorAction,
  formatAuthError,
  createAuthErrorHandler,
  validateServerUrl,
  type AuthFailureType,
} from './authErrorHandler';

// Database error handling
export {
  classifyDatabaseError,
  getDatabaseFailureType,
  isDatabaseCritical,
  getDatabaseRecoveryAction,
  formatDatabaseError,
  withDatabaseErrorHandling,
  safeQuery,
  type DatabaseFailureType,
} from './databaseErrorHandler';

// UI Components
export {
  ErrorToast,
  ErrorSheet,
  ErrorProvider,
  useErrorDisplay,
  useShowError,
} from './components';
