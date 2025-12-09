/**
 * src/core/errors/syncErrorHandler.ts
 *
 * Sync-specific error handling utilities.
 * Manages progress sync errors and retry logic.
 */

import { errorService } from './errorService';
import { AppError, SyncErrorCode, NetworkErrorCode } from './types';
import { networkMonitor } from '../services/networkMonitor';

/**
 * Sync failure reason
 */
export type SyncFailureReason =
  | 'offline'
  | 'timeout'
  | 'server_error'
  | 'conflict'
  | 'auth_expired'
  | 'unknown';

/**
 * Sync status for a single item
 */
export interface SyncItemStatus {
  itemId: string;
  isSynced: boolean;
  lastSyncAttempt: number | null;
  retryCount: number;
  failureReason: SyncFailureReason | null;
}

/**
 * Overall sync status
 */
export interface SyncStatus {
  isConnected: boolean;
  queueSize: number;
  lastSyncTime: number | null;
  failedCount: number;
  isSyncing: boolean;
}

/**
 * Classify a sync error
 */
export function classifySyncError(error: unknown, context?: string): AppError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Check for offline
  if (!networkMonitor.isConnected()) {
    return errorService.createError({
      code: NetworkErrorCode.OFFLINE,
      message: 'Cannot sync - no internet connection',
      category: 'sync',
      severity: 'low',
      recovery: 'offline',
      userMessage: 'Progress saved locally. Will sync when online.',
      context,
    });
  }

  // Conflict detection
  if (
    lowerMessage.includes('conflict') ||
    lowerMessage.includes('version') ||
    lowerMessage.includes('stale')
  ) {
    return errorService.createError({
      code: SyncErrorCode.CONFLICT,
      message: errorMessage,
      category: 'sync',
      severity: 'medium',
      recovery: 'manual',
      userMessage: 'Progress conflict detected. Using server version.',
      context,
    });
  }

  // Session expired (404)
  if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    return errorService.createError({
      code: 'SYNC_SESSION_EXPIRED',
      message: 'Sync session expired',
      category: 'sync',
      severity: 'low',
      recovery: 'retry',
      userMessage: 'Session expired. Retrying with direct sync.',
      context,
    });
  }

  // Server error
  if (
    lowerMessage.includes('500') ||
    lowerMessage.includes('server error') ||
    lowerMessage.includes('502') ||
    lowerMessage.includes('503')
  ) {
    return errorService.createError({
      code: SyncErrorCode.FAILED,
      message: errorMessage,
      category: 'sync',
      severity: 'medium',
      recovery: 'retry',
      userMessage: 'Sync failed. Will retry automatically.',
      context,
    });
  }

  // Default sync failure
  return errorService.createError({
    code: SyncErrorCode.FAILED,
    message: errorMessage,
    category: 'sync',
    severity: 'low',
    recovery: 'retry',
    userMessage: 'Progress sync failed. Will retry later.',
    cause: error instanceof Error ? error : undefined,
    context,
  });
}

/**
 * Determine failure reason from error
 */
export function getSyncFailureReason(error: AppError): SyncFailureReason {
  if (error.code === NetworkErrorCode.OFFLINE) return 'offline';
  if (error.code === NetworkErrorCode.TIMEOUT) return 'timeout';
  if (error.code === SyncErrorCode.CONFLICT) return 'conflict';
  if (error.code.startsWith('AUTH_')) return 'auth_expired';
  if (error.code === NetworkErrorCode.SERVER_ERROR) return 'server_error';
  return 'unknown';
}

/**
 * Check if sync should be retried based on error type
 */
export function shouldRetrySyncError(error: AppError): boolean {
  // Don't retry conflicts - need manual resolution
  if (error.code === SyncErrorCode.CONFLICT) return false;

  // Don't retry auth errors - need re-authentication
  if (error.category === 'auth') return false;

  // Retry network and server errors
  return error.recovery === 'retry' || error.recovery === 'offline';
}

/**
 * Calculate retry delay with exponential backoff
 */
export function getSyncRetryDelay(retryCount: number): number {
  const baseDelay = 2000; // 2 seconds
  const maxDelay = 60000; // 1 minute
  const delay = baseDelay * Math.pow(2, retryCount);
  return Math.min(delay, maxDelay);
}

/**
 * Create a user-friendly sync status message
 */
export function getSyncStatusMessage(status: SyncStatus): string {
  if (!status.isConnected) {
    return 'Offline - progress saved locally';
  }

  if (status.isSyncing) {
    return 'Syncing...';
  }

  if (status.failedCount > 0) {
    return `${status.failedCount} item${status.failedCount > 1 ? 's' : ''} waiting to sync`;
  }

  if (status.queueSize > 0) {
    return `${status.queueSize} item${status.queueSize > 1 ? 's' : ''} in sync queue`;
  }

  return 'All progress synced';
}

/**
 * Handle sync conflict by choosing the newer progress
 */
export function resolveProgressConflict(
  localProgress: { position: number; updatedAt: number },
  serverProgress: { position: number; updatedAt: number }
): 'local' | 'server' {
  // Simple strategy: use the most recent one
  // More sophisticated: use the one with higher position (further in book)

  // If server is more recent, use server
  if (serverProgress.updatedAt > localProgress.updatedAt) {
    return 'server';
  }

  // If local is more recent, use local
  if (localProgress.updatedAt > serverProgress.updatedAt) {
    return 'local';
  }

  // Same time - use the one with higher position
  return localProgress.position >= serverProgress.position ? 'local' : 'server';
}
