/**
 * src/core/errors/playbackErrorHandler.ts
 *
 * Playback-specific error handling utilities.
 * Handles audio playback errors and recovery.
 */

import { errorService } from './errorService';
import { AppError, PlaybackErrorCode, NetworkErrorCode } from './types';

/**
 * Playback failure type
 */
export type PlaybackFailureType =
  | 'file_missing'
  | 'format_unsupported'
  | 'decode_error'
  | 'stream_error'
  | 'audio_session'
  | 'network_error'
  | 'unknown';

/**
 * Classify a playback error
 */
export function classifyPlaybackError(error: unknown, context?: string): AppError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // File not found
  if (
    lowerMessage.includes('not found') ||
    lowerMessage.includes('no such file') ||
    lowerMessage.includes('enoent')
  ) {
    return errorService.createError({
      code: PlaybackErrorCode.FILE_NOT_FOUND,
      message: errorMessage,
      category: 'playback',
      severity: 'high',
      recovery: 'manual',
      userMessage: 'Audio file not found. It may need to be downloaded again.',
      context,
    });
  }

  // Format/codec errors
  if (
    lowerMessage.includes('unsupported') ||
    lowerMessage.includes('codec') ||
    lowerMessage.includes('format')
  ) {
    return errorService.createError({
      code: PlaybackErrorCode.UNSUPPORTED_FORMAT,
      message: errorMessage,
      category: 'playback',
      severity: 'high',
      recovery: 'none',
      userMessage: 'This audio format is not supported on your device.',
      context,
    });
  }

  // Decode errors
  if (
    lowerMessage.includes('decode') ||
    lowerMessage.includes('corrupt') ||
    lowerMessage.includes('invalid')
  ) {
    return errorService.createError({
      code: PlaybackErrorCode.DECODE_ERROR,
      message: errorMessage,
      category: 'playback',
      severity: 'high',
      recovery: 'manual',
      userMessage: 'Could not decode audio. The file may be corrupted.',
      context,
    });
  }

  // Streaming errors
  if (
    lowerMessage.includes('stream') ||
    lowerMessage.includes('buffer') ||
    lowerMessage.includes('timeout')
  ) {
    return errorService.createError({
      code: PlaybackErrorCode.STREAM_ERROR,
      message: errorMessage,
      category: 'playback',
      severity: 'medium',
      recovery: 'retry',
      userMessage: 'Streaming error. Check your connection and try again.',
      context,
    });
  }

  // Audio session errors
  if (
    lowerMessage.includes('session') ||
    lowerMessage.includes('audio focus') ||
    lowerMessage.includes('audio service')
  ) {
    return errorService.createError({
      code: PlaybackErrorCode.AUDIO_SESSION,
      message: errorMessage,
      category: 'playback',
      severity: 'high',
      recovery: 'retry',
      userMessage: 'Audio playback failed. Please try again.',
      context,
    });
  }

  // Network-related playback errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('offline')
  ) {
    return errorService.createError({
      code: NetworkErrorCode.OFFLINE,
      message: errorMessage,
      category: 'playback',
      severity: 'medium',
      recovery: 'offline',
      userMessage: 'Cannot stream - no internet connection. Try playing downloaded books.',
      context,
    });
  }

  // Default playback error
  return errorService.createError({
    code: 'PLAYBACK_FAILED',
    message: errorMessage,
    category: 'playback',
    severity: 'medium',
    recovery: 'retry',
    userMessage: 'Playback error. Please try again.',
    cause: error instanceof Error ? error : undefined,
    context,
  });
}

/**
 * Determine failure type from error
 */
export function getPlaybackFailureType(error: AppError): PlaybackFailureType {
  switch (error.code) {
    case PlaybackErrorCode.FILE_NOT_FOUND:
      return 'file_missing';
    case PlaybackErrorCode.UNSUPPORTED_FORMAT:
      return 'format_unsupported';
    case PlaybackErrorCode.DECODE_ERROR:
      return 'decode_error';
    case PlaybackErrorCode.STREAM_ERROR:
      return 'stream_error';
    case PlaybackErrorCode.AUDIO_SESSION:
      return 'audio_session';
    case NetworkErrorCode.OFFLINE:
      return 'network_error';
    default:
      return 'unknown';
  }
}

/**
 * Get recovery action for playback error
 */
export function getPlaybackRecoveryAction(error: AppError): {
  action: 'retry' | 'redownload' | 'switch_offline' | 'restart_app' | 'none';
  message: string;
} {
  switch (error.code) {
    case PlaybackErrorCode.FILE_NOT_FOUND:
      return {
        action: 'redownload',
        message: 'Re-download the audiobook',
      };
    case PlaybackErrorCode.DECODE_ERROR:
      return {
        action: 'redownload',
        message: 'Re-download the audiobook',
      };
    case PlaybackErrorCode.UNSUPPORTED_FORMAT:
      return {
        action: 'none',
        message: 'This format is not supported',
      };
    case PlaybackErrorCode.STREAM_ERROR:
      return {
        action: 'retry',
        message: 'Check connection and retry',
      };
    case PlaybackErrorCode.AUDIO_SESSION:
      return {
        action: 'restart_app',
        message: 'Restart the app',
      };
    case NetworkErrorCode.OFFLINE:
      return {
        action: 'switch_offline',
        message: 'Play a downloaded book instead',
      };
    default:
      return {
        action: 'retry',
        message: 'Try again',
      };
  }
}

/**
 * Check if playback error can be automatically recovered
 */
export function canAutoRecoverPlayback(error: AppError, retryCount: number): boolean {
  const maxAutoRetries = 2;

  // Can't auto-recover these
  if (
    error.code === PlaybackErrorCode.FILE_NOT_FOUND ||
    error.code === PlaybackErrorCode.UNSUPPORTED_FORMAT ||
    error.code === PlaybackErrorCode.DECODE_ERROR
  ) {
    return false;
  }

  // Stream errors can be auto-recovered up to max retries
  if (error.code === PlaybackErrorCode.STREAM_ERROR) {
    return retryCount < maxAutoRetries;
  }

  // Audio session errors - try once
  if (error.code === PlaybackErrorCode.AUDIO_SESSION) {
    return retryCount === 0;
  }

  return false;
}

/**
 * Format playback error for display
 */
export function formatPlaybackError(error: AppError): {
  title: string;
  message: string;
  showRetry: boolean;
  showOfflineOption: boolean;
} {
  const recovery = getPlaybackRecoveryAction(error);

  return {
    title: 'Playback Error',
    message: error.userMessage,
    showRetry: recovery.action === 'retry' || recovery.action === 'redownload',
    showOfflineOption: recovery.action === 'switch_offline',
  };
}

/**
 * Validate audio file before playback
 */
export async function validateAudioFile(filePath: string): Promise<{
  valid: boolean;
  error?: AppError;
}> {
  try {
    const FileSystem = await import('expo-file-system/legacy');
    const info = await FileSystem.getInfoAsync(filePath);

    if (!info.exists) {
      return {
        valid: false,
        error: errorService.createError({
          code: PlaybackErrorCode.FILE_NOT_FOUND,
          message: `Audio file not found: ${filePath}`,
          category: 'playback',
          severity: 'high',
          recovery: 'manual',
          userMessage: 'Audio file not found. Please re-download.',
        }),
      };
    }

    // Check file size (very small files are likely corrupted)
    if (info.size !== undefined && info.size < 1000) {
      return {
        valid: false,
        error: errorService.createError({
          code: PlaybackErrorCode.DECODE_ERROR,
          message: `Audio file too small (${info.size} bytes)`,
          category: 'playback',
          severity: 'high',
          recovery: 'manual',
          userMessage: 'Audio file appears corrupted. Please re-download.',
        }),
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: classifyPlaybackError(error, 'validateAudioFile'),
    };
  }
}
