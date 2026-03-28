/**
 * src/shared/utils/timeout.ts
 *
 * Timeout wrapper for async operations that can hang forever.
 * Rejects with a descriptive error if the promise doesn't resolve within the given time.
 */

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within `ms` milliseconds,
 * the returned promise rejects with an Error identifying the operation by `label`.
 *
 * The original promise is NOT cancelled (JavaScript has no way to cancel arbitrary promises),
 * but its result will be ignored if the timeout fires first.
 */
export const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
