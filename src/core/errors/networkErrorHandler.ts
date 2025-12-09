/**
 * src/core/errors/networkErrorHandler.ts
 *
 * Network-specific error handling utilities.
 * Bridges API errors with the centralized error system.
 */

import { AxiosError } from 'axios';
import { networkMonitor } from '../services/networkMonitor';
import { errorService } from './errorService';
import {
  AppError,
  NetworkErrorCode,
  AuthErrorCode,
  isAppError,
} from './types';

/**
 * Classify an Axios error and return an AppError
 */
export function classifyNetworkError(error: AxiosError, context?: string): AppError {
  // Check if already an AppError
  if (isAppError(error)) {
    return error;
  }

  // Check for offline state
  if (!networkMonitor.isConnected()) {
    return errorService.createError({
      code: NetworkErrorCode.OFFLINE,
      message: 'No internet connection',
      category: 'network',
      severity: 'medium',
      recovery: 'offline',
      context,
    });
  }

  // No response - network failure
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return errorService.createError({
        code: NetworkErrorCode.TIMEOUT,
        message: error.message || 'Request timed out',
        category: 'network',
        severity: 'medium',
        recovery: 'retry',
        cause: error,
        context,
      });
    }

    if (error.message.includes('ECONNREFUSED')) {
      return errorService.createError({
        code: NetworkErrorCode.CONNECTION_REFUSED,
        message: 'Server connection refused',
        category: 'network',
        severity: 'high',
        recovery: 'retry',
        cause: error,
        context,
      });
    }

    return errorService.createError({
      code: NetworkErrorCode.SERVER_ERROR,
      message: error.message || 'Network request failed',
      category: 'network',
      severity: 'medium',
      recovery: 'retry',
      cause: error,
      context,
    });
  }

  // Server responded with error
  const status = error.response.status;
  const responseMessage = (error.response.data as any)?.error || error.message;

  switch (status) {
    case 401:
      return errorService.createError({
        code: AuthErrorCode.TOKEN_EXPIRED,
        message: responseMessage || 'Authentication required',
        category: 'auth',
        severity: 'high',
        recovery: 'reauth',
        cause: error,
        details: { status },
        context,
      });

    case 403:
      return errorService.createError({
        code: AuthErrorCode.UNAUTHORIZED,
        message: responseMessage || 'Access denied',
        category: 'auth',
        severity: 'high',
        recovery: 'manual',
        cause: error,
        details: { status },
        context,
      });

    case 404:
      return errorService.createError({
        code: 'NOT_FOUND',
        message: responseMessage || 'Resource not found',
        category: 'network',
        severity: 'low',
        recovery: 'none',
        cause: error,
        details: { status },
        context,
      });

    case 408:
      return errorService.createError({
        code: NetworkErrorCode.TIMEOUT,
        message: responseMessage || 'Request timed out',
        category: 'network',
        severity: 'medium',
        recovery: 'retry',
        cause: error,
        details: { status },
        context,
      });

    case 429:
      return errorService.createError({
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        category: 'network',
        severity: 'medium',
        recovery: 'retry',
        cause: error,
        details: { status },
        context,
      });

    case 500:
    case 502:
    case 503:
    case 504:
      return errorService.createError({
        code: NetworkErrorCode.SERVER_ERROR,
        message: responseMessage || 'Server error',
        category: 'network',
        severity: 'high',
        recovery: 'retry',
        cause: error,
        details: { status },
        context,
      });

    default:
      return errorService.createError({
        code: `HTTP_${status}`,
        message: responseMessage || `HTTP error ${status}`,
        category: 'network',
        severity: status >= 500 ? 'high' : 'medium',
        recovery: 'retry',
        cause: error,
        details: { status },
        context,
      });
  }
}

/**
 * Wrapper for API calls that automatically handles and classifies errors
 */
export async function withNetworkErrorHandling<T>(
  operation: () => Promise<T>,
  options?: {
    context?: string;
    silent?: boolean;
    fallback?: T;
  }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const appError = classifyNetworkError(error as AxiosError, options?.context);

    // Handle through error service
    errorService.handle(appError, {
      silent: options?.silent,
      context: options?.context,
    });

    // Return fallback if provided
    if (options?.fallback !== undefined) {
      return options.fallback;
    }

    throw appError;
  }
}

/**
 * Check if we should attempt offline fallback
 */
export function shouldUseOfflineFallback(error: AppError): boolean {
  return (
    error.category === 'network' &&
    (error.code === NetworkErrorCode.OFFLINE ||
     error.code === NetworkErrorCode.TIMEOUT ||
     error.code === NetworkErrorCode.SERVER_ERROR)
  );
}

/**
 * Get a user-friendly network status message
 */
export function getNetworkStatusMessage(): string {
  const state = networkMonitor.getState();

  if (!state.isConnected) {
    return 'You are offline';
  }

  if (state.connectionType === 'cellular') {
    return 'Connected via cellular';
  }

  if (state.connectionType === 'wifi') {
    return 'Connected via WiFi';
  }

  return 'Connected';
}
