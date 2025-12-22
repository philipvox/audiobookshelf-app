/**
 * src/shared/hooks/useNormalizedChapters.ts
 *
 * React hook for normalizing chapter names based on user preferences.
 * Provides cleaned chapter names for display while preserving original data.
 */

import { useMemo } from 'react';
import type { BookChapter } from '@/core/types/media';
import {
  normalizeChapters,
  parseChapterTitle,
  type NormalizerOptions,
  type ParsedChapter,
} from '@/core/services/chapterNormalizer';
import { useChapterCleaningStore } from '@/features/profile/stores/chapterCleaningStore';

// ============================================================================
// TYPES
// ============================================================================

export interface NormalizedChapter extends BookChapter {
  /** The cleaned display name */
  displayTitle: string;
  /** The original unmodified title */
  originalTitle: string;
  /** Whether any cleaning was applied */
  wasCleaned: boolean;
  /** Parsed chapter number (if detected) */
  chapterNumber: number | null;
  /** Type of chapter (chapter, part, front_matter, etc.) */
  chapterType: ParsedChapter['chapterType'];
  /** Confidence score of the parsing (0-1) */
  confidence: number;
}

export interface UseNormalizedChaptersOptions {
  /** Book title for context-aware cleaning */
  bookTitle?: string;
  /** Override the global cleaning level */
  level?: NormalizerOptions['level'];
  /** Whether cleaning is enabled (default: follows user setting) */
  enabled?: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to get normalized chapter names based on user preferences
 *
 * @param chapters - Array of chapters from the API
 * @param options - Configuration options
 * @returns Array of chapters with normalized display names
 *
 * @example
 * ```tsx
 * const chapters = useNormalizedChapters(book.chapters, {
 *   bookTitle: book.metadata.title,
 * });
 *
 * return (
 *   <FlatList
 *     data={chapters}
 *     renderItem={({ item }) => (
 *       <ChapterRow title={item.displayTitle} />
 *     )}
 *   />
 * );
 * ```
 */
export function useNormalizedChapters(
  chapters: BookChapter[],
  options: UseNormalizedChaptersOptions = {}
): NormalizedChapter[] {
  const globalLevel = useChapterCleaningStore((s) => s.level);

  // Use provided level or fall back to global setting
  const level = options.level ?? globalLevel;
  const enabled = options.enabled ?? level !== 'off';

  return useMemo(() => {
    if (!chapters || chapters.length === 0) {
      return [];
    }

    // If cleaning is disabled, return original titles
    if (!enabled) {
      return chapters.map((ch) => ({
        ...ch,
        displayTitle: ch.title,
        originalTitle: ch.title,
        wasCleaned: false,
        chapterNumber: null,
        chapterType: 'other' as const,
        confidence: 1.0,
      }));
    }

    // Parse all chapter titles
    const titles = chapters.map((ch) => ch.title);
    const parsed = normalizeChapters(titles, {
      level,
      bookTitle: options.bookTitle,
    });

    // Combine parsed results with original chapter data
    return chapters.map((ch, i) => ({
      ...ch,
      displayTitle: parsed[i].displayName,
      originalTitle: parsed[i].original,
      wasCleaned: parsed[i].original !== parsed[i].displayName,
      chapterNumber: parsed[i].chapterNumber,
      chapterType: parsed[i].chapterType,
      confidence: parsed[i].confidence,
    }));
  }, [chapters, level, enabled, options.bookTitle]);
}

/**
 * Get a single normalized chapter title (convenience function)
 *
 * @param title - The raw chapter title
 * @param options - Configuration options
 * @returns The normalized display title
 *
 * @example
 * ```tsx
 * const displayTitle = useNormalizedChapterTitle(chapter.title);
 * ```
 */
export function useNormalizedChapterTitle(
  title: string,
  options: UseNormalizedChaptersOptions = {}
): string {
  const globalLevel = useChapterCleaningStore((s) => s.level);
  const level = options.level ?? globalLevel;
  const enabled = options.enabled ?? level !== 'off';

  return useMemo(() => {
    if (!enabled || !title) {
      return title;
    }

    const parsed = parseChapterTitle(title, {
      level,
      bookTitle: options.bookTitle,
    });

    return parsed.displayName;
  }, [title, level, enabled, options.bookTitle]);
}

/**
 * Get normalized chapter title outside of React (for non-component contexts)
 *
 * @param title - The raw chapter title
 * @param options - Configuration options
 * @returns The normalized display title
 */
export function getNormalizedChapterTitle(
  title: string,
  options: Omit<UseNormalizedChaptersOptions, 'enabled'> = {}
): string {
  const level = options.level ?? useChapterCleaningStore.getState().level;

  if (level === 'off' || !title) {
    return title;
  }

  const parsed = parseChapterTitle(title, {
    level,
    bookTitle: options.bookTitle,
  });

  return parsed.displayName;
}
