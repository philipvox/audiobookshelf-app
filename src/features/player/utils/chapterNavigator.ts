/**
 * src/features/player/utils/chapterNavigator.ts
 *
 * Pure functions for chapter navigation.
 * No side effects, fully testable.
 */

import { Chapter } from './types';

export interface ChapterInfo {
  chapter: Chapter;
  index: number;
}

/**
 * Find which chapter contains a given position.
 *
 * @param chapters - Array of chapters
 * @param position - Position in seconds
 * @returns Chapter and index, or null if not found
 */
export function findChapterForPosition(
  chapters: Chapter[],
  position: number
): ChapterInfo | null {
  if (chapters.length === 0) return null;

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    if (position >= chapter.start && position < chapter.end) {
      return { chapter, index: i };
    }
  }

  // If past all chapters, return last chapter
  if (position >= chapters[chapters.length - 1].end) {
    return {
      chapter: chapters[chapters.length - 1],
      index: chapters.length - 1,
    };
  }

  // If before first chapter (shouldn't happen normally)
  if (position < chapters[0].start) {
    return {
      chapter: chapters[0],
      index: 0,
    };
  }

  return null;
}

/**
 * Get the start position of a chapter by index.
 *
 * @param chapters - Array of chapters
 * @param index - Chapter index
 * @returns Start position in seconds, or null if invalid index
 */
export function getChapterStartPosition(
  chapters: Chapter[],
  index: number
): number | null {
  if (index < 0 || index >= chapters.length) {
    return null;
  }
  return chapters[index].start;
}

/**
 * Get next chapter index, or null if at last chapter.
 *
 * @param chapters - Array of chapters
 * @param currentPosition - Current position in seconds
 * @returns Next chapter index, or null if at end
 */
export function getNextChapterIndex(
  chapters: Chapter[],
  currentPosition: number
): number | null {
  const current = findChapterForPosition(chapters, currentPosition);
  if (!current) return null;

  if (current.index < chapters.length - 1) {
    return current.index + 1;
  }
  return null;
}

/**
 * Get previous chapter index.
 * If more than threshold seconds into current chapter, restart current.
 * Otherwise, go to previous chapter.
 *
 * @param chapters - Array of chapters
 * @param currentPosition - Current position in seconds
 * @param restartThreshold - Seconds into chapter before going to previous (default 3)
 * @returns Chapter index to navigate to
 */
export function getPreviousChapterIndex(
  chapters: Chapter[],
  currentPosition: number,
  restartThreshold: number = 3
): number | null {
  const current = findChapterForPosition(chapters, currentPosition);
  if (!current) return null;

  const positionInChapter = currentPosition - current.chapter.start;

  // If we're more than threshold into the chapter, restart current
  if (positionInChapter > restartThreshold) {
    return current.index;
  }

  // Otherwise, go to previous (or stay at 0)
  return Math.max(0, current.index - 1);
}

/**
 * Get position in current chapter as percentage (0-100).
 *
 * @param chapters - Array of chapters
 * @param position - Current position in seconds
 * @returns Progress percentage within chapter
 */
export function getChapterProgress(
  chapters: Chapter[],
  position: number
): number {
  const current = findChapterForPosition(chapters, position);
  if (!current) return 0;

  const chapterDuration = current.chapter.end - current.chapter.start;
  if (chapterDuration <= 0) return 0;

  const positionInChapter = position - current.chapter.start;
  return Math.min(100, Math.max(0, (positionInChapter / chapterDuration) * 100));
}

/**
 * Get remaining time in current chapter.
 *
 * @param chapters - Array of chapters
 * @param position - Current position in seconds
 * @returns Remaining time in seconds
 */
export function getChapterTimeRemaining(
  chapters: Chapter[],
  position: number
): number {
  const current = findChapterForPosition(chapters, position);
  if (!current) return 0;

  return Math.max(0, current.chapter.end - position);
}

/**
 * Get the number of remaining chapters (including current).
 *
 * @param chapters - Array of chapters
 * @param currentPosition - Current position in seconds
 * @returns Number of chapters remaining
 */
export function getRemainingChaptersCount(
  chapters: Chapter[],
  currentPosition: number
): number {
  const current = findChapterForPosition(chapters, currentPosition);
  if (!current) return 0;

  return chapters.length - current.index;
}

/**
 * Get chapter at a specific index.
 *
 * @param chapters - Array of chapters
 * @param index - Chapter index
 * @returns Chapter or null if invalid index
 */
export function getChapterAtIndex(
  chapters: Chapter[],
  index: number
): Chapter | null {
  if (index < 0 || index >= chapters.length) {
    return null;
  }
  return chapters[index];
}

/**
 * Calculate chapter duration.
 *
 * @param chapter - Chapter object
 * @returns Duration in seconds
 */
export function getChapterDuration(chapter: Chapter): number {
  return Math.max(0, chapter.end - chapter.start);
}

/**
 * Find the chapter closest to a given position (for seeking).
 * Returns the chapter whose start is nearest to the position.
 *
 * @param chapters - Array of chapters
 * @param position - Target position in seconds
 * @returns Closest chapter and its index
 */
export function findNearestChapterStart(
  chapters: Chapter[],
  position: number
): ChapterInfo | null {
  if (chapters.length === 0) return null;

  let nearest = chapters[0];
  let nearestIndex = 0;
  let minDiff = Math.abs(position - nearest.start);

  for (let i = 1; i < chapters.length; i++) {
    const diff = Math.abs(position - chapters[i].start);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = chapters[i];
      nearestIndex = i;
    }
  }

  return { chapter: nearest, index: nearestIndex };
}
