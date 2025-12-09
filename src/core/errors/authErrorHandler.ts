/**
 * src/core/errors/authErrorHandler.ts
 *
 * Authentication-specific error handling utilities.
 * Handles token refresh, re-authentication, and session management.
 */

import { errorService } from './errorService';
import { AppError, AuthErrorCode } from './types';

/**
 * Auth failure type
 */
export type AuthFailureType =
  | 'token_expired'
  | 'token_invalid'
  | 'credentials_wrong'
  | 'session_expired'
  | 'server_error'
  | 'network_error'
  | 'unknown';

/**
 * Classify an auth error
 */
export function classifyAuthError(error: unknown, context?: string): AppError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Token expired
  if (
    lowerMessage.includes('expired') ||
    lowerMessage.includes('token is expired')
  ) {
    return errorService.createError({
      code: AuthErrorCode.TOKEN_EXPIRED,
      message: errorMessage,
      category: 'auth',
      severity: 'high',
      recovery: 'reauth',
      userMessage: 'Your session has expired. Please log in again.',
      context,
    });
  }

  // Invalid token
  if (
    lowerMessage.includes('invalid token') ||
    lowerMessage.includes('malformed') ||
    lowerMessage.includes('jwt')
  ) {
    return errorService.createError({
      code: AuthErrorCode.TOKEN_INVALID,
      message: errorMessage,
      category: 'auth',
      severity: 'high',
      recovery: 'reauth',
      userMessage: 'Invalid session. Please log in again.',
      context,
    });
  }

  // Unauthorized (401)
  if (
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('401')
  ) {
    return errorService.createError({
      code: AuthErrorCode.UNAUTHORIZED,
      message: errorMessage,
      category: 'auth',
      severity: 'high',
      recovery: 'reauth',
      userMessage: 'You are not logged in. Please log in.',
      context,
    });
  }

  // Wrong credentials
  if (
    lowerMessage.includes('wrong') ||
    lowerMessage.includes('incorrect') ||
    lowerMessage.includes('invalid credentials') ||
    lowerMessage.includes('password')
  ) {
    return errorService.createError({
      code: AuthErrorCode.LOGIN_FAILED,
      message: errorMessage,
      category: 'auth',
      severity: 'medium',
      recovery: 'manual',
      userMessage: 'Invalid username or password. Please try again.',
      context,
    });
  }

  // Session expired
  if (
    lowerMessage.includes('session') &&
    (lowerMessage.includes('expired') || lowerMessage.includes('invalid'))
  ) {
    return errorService.createError({
      code: AuthErrorCode.SESSION_EXPIRED,
      message: errorMessage,
      category: 'auth',
      severity: 'high',
      recovery: 'reauth',
      userMessage: 'Your session has expired. Please log in again.',
      context,
    });
  }

  // Default auth error
  return errorService.createError({
    code: 'AUTH_FAILED',
    message: errorMessage,
    category: 'auth',
    severity: 'high',
    recovery: 'reauth',
    userMessage: 'Authentication failed. Please log in again.',
    cause: error instanceof Error ? error : undefined,
    context,
  });
}

/**
 * Determine failure type from error
 */
export function getAuthFailureType(error: AppError): AuthFailureType {
  switch (error.code) {
    case AuthErrorCode.TOKEN_EXPIRED:
      return 'token_expired';
    case AuthErrorCode.TOKEN_INVALID:
      return 'token_invalid';
    case AuthErrorCode.LOGIN_FAILED:
      return 'credentials_wrong';
    case AuthErrorCode.SESSION_EXPIRED:
      return 'session_expired';
    case AuthErrorCode.UNAUTHORIZED:
      return 'token_expired'; // Treat as token expired
    default:
      return 'unknown';
  }
}

/**
 * Check if error requires re-authentication
 */
export function requiresReauth(error: AppError): boolean {
  return error.category === 'auth' && error.recovery === 'reauth';
}

/**
 * Check if error is a login failure (wrong credentials)
 */
export function isLoginFailure(error: AppError): boolean {
  return error.code === AuthErrorCode.LOGIN_FAILED;
}

/**
 * Get user action for auth error
 */
export function getAuthErrorAction(error: AppError): {
  action: 'login' | 'retry_login' | 'contact_admin';
  buttonText: string;
} {
  if (error.code === AuthErrorCode.LOGIN_FAILED) {
    return {
      action: 'retry_login',
      buttonText: 'Try Again',
    };
  }

  if (requiresReauth(error)) {
    return {
      action: 'login',
      buttonText: 'Log In',
    };
  }

  return {
    action: 'contact_admin',
    buttonText: 'Contact Support',
  };
}

/**
 * Format auth error for display
 */
export function formatAuthError(error: AppError): {
  title: string;
  message: string;
  actionText: string;
  showLogout: boolean;
} {
  const action = getAuthErrorAction(error);

  return {
    title: error.code === AuthErrorCode.LOGIN_FAILED ? 'Login Failed' : 'Session Expired',
    message: error.userMessage,
    actionText: action.buttonText,
    showLogout: error.code !== AuthErrorCode.LOGIN_FAILED,
  };
}

/**
 * Create a callback that handles auth errors and triggers re-auth
 */
export function createAuthErrorHandler(onRequireLogin: () => void) {
  return (error: AppError) => {
    if (requiresReauth(error)) {
      onRequireLogin();
    }
  };
}

/**
 * Validate server URL format
 */
export function validateServerUrl(url: string): {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
} {
  // Remove trailing slashes
  let normalizedUrl = url.trim().replace(/\/+$/, '');

  // Check for empty
  if (!normalizedUrl) {
    return { valid: false, error: 'Server address is required' };
  }

  // Add https:// if no protocol specified
  if (!normalizedUrl.match(/^https?:\/\//i)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  // Basic URL validation
  try {
    const parsed = new URL(normalizedUrl);

    // Check for valid protocol
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Invalid protocol. Use http:// or https://' };
    }

    return { valid: true, normalizedUrl };
  } catch {
    return { valid: false, error: 'Invalid server address format' };
  }
}
