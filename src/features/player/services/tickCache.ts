/**
 * src/features/player/services/tickCache.ts
 *
 * Cache for pre-generated timeline ticks.
 * Uses in-memory cache with SQLite persistence for downloaded books.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateTicksForBook, TimelineTick, ChapterInput } from '../utils/tickGenerator';

// Re-export types for consumers
export type { TimelineTick, ChapterInput };

// Version number - increment when tick generation logic changes to invalidate old caches
const CACHE_VERSION = 3; // v3: tick positions stored in seconds (time-based) instead of pixels
const CACHE_KEY_PREFIX = `tick_cache_v${CACHE_VERSION}_`;
const MEMORY_CACHE = new Map<string, TimelineTick[]>();

/**
 * Get cached ticks for a book.
 * Checks memory first, then AsyncStorage.
 */
export async function getCachedTicks(libraryItemId: string): Promise<TimelineTick[] | null> {
  // Check memory cache first
  if (MEMORY_CACHE.has(libraryItemId)) {
    return MEMORY_CACHE.get(libraryItemId)!;
  }

  // Check persistent cache
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${libraryItemId}`);
    if (cached) {
      const ticks = JSON.parse(cached) as TimelineTick[];
      // Store in memory for faster access
      MEMORY_CACHE.set(libraryItemId, ticks);
      return ticks;
    }
  } catch (error) {
    console.warn('[TickCache] Error reading cache:', error);
  }

  return null;
}

/**
 * Cache ticks for a book (memory + persistent).
 */
export async function cacheTicks(
  libraryItemId: string,
  ticks: TimelineTick[],
  persist: boolean = true
): Promise<void> {
  // Always store in memory
  MEMORY_CACHE.set(libraryItemId, ticks);

  // Persist for downloaded books
  if (persist) {
    try {
      await AsyncStorage.setItem(
        `${CACHE_KEY_PREFIX}${libraryItemId}`,
        JSON.stringify(ticks)
      );
    } catch (error) {
      console.warn('[TickCache] Error persisting cache:', error);
    }
  }
}

/**
 * Generate and cache ticks for a book.
 * Call this when downloading a book or pre-loading.
 */
export async function generateAndCacheTicks(
  libraryItemId: string,
  duration: number,
  chapters: ChapterInput[],
  persist: boolean = true
): Promise<TimelineTick[]> {
  // Check if already cached
  const existing = await getCachedTicks(libraryItemId);
  if (existing) {
    return existing;
  }

  // Generate ticks
  console.log(`[TickCache] Generating ticks for ${libraryItemId} (${Math.round(duration / 60)} min)`);
  const startTime = Date.now();
  const ticks = generateTicksForBook(duration, chapters);
  console.log(`[TickCache] Generated ${ticks.length} ticks in ${Date.now() - startTime}ms`);

  // Cache them
  await cacheTicks(libraryItemId, ticks, persist);

  return ticks;
}

/**
 * Clear cached ticks for a book.
 * Call when book is deleted or data changes.
 */
export async function clearCachedTicks(libraryItemId: string): Promise<void> {
  MEMORY_CACHE.delete(libraryItemId);
  try {
    await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${libraryItemId}`);
  } catch (error) {
    console.warn('[TickCache] Error clearing cache:', error);
  }
}

/**
 * Clear all tick caches.
 */
export async function clearAllTickCaches(): Promise<void> {
  MEMORY_CACHE.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const tickKeys = keys.filter(k => k.startsWith(CACHE_KEY_PREFIX));
    if (tickKeys.length > 0) {
      await AsyncStorage.multiRemove(tickKeys);
    }
  } catch (error) {
    console.warn('[TickCache] Error clearing all caches:', error);
  }
}

/**
 * Pre-warm cache for a book (async, non-blocking).
 * Call from home screen for last played book.
 */
export function preWarmTickCache(
  libraryItemId: string,
  duration: number,
  chapters: ChapterInput[]
): void {
  // Run in background, don't await
  generateAndCacheTicks(libraryItemId, duration, chapters, false).catch(err => {
    console.warn('[TickCache] Pre-warm failed:', err);
  });
}
