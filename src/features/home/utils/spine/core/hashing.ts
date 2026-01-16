/**
 * src/features/home/utils/spine/core/hashing.ts
 *
 * Deterministic hashing utilities for consistent randomization.
 * Same input always produces same output - ensures UI consistency.
 */

/**
 * Generate a deterministic hash from a string using djb2 algorithm.
 * This is a fast, simple hash that provides good distribution.
 *
 * @example
 * hashString("book-123") // Always returns same number
 * hashString("book-123") === hashString("book-123") // true
 */
export function hashString(str: string): number {
  if (!str) return 0;

  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) + hash) ^ char; // hash * 33 ^ char
  }

  return Math.abs(hash);
}

/**
 * Generate a seeded random number in range [min, max].
 * Uses Linear Congruential Generator (LCG) for deterministic randomness.
 *
 * @example
 * seededRandom(12345, 1, 10) // Always returns same value
 * seededRandom(12345, 0, 100) // Deterministic percentage
 */
export function seededRandom(seed: number, min: number, max: number): number {
  // LCG parameters (Numerical Recipes)
  const a = 1664525;
  const c = 1013904223;
  const m = Math.pow(2, 32);

  const next = (a * seed + c) % m;
  const normalized = next / m;

  return Math.floor(min + normalized * (max - min + 1));
}

/**
 * Generate a deterministic percentage from 0-100 based on string.
 * Useful for probability checks.
 *
 * @example
 * hashToPercent("book-123") // Returns number 0-100
 * hashToPercent("book-123") < 25 // 25% probability check
 */
export function hashToPercent(str: string): number {
  const hash = hashString(str);
  return hash % 101; // 0-100 inclusive
}

/**
 * Generate deterministic boolean with specified probability.
 *
 * @param str - String to hash
 * @param probabilityPercent - Probability of true (0-100)
 *
 * @example
 * hashToBool("book-123", 30) // 30% chance of true
 */
export function hashToBool(str: string, probabilityPercent: number): boolean {
  return hashToPercent(str) < probabilityPercent;
}

/**
 * Pick a deterministic item from array based on string hash.
 *
 * @example
 * hashToPick("book-123", ["a", "b", "c"]) // Always returns same item
 */
export function hashToPick<T>(str: string, items: T[]): T {
  if (items.length === 0) {
    throw new Error('Cannot pick from empty array');
  }

  const hash = hashString(str);
  const index = hash % items.length;
  return items[index];
}

/**
 * Pick item from array using pre-calculated hash with offset.
 * Offset allows different properties to use different parts of the hash.
 *
 * @param items - Array to pick from
 * @param hash - Pre-calculated hash value
 * @param offset - Bit offset for variety (0-31)
 * @returns Item from array
 *
 * @example
 * const hash = hashString("book-123");
 * const color = pickFromHash(colors, hash, 0);
 * const size = pickFromHash(sizes, hash, 5);  // Different offset = different choice
 */
export function pickFromHash<T>(items: readonly T[], hash: number, offset: number): T {
  if (items.length === 0) {
    throw new Error('Cannot pick from empty array');
  }

  const index = Math.abs((hash >> offset) % items.length);
  return items[index];
}
