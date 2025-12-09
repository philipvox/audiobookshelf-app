/**
 * src/core/errors/errorMessages.ts
 *
 * User-friendly error messages mapped to error codes.
 * Provides consistent, helpful messages across the app.
 */

import {
  NetworkErrorCode,
  AuthErrorCode,
  SyncErrorCode,
  DownloadErrorCode,
  PlaybackErrorCode,
  DatabaseErrorCode,
} from './types';

/**
 * User-friendly error messages for each error code
 */
export const errorMessages: Record<string, string> = {
  // Network errors
  [NetworkErrorCode.OFFLINE]: 'No internet connection. Check your network settings.',
  [NetworkErrorCode.TIMEOUT]: 'Request timed out. Please try again.',
  [NetworkErrorCode.SERVER_ERROR]: 'Server is temporarily unavailable. Please try again later.',
  [NetworkErrorCode.DNS_FAILURE]: 'Could not connect to server. Check your server address.',
  [NetworkErrorCode.CONNECTION_REFUSED]: 'Server refused connection. Is the server running?',
  [NetworkErrorCode.SSL_ERROR]: 'Secure connection failed. Check your server certificate.',

  // Auth errors
  [AuthErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [AuthErrorCode.TOKEN_INVALID]: 'Invalid credentials. Please log in again.',
  [AuthErrorCode.UNAUTHORIZED]: 'You are not authorized to perform this action.',
  [AuthErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  [AuthErrorCode.LOGIN_FAILED]: 'Login failed. Please check your credentials.',

  // Sync errors
  [SyncErrorCode.CONFLICT]: 'Progress conflict detected. Using most recent version.',
  [SyncErrorCode.FAILED]: 'Could not sync progress. Will retry automatically.',
  [SyncErrorCode.PARTIAL]: 'Some items failed to sync. Will retry later.',
  [SyncErrorCode.QUEUE_FULL]: 'Too many pending syncs. Please wait for sync to complete.',

  // Download errors
  [DownloadErrorCode.STORAGE_FULL]: 'Not enough storage space. Free up some space and try again.',
  [DownloadErrorCode.FILE_NOT_FOUND]: 'File not found on server. It may have been removed.',
  [DownloadErrorCode.INTERRUPTED]: 'Download interrupted. Tap to resume.',
  [DownloadErrorCode.CORRUPTED]: 'Download corrupted. Please try again.',
  [DownloadErrorCode.PERMISSION_DENIED]: 'Storage permission required to download files.',

  // Playback errors
  [PlaybackErrorCode.FILE_NOT_FOUND]: 'Audio file not found. It may need to be downloaded again.',
  [PlaybackErrorCode.UNSUPPORTED_FORMAT]: 'Audio format not supported.',
  [PlaybackErrorCode.DECODE_ERROR]: 'Could not decode audio. The file may be corrupted.',
  [PlaybackErrorCode.STREAM_ERROR]: 'Streaming error. Check your connection and try again.',
  [PlaybackErrorCode.AUDIO_SESSION]: 'Audio playback failed. Please restart the app.',

  // Database errors
  [DatabaseErrorCode.OPEN_FAILED]: 'Could not open database. Please restart the app.',
  [DatabaseErrorCode.QUERY_FAILED]: 'Data read error. Please restart the app.',
  [DatabaseErrorCode.WRITE_FAILED]: 'Could not save data. Please try again.',
  [DatabaseErrorCode.MIGRATION_FAILED]: 'Database update failed. Please reinstall the app.',
  [DatabaseErrorCode.CORRUPTED]: 'Database corrupted. Data recovery in progress.',
};

/**
 * Get user-friendly message for an error code
 */
export function getUserMessage(code: string): string {
  return errorMessages[code] || 'An unexpected error occurred. Please try again.';
}

/**
 * Recovery action messages
 */
export const recoveryMessages: Record<string, string> = {
  retry: 'Tap to retry',
  offline: 'Working offline',
  reauth: 'Tap to log in',
  manual: 'Action required',
  none: '',
};

/**
 * Get recovery action message
 */
export function getRecoveryMessage(recovery: string): string {
  return recoveryMessages[recovery] || '';
}

/**
 * Category-level fallback messages
 */
export const categoryMessages: Record<string, string> = {
  network: 'Network error. Check your connection.',
  auth: 'Authentication error. Please log in again.',
  sync: 'Sync error. Changes will be synced later.',
  download: 'Download error. Please try again.',
  playback: 'Playback error. Please try again.',
  database: 'Storage error. Please restart the app.',
  validation: 'Invalid data. Please check your input.',
  unknown: 'An unexpected error occurred.',
};

/**
 * Get fallback message for a category
 */
export function getCategoryMessage(category: string): string {
  return categoryMessages[category] || categoryMessages.unknown;
}
