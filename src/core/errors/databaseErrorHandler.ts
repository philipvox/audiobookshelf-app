/**
 * src/core/errors/databaseErrorHandler.ts
 *
 * Database-specific error handling utilities.
 * Handles SQLite errors and data recovery.
 */

import { errorService } from './errorService';
import { AppError, DatabaseErrorCode } from './types';

/**
 * Database failure type
 */
export type DatabaseFailureType =
  | 'open_failed'
  | 'query_failed'
  | 'write_failed'
  | 'migration_failed'
  | 'corrupted'
  | 'disk_full'
  | 'unknown';

/**
 * Classify a database error
 */
export function classifyDatabaseError(error: unknown, context?: string): AppError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Database open/connection errors
  if (
    lowerMessage.includes('open') ||
    lowerMessage.includes('connect') ||
    lowerMessage.includes('unable to open')
  ) {
    return errorService.createError({
      code: DatabaseErrorCode.OPEN_FAILED,
      message: errorMessage,
      category: 'database',
      severity: 'critical',
      recovery: 'manual',
      userMessage: 'Could not open database. Please restart the app.',
      context,
    });
  }

  // Corruption errors
  if (
    lowerMessage.includes('corrupt') ||
    lowerMessage.includes('malformed') ||
    lowerMessage.includes('not a database')
  ) {
    return errorService.createError({
      code: DatabaseErrorCode.CORRUPTED,
      message: errorMessage,
      category: 'database',
      severity: 'critical',
      recovery: 'manual',
      userMessage: 'Database corrupted. Data recovery may be needed.',
      context,
    });
  }

  // Migration errors
  if (
    lowerMessage.includes('migration') ||
    lowerMessage.includes('schema') ||
    lowerMessage.includes('alter table')
  ) {
    return errorService.createError({
      code: DatabaseErrorCode.MIGRATION_FAILED,
      message: errorMessage,
      category: 'database',
      severity: 'high',
      recovery: 'manual',
      userMessage: 'Database update failed. Please reinstall the app.',
      context,
    });
  }

  // Write errors
  if (
    lowerMessage.includes('insert') ||
    lowerMessage.includes('update') ||
    lowerMessage.includes('delete') ||
    lowerMessage.includes('write')
  ) {
    return errorService.createError({
      code: DatabaseErrorCode.WRITE_FAILED,
      message: errorMessage,
      category: 'database',
      severity: 'high',
      recovery: 'retry',
      userMessage: 'Could not save data. Please try again.',
      context,
    });
  }

  // Disk full
  if (
    lowerMessage.includes('disk') ||
    lowerMessage.includes('full') ||
    lowerMessage.includes('space') ||
    lowerMessage.includes('enospc')
  ) {
    return errorService.createError({
      code: 'DB_DISK_FULL',
      message: errorMessage,
      category: 'database',
      severity: 'high',
      recovery: 'manual',
      userMessage: 'Not enough storage space. Free up some space.',
      context,
    });
  }

  // Generic query error
  if (
    lowerMessage.includes('select') ||
    lowerMessage.includes('query') ||
    lowerMessage.includes('syntax')
  ) {
    return errorService.createError({
      code: DatabaseErrorCode.QUERY_FAILED,
      message: errorMessage,
      category: 'database',
      severity: 'medium',
      recovery: 'retry',
      userMessage: 'Data read error. Please try again.',
      context,
    });
  }

  // Default database error
  return errorService.createError({
    code: 'DB_ERROR',
    message: errorMessage,
    category: 'database',
    severity: 'high',
    recovery: 'retry',
    userMessage: 'Database error. Please restart the app.',
    cause: error instanceof Error ? error : undefined,
    context,
  });
}

/**
 * Determine failure type from error
 */
export function getDatabaseFailureType(error: AppError): DatabaseFailureType {
  switch (error.code) {
    case DatabaseErrorCode.OPEN_FAILED:
      return 'open_failed';
    case DatabaseErrorCode.QUERY_FAILED:
      return 'query_failed';
    case DatabaseErrorCode.WRITE_FAILED:
      return 'write_failed';
    case DatabaseErrorCode.MIGRATION_FAILED:
      return 'migration_failed';
    case DatabaseErrorCode.CORRUPTED:
      return 'corrupted';
    case 'DB_DISK_FULL':
      return 'disk_full';
    default:
      return 'unknown';
  }
}

/**
 * Check if database error is critical (app may not function)
 */
export function isDatabaseCritical(error: AppError): boolean {
  return (
    error.code === DatabaseErrorCode.OPEN_FAILED ||
    error.code === DatabaseErrorCode.CORRUPTED ||
    error.code === DatabaseErrorCode.MIGRATION_FAILED
  );
}

/**
 * Get recovery action for database error
 */
export function getDatabaseRecoveryAction(error: AppError): {
  action: 'retry' | 'restart' | 'clear_data' | 'reinstall';
  message: string;
  destructive: boolean;
} {
  switch (error.code) {
    case DatabaseErrorCode.OPEN_FAILED:
      return {
        action: 'restart',
        message: 'Restart the app',
        destructive: false,
      };
    case DatabaseErrorCode.CORRUPTED:
      return {
        action: 'clear_data',
        message: 'Clear app data (downloads will be kept)',
        destructive: true,
      };
    case DatabaseErrorCode.MIGRATION_FAILED:
      return {
        action: 'reinstall',
        message: 'Reinstall the app',
        destructive: true,
      };
    case DatabaseErrorCode.WRITE_FAILED:
    case DatabaseErrorCode.QUERY_FAILED:
      return {
        action: 'retry',
        message: 'Try again',
        destructive: false,
      };
    case 'DB_DISK_FULL':
      return {
        action: 'clear_data',
        message: 'Free up storage space',
        destructive: false,
      };
    default:
      return {
        action: 'restart',
        message: 'Restart the app',
        destructive: false,
      };
  }
}

/**
 * Format database error for display
 */
export function formatDatabaseError(error: AppError): {
  title: string;
  message: string;
  actionText: string;
  isDestructive: boolean;
} {
  const recovery = getDatabaseRecoveryAction(error);

  return {
    title: isDatabaseCritical(error) ? 'Critical Error' : 'Storage Error',
    message: error.userMessage,
    actionText: recovery.message,
    isDestructive: recovery.destructive,
  };
}

/**
 * Wrapper for database operations with error handling
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  options?: {
    context?: string;
    fallback?: T;
    silent?: boolean;
  }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const appError = classifyDatabaseError(error, options?.context);

    // Log the error
    if (!options?.silent) {
      errorService.handle(appError, { context: options?.context });
    }

    // Return fallback if provided
    if (options?.fallback !== undefined) {
      return options.fallback;
    }

    throw appError;
  }
}

/**
 * Safe database query with default value on error
 */
export async function safeQuery<T>(
  query: () => Promise<T>,
  defaultValue: T,
  context?: string
): Promise<T> {
  return withDatabaseErrorHandling(query, {
    fallback: defaultValue,
    context,
    silent: true,
  });
}
