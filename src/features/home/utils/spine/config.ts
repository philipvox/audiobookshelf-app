/**
 * src/features/home/utils/spine/config.ts
 *
 * Unified SpineConfig object - single source of truth for spine generation.
 * Replaces scattered parameters across multiple functions.
 */

import { SpineContext } from './constants';

// =============================================================================
// SPINE CONFIGURATION
// =============================================================================

/**
 * Complete configuration for generating a book spine.
 * Centralizes all book metadata, display preferences, and context.
 */
export interface SpineConfig {
  /** Book identification */
  book: {
    /** Unique book ID (for deterministic hashing) */
    id: string;
    /** Book title */
    title: string;
    /** Author name */
    author: string;
  };

  /** Book metadata */
  metadata: {
    /** Genre array (e.g., ["Fantasy", "Adventure"]) */
    genres: string[];
    /** User tags (for typography modifiers) */
    tags?: string[];
    /** Audiobook duration in seconds */
    duration: number | undefined;
    /** Series name (for height locking) */
    seriesName?: string;
  };

  /** Display state */
  display: {
    /** Playback progress (0.0 - 1.0) */
    progress: number;
    /** Is book downloaded? */
    isDownloaded: boolean;
    /** Display context (shelf, stack, card, detail) */
    context: SpineContext;
  };

  /** Optional overrides */
  overrides?: {
    /** Force specific typography profile */
    typography?: string;
    /** Force specific dimensions */
    dimensions?: { width: number; height: number };
    /** Force specific colors */
    colors?: { background: string; text: string };
  };
}

// =============================================================================
// BUILDER PATTERN
// =============================================================================

/**
 * Builder for creating SpineConfig objects.
 * Provides a fluent API for constructing configurations.
 *
 * @example
 * const config = new SpineConfigBuilder('book-123')
 *   .withTitle('The Name of the Wind')
 *   .withAuthor('Patrick Rothfuss')
 *   .withGenres(['Fantasy', 'Adventure'])
 *   .withDuration(97200) // 27 hours
 *   .withContext('shelf')
 *   .build();
 */
export class SpineConfigBuilder {
  private config: Partial<SpineConfig> = {
    book: { id: '', title: '', author: '' },
    metadata: { genres: [], duration: undefined },
    display: { progress: 0, isDownloaded: false, context: 'shelf' },
  };

  constructor(bookId: string) {
    this.config.book!.id = bookId;
  }

  withTitle(title: string): this {
    this.config.book!.title = title;
    return this;
  }

  withAuthor(author: string): this {
    this.config.book!.author = author;
    return this;
  }

  withGenres(genres: string[]): this {
    this.config.metadata!.genres = genres;
    return this;
  }

  withTags(tags: string[]): this {
    this.config.metadata!.tags = tags;
    return this;
  }

  withDuration(durationSeconds: number | undefined): this {
    this.config.metadata!.duration = durationSeconds;
    return this;
  }

  withSeriesName(seriesName: string | undefined): this {
    this.config.metadata!.seriesName = seriesName;
    return this;
  }

  withProgress(progress: number): this {
    this.config.display!.progress = progress;
    return this;
  }

  withDownloaded(isDownloaded: boolean): this {
    this.config.display!.isDownloaded = isDownloaded;
    return this;
  }

  withContext(context: SpineContext): this {
    this.config.display!.context = context;
    return this;
  }

  withOverrides(overrides: SpineConfig['overrides']): this {
    this.config.overrides = overrides;
    return this;
  }

  build(): SpineConfig {
    return this.config as SpineConfig;
  }
}

// =============================================================================
// FACTORY HELPERS
// =============================================================================

/**
 * Create SpineConfig from LibraryItem.
 * Convenience function for common use case.
 */
export function configFromLibraryItem(
  item: any, // LibraryItem type
  context: SpineContext = 'shelf'
): SpineConfig {
  const metadata = item.media?.metadata || {};
  const progress = item.userMediaProgress?.progress || 0;

  return {
    book: {
      id: item.id,
      title: metadata.title || 'Unknown Title',
      author: metadata.authorName || 'Unknown Author',
    },
    metadata: {
      genres: metadata.genres || [],
      tags: item.media?.tags || [],
      duration: item.media?.duration,
      seriesName: metadata.seriesName,
    },
    display: {
      progress,
      isDownloaded: false, // TODO: Check download status
      context,
    },
  };
}

/**
 * Create minimal SpineConfig for testing.
 */
export function createTestConfig(
  overrides?: Partial<SpineConfig>
): SpineConfig {
  return {
    book: {
      id: 'test-book-123',
      title: 'Test Book',
      author: 'Test Author',
    },
    metadata: {
      genres: ['Fiction'],
      duration: 36000, // 10 hours
    },
    display: {
      progress: 0,
      isDownloaded: false,
      context: 'shelf',
    },
    ...overrides,
  };
}
