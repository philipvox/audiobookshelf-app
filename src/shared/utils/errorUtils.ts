/**
 * src/shared/utils/errorUtils.ts
 *
 * Utilities for safely handling unknown error types.
 * Replaces `catch (error: any)` with type-safe alternatives.
 */

/**
 * Safely extracts error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unknown error occurred';
}

/**
 * Safely extracts error for logging (includes stack trace if available)
 */
export function getErrorForLogging(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: getErrorMessage(error) };
}

/**
 * Type guard for checking if error is an API error with status code
 */
export function isApiError(error: unknown): error is { status: number; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'message' in error &&
    typeof (error as Record<string, unknown>).status === 'number'
  );
}

/**
 * Type guard for network errors
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('Network request failed') ||
      error.message.includes('timeout') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('Failed to fetch')
    );
  }
  return false;
}

/**
 * Type guard for abort errors (cancelled requests)
 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message.includes('aborted');
  }
  return false;
}

/**
 * Wraps an async function with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  fallback: T,
  onError?: (error: unknown) => void
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    onError?.(error);
    return fallback;
  }
}

/**
 * Creates a typed error handler for consistent error logging
 */
export function createErrorHandler(context: string) {
  return (error: unknown, action?: string) => {
    const msg = getErrorMessage(error);
    const actionStr = action ? ` during ${action}` : '';
    console.error(`[${context}] Error${actionStr}: ${msg}`);
    return msg;
  };
}
