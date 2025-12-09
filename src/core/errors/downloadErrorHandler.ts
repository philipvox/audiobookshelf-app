/**
 * src/core/errors/downloadErrorHandler.ts
 *
 * Download-specific error handling utilities.
 * Classifies and handles download errors.
 */

import { errorService } from './errorService';
import { AppError, DownloadErrorCode, NetworkErrorCode } from './types';
import { networkMonitor } from '../services/networkMonitor';

/**
 * Download failure type
 */
export type DownloadFailureType =
  | 'storage_full'
  | 'file_not_found'
  | 'network_error'
  | 'timeout'
  | 'auth_error'
  | 'corrupted'
  | 'interrupted'
  | 'unknown';

/**
 * Classify a download error
 */
export function classifyDownloadError(error: unknown, context?: string): AppError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Check for offline
  if (!networkMonitor.isConnected()) {
    return errorService.createError({
      code: NetworkErrorCode.OFFLINE,
      message: 'Cannot download - no internet connection',
      category: 'download',
      severity: 'medium',
      recovery: 'offline',
      userMessage: 'Download paused. Will resume when online.',
      context,
    });
  }

  // Storage full
  if (
    lowerMessage.includes('storage') ||
    lowerMessage.includes('disk') ||
    lowerMessage.includes('space') ||
    lowerMessage.includes('quota') ||
    lowerMessage.includes('enospc')
  ) {
    return errorService.createError({
      code: DownloadErrorCode.STORAGE_FULL,
      message: errorMessage,
      category: 'download',
      severity: 'high',
      recovery: 'manual',
      userMessage: 'Not enough storage space. Free up some space and try again.',
      context,
    });
  }

  // File not found (404)
  if (
    lowerMessage.includes('not found') ||
    lowerMessage.includes('404') ||
    lowerMessage.includes('no audio files')
  ) {
    return errorService.createError({
      code: DownloadErrorCode.FILE_NOT_FOUND,
      message: errorMessage,
      category: 'download',
      severity: 'medium',
      recovery: 'none',
      userMessage: 'File not found on server. It may have been removed.',
      context,
    });
  }

  // Timeout
  if (
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('timed out') ||
    lowerMessage.includes('econnaborted')
  ) {
    return errorService.createError({
      code: NetworkErrorCode.TIMEOUT,
      message: errorMessage,
      category: 'download',
      severity: 'medium',
      recovery: 'retry',
      userMessage: 'Download timed out. Tap to resume.',
      context,
    });
  }

  // Auth error
  if (
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('401') ||
    lowerMessage.includes('not authenticated')
  ) {
    return errorService.createError({
      code: 'DOWNLOAD_AUTH_FAILED',
      message: errorMessage,
      category: 'download',
      severity: 'high',
      recovery: 'reauth',
      userMessage: 'Authentication failed. Please log in again.',
      context,
    });
  }

  // Network/connection errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('econnreset')
  ) {
    return errorService.createError({
      code: DownloadErrorCode.INTERRUPTED,
      message: errorMessage,
      category: 'download',
      severity: 'medium',
      recovery: 'retry',
      userMessage: 'Download interrupted. Tap to resume.',
      context,
    });
  }

  // Default download error
  return errorService.createError({
    code: 'DOWNLOAD_FAILED',
    message: errorMessage,
    category: 'download',
    severity: 'medium',
    recovery: 'retry',
    userMessage: 'Download failed. Tap to retry.',
    cause: error instanceof Error ? error : undefined,
    context,
  });
}

/**
 * Determine failure type from error
 */
export function getDownloadFailureType(error: AppError): DownloadFailureType {
  switch (error.code) {
    case DownloadErrorCode.STORAGE_FULL:
      return 'storage_full';
    case DownloadErrorCode.FILE_NOT_FOUND:
      return 'file_not_found';
    case NetworkErrorCode.OFFLINE:
    case NetworkErrorCode.SERVER_ERROR:
      return 'network_error';
    case NetworkErrorCode.TIMEOUT:
      return 'timeout';
    case DownloadErrorCode.INTERRUPTED:
      return 'interrupted';
    case DownloadErrorCode.CORRUPTED:
      return 'corrupted';
    default:
      if (error.code.includes('AUTH')) return 'auth_error';
      return 'unknown';
  }
}

/**
 * Check if download should be retried based on error type
 */
export function shouldRetryDownload(error: AppError, retryCount: number): boolean {
  const maxRetries = 3;

  // Don't retry if max retries reached
  if (retryCount >= maxRetries) return false;

  // Don't retry these errors
  if (
    error.code === DownloadErrorCode.STORAGE_FULL ||
    error.code === DownloadErrorCode.FILE_NOT_FOUND ||
    error.code === DownloadErrorCode.PERMISSION_DENIED ||
    error.category === 'auth'
  ) {
    return false;
  }

  // Retry network and timeout errors
  return error.recovery === 'retry';
}

/**
 * Get user action message for download error
 */
export function getDownloadErrorAction(error: AppError): string {
  switch (error.code) {
    case DownloadErrorCode.STORAGE_FULL:
      return 'Free up storage space';
    case DownloadErrorCode.FILE_NOT_FOUND:
      return 'Remove from queue';
    case NetworkErrorCode.OFFLINE:
      return 'Check connection';
    case DownloadErrorCode.INTERRUPTED:
      return 'Tap to resume';
    default:
      if (error.recovery === 'reauth') return 'Log in again';
      if (error.recovery === 'retry') return 'Tap to retry';
      return '';
  }
}

/**
 * Format download error for display
 */
export function formatDownloadError(error: AppError): {
  title: string;
  message: string;
  action: string;
  canRetry: boolean;
} {
  return {
    title: 'Download Failed',
    message: error.userMessage,
    action: getDownloadErrorAction(error),
    canRetry: error.recovery === 'retry' || error.recovery === 'offline',
  };
}

/**
 * Check available storage before download
 */
export async function checkStorageForDownload(requiredBytes: number): Promise<{
  hasSpace: boolean;
  availableBytes: number;
  message?: string;
}> {
  try {
    const FileSystem = await import('expo-file-system/legacy');
    const info = await FileSystem.getFreeDiskStorageAsync();

    // Require 100MB buffer plus required space
    const buffer = 100 * 1024 * 1024; // 100MB
    const hasSpace = info > requiredBytes + buffer;

    return {
      hasSpace,
      availableBytes: info,
      message: hasSpace
        ? undefined
        : `Not enough space. Need ${formatBytes(requiredBytes)}, only ${formatBytes(info)} available.`,
    };
  } catch (error) {
    // Can't check storage - assume OK
    return { hasSpace: true, availableBytes: 0 };
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
