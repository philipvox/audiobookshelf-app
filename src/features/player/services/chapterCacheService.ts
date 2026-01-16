/**
 * Chapter Cache Service
 *
 * Provides a robust fallback hierarchy for chapters to prevent
 * chapter disappearance during long listening sessions.
 *
 * Fallback Priority:
 * 1. Session chapters (freshest, from current playback session)
 * 2. SQLite cached chapters (persisted from last successful load)
 * 3. Book metadata chapters (extracted from cached LibraryItem)
 * 4. Server fetch (API call to get fresh book data)
 *
 * This service ensures chapters survive:
 * - Network failures during session creation
 * - Session timeouts
 * - App crashes/restarts
 * - Race conditions in session lifecycle
 * - Cached LibraryItem missing chapters (downloaded books)
 */

import { LibraryItem } from '@/core/types';
import { sqliteCache } from '@/core/services/sqliteCache';
import { apiClient } from '@/core/api/apiClient';
import { SessionChapter } from './sessionService';
import {
  Chapter,
  mapSessionChapters,
  extractChaptersFromBook,
} from '../utils/bookLoadingHelpers';
import { createLogger } from '@/shared/utils/logger';

const log = createLogger('ChapterCache');

// Cache TTL: 7 days - chapters rarely change for the same book
const CHAPTERS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ChapterSource = 'session' | 'cache' | 'metadata';

export interface ChapterResult {
  chapters: Chapter[];
  source: ChapterSource;
}

class ChapterCacheService {
  /**
   * Get chapters using fallback hierarchy.
   * Priority: session > SQLite cache > book metadata
   *
   * @param book - The LibraryItem to get chapters for
   * @param sessionChapters - Chapters from the current session (if available)
   * @returns Chapters and their source
   */
  async getChaptersWithFallback(
    book: LibraryItem,
    sessionChapters: SessionChapter[] | null | undefined
  ): Promise<ChapterResult> {
    const bookId = book.id;
    const bookTitle = (book.media?.metadata as any)?.title || 'Unknown';
    const startTime = Date.now();

    try {
      // LEVEL 1: Try session chapters first (freshest data from server)
      if (sessionChapters && sessionChapters.length > 0) {
        const chapters = mapSessionChapters(sessionChapters);

        // Cache these for future fallback (fire and forget)
        this.cacheChapters(bookId, chapters).catch((error) => {
          log.warn('Background cache failed', { bookId, error: error instanceof Error ? error.message : 'Unknown' });
        });

        log.info('Chapters loaded from session', {
          bookId,
          bookTitle,
          chapterCount: chapters.length,
          loadTimeMs: Date.now() - startTime,
          source: 'session',
        });

        return { chapters, source: 'session' };
      }

      // LEVEL 2: Try SQLite cached chapters
      const cachedChapters = await this.getCachedChapters(bookId);
      if (cachedChapters && cachedChapters.length > 0) {
        log.info('Chapters loaded from cache', {
          bookId,
          bookTitle,
          chapterCount: cachedChapters.length,
          loadTimeMs: Date.now() - startTime,
          source: 'cache',
        });

        return { chapters: cachedChapters, source: 'cache' };
      }

      // LEVEL 3: Fall back to book metadata
      const metadataChapters = extractChaptersFromBook(book);
      if (metadataChapters.length > 0) {
        // Cache these for future fallback (fire and forget)
        this.cacheChapters(bookId, metadataChapters).catch((error) => {
          log.warn('Background cache failed', { bookId, error: error instanceof Error ? error.message : 'Unknown' });
        });

        log.info('Chapters loaded from metadata', {
          bookId,
          bookTitle,
          chapterCount: metadataChapters.length,
          loadTimeMs: Date.now() - startTime,
          source: 'metadata',
        });

        return { chapters: metadataChapters, source: 'metadata' };
      }

      // LEVEL 4: Fetch fresh data from server (last resort before empty)
      // This handles cases where the cached LibraryItem doesn't have chapters
      try {
        log.info('Attempting to fetch chapters from server', { bookId, bookTitle });
        const freshBook = await apiClient.getItem(bookId);
        const serverChapters = extractChaptersFromBook(freshBook);

        if (serverChapters.length > 0) {
          // Cache these for future fallback
          this.cacheChapters(bookId, serverChapters).catch((error) => {
            log.warn('Background cache failed', { bookId, error: error instanceof Error ? error.message : 'Unknown' });
          });

          log.info('Chapters loaded from server', {
            bookId,
            bookTitle,
            chapterCount: serverChapters.length,
            loadTimeMs: Date.now() - startTime,
            source: 'server',
          });

          return { chapters: serverChapters, source: 'metadata' };
        }
      } catch (serverError) {
        log.warn('Failed to fetch chapters from server', {
          bookId,
          bookTitle,
          error: serverError instanceof Error ? serverError.message : 'Unknown',
        });
      }

      // LEVEL 5: No chapters available from any source
      log.warn('No chapters available from any source', {
        bookId,
        bookTitle,
        hasSessionChapters: !!sessionChapters,
        hasMetadataChapters: !!(book.media?.chapters?.length),
        source: 'empty',
      });

      return { chapters: [], source: 'metadata' };
    } catch (error) {
      // Comprehensive error logging
      log.error('Chapter fallback failed entirely', {
        bookId,
        bookTitle,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return { chapters: [], source: 'metadata' };
    }
  }

  /**
   * Cache chapters to SQLite for persistence.
   * Includes timestamp for cache invalidation.
   *
   * @param bookId - The book ID
   * @param chapters - Array of Chapter objects
   */
  async cacheChapters(bookId: string, chapters: Chapter[]): Promise<void> {
    if (!chapters || chapters.length === 0) {
      log.debug(`Skipping empty chapters cache for ${bookId}`);
      return;
    }

    try {
      await sqliteCache.setUserBookChapters(bookId, chapters);
      log.debug(`Cached ${chapters.length} chapters for ${bookId}`);
    } catch (err) {
      log.warn(`Failed to cache chapters for ${bookId}:`, err);
    }
  }

  /**
   * Get cached chapters from SQLite.
   * Returns null if not cached or cache is expired.
   *
   * @param bookId - The book ID
   * @returns Chapters array or null
   */
  async getCachedChapters(bookId: string): Promise<Chapter[] | null> {
    try {
      const cached = await sqliteCache.getUserBookChapters(bookId, CHAPTERS_CACHE_TTL_MS);
      if (!cached) return null;

      // Validate and normalize the cached data
      const validated = cached
        .filter(ch => typeof ch.start === 'number' && typeof ch.end === 'number')
        .map((ch, i) => ({
          id: ch.id ?? i,
          start: ch.start,
          end: ch.end,
          title: ch.title || `Chapter ${i + 1}`,
        }));

      if (validated.length === 0) {
        log.debug(`Cached chapters for ${bookId} failed validation`);
        return null;
      }

      return validated;
    } catch (err) {
      log.warn(`Failed to get cached chapters for ${bookId}:`, err);
      return null;
    }
  }

  /**
   * Clear cached chapters for a book.
   * Call when book is deleted or chapters need refresh.
   *
   * @param bookId - The book ID
   */
  async clearCachedChapters(bookId: string): Promise<void> {
    try {
      await sqliteCache.clearUserBookChapters(bookId);
      log.debug(`Cleared chapters cache for ${bookId}`);
    } catch (err) {
      log.warn(`Failed to clear chapters cache for ${bookId}:`, err);
    }
  }

  /**
   * Check if cached chapters might be stale compared to session chapters.
   * Used to detect when server has updated chapter data.
   *
   * @param cachedChapters - Chapters from SQLite cache
   * @param sessionChapters - Chapters from current session
   * @returns true if chapters appear significantly different
   */
  areChaptersStale(
    cachedChapters: Chapter[],
    sessionChapters: SessionChapter[]
  ): boolean {
    // Significant difference in chapter count suggests update
    if (Math.abs(cachedChapters.length - sessionChapters.length) > 2) {
      return true;
    }

    // Check if first and last chapters match (quick heuristic)
    if (cachedChapters.length > 0 && sessionChapters.length > 0) {
      const firstCached = cachedChapters[0];
      const firstSession = sessionChapters[0];
      const lastCached = cachedChapters[cachedChapters.length - 1];
      const lastSession = sessionChapters[sessionChapters.length - 1];

      // Timing differences > 1 second suggest different chapters
      if (
        Math.abs(firstCached.start - firstSession.start) > 1 ||
        Math.abs(lastCached.end - lastSession.end) > 1
      ) {
        return true;
      }
    }

    return false;
  }

  // ==========================================================================
  // DEBUG UTILITIES
  // ==========================================================================

  /**
   * Debug utility: Get cache status for a book
   * Useful for diagnosing chapter issues
   */
  async getCacheStatus(bookId: string): Promise<{
    hasCachedChapters: boolean;
    chapterCount: number;
    cacheAgeMinutes: number | null;
    isExpired: boolean;
  }> {
    try {
      const userBook = await sqliteCache.getUserBook(bookId);

      if (!userBook?.chapters) {
        return {
          hasCachedChapters: false,
          chapterCount: 0,
          cacheAgeMinutes: null,
          isExpired: true,
        };
      }

      const chapters = JSON.parse(userBook.chapters);
      const ageMs = userBook.chaptersUpdatedAt
        ? Date.now() - userBook.chaptersUpdatedAt
        : null;
      const ageMinutes = ageMs ? Math.round(ageMs / 60000) : null;
      const isExpired = ageMs ? ageMs > CHAPTERS_CACHE_TTL_MS : true;

      return {
        hasCachedChapters: true,
        chapterCount: Array.isArray(chapters) ? chapters.length : 0,
        cacheAgeMinutes: ageMinutes,
        isExpired,
      };
    } catch (error) {
      log.warn('getCacheStatus failed', { bookId, error });
      return {
        hasCachedChapters: false,
        chapterCount: 0,
        cacheAgeMinutes: null,
        isExpired: true,
      };
    }
  }

  /**
   * Debug utility: Force refresh cache for a book
   * Clears existing cache so next load will fetch fresh chapters
   */
  async forceRefreshCache(bookId: string): Promise<void> {
    await sqliteCache.clearUserBookChapters(bookId);
    log.info('Force cleared chapter cache', { bookId });
  }
}

export const chapterCacheService = new ChapterCacheService();
