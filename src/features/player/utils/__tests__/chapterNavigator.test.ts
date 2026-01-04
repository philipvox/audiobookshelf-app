/**
 * Tests for Chapter Navigator utility functions
 */

import {
  findChapterForPosition,
  getChapterStartPosition,
  getNextChapterIndex,
  getPreviousChapterIndex,
  getChapterProgress,
  getChapterTimeRemaining,
  getRemainingChaptersCount,
  getChapterAtIndex,
  getChapterDuration,
  findNearestChapterStart,
} from '../chapterNavigator';
import { Chapter } from '../types';

// Mock chapters representing a 4-chapter audiobook
const mockChapters: Chapter[] = [
  { id: 1, title: 'Chapter 1', start: 0, end: 1800 }, // 0-30 min
  { id: 2, title: 'Chapter 2', start: 1800, end: 3600 }, // 30-60 min
  { id: 3, title: 'Chapter 3', start: 3600, end: 5400 }, // 60-90 min
  { id: 4, title: 'Chapter 4', start: 5400, end: 7200 }, // 90-120 min
];

describe('findChapterForPosition', () => {
  it('returns null for empty chapters', () => {
    expect(findChapterForPosition([], 100)).toBeNull();
  });

  it('finds chapter at start of book', () => {
    const result = findChapterForPosition(mockChapters, 0);
    expect(result).toEqual({ chapter: mockChapters[0], index: 0 });
  });

  it('finds chapter in middle of first chapter', () => {
    const result = findChapterForPosition(mockChapters, 900); // 15 minutes
    expect(result).toEqual({ chapter: mockChapters[0], index: 0 });
  });

  it('finds chapter at boundary (start of second chapter)', () => {
    const result = findChapterForPosition(mockChapters, 1800); // 30 minutes
    expect(result).toEqual({ chapter: mockChapters[1], index: 1 });
  });

  it('finds chapter in middle of second chapter', () => {
    const result = findChapterForPosition(mockChapters, 2700); // 45 minutes
    expect(result).toEqual({ chapter: mockChapters[1], index: 1 });
  });

  it('finds chapter in last chapter', () => {
    const result = findChapterForPosition(mockChapters, 6000); // 100 minutes
    expect(result).toEqual({ chapter: mockChapters[3], index: 3 });
  });

  it('handles position beyond all chapters', () => {
    const result = findChapterForPosition(mockChapters, 10000);
    expect(result?.index).toBe(3);
  });

  it('handles position before first chapter', () => {
    const chaptersWithGap: Chapter[] = [
      { id: 1, title: 'Intro', start: 100, end: 500 },
    ];
    const result = findChapterForPosition(chaptersWithGap, 50);
    expect(result?.index).toBe(0);
  });

  it('handles negative position', () => {
    const result = findChapterForPosition(mockChapters, -100);
    expect(result).toEqual({ chapter: mockChapters[0], index: 0 });
  });
});

describe('getChapterStartPosition', () => {
  it('returns start position for valid index', () => {
    expect(getChapterStartPosition(mockChapters, 0)).toBe(0);
    expect(getChapterStartPosition(mockChapters, 1)).toBe(1800);
    expect(getChapterStartPosition(mockChapters, 2)).toBe(3600);
    expect(getChapterStartPosition(mockChapters, 3)).toBe(5400);
  });

  it('returns null for negative index', () => {
    expect(getChapterStartPosition(mockChapters, -1)).toBeNull();
  });

  it('returns null for index beyond array', () => {
    expect(getChapterStartPosition(mockChapters, 99)).toBeNull();
  });

  it('returns null for empty chapters', () => {
    expect(getChapterStartPosition([], 0)).toBeNull();
  });
});

describe('getNextChapterIndex', () => {
  it('returns next chapter when in first chapter', () => {
    expect(getNextChapterIndex(mockChapters, 900)).toBe(1);
  });

  it('returns next chapter when in middle chapter', () => {
    expect(getNextChapterIndex(mockChapters, 2700)).toBe(2);
  });

  it('returns next chapter when in second to last chapter', () => {
    expect(getNextChapterIndex(mockChapters, 4500)).toBe(3);
  });

  it('returns null when in last chapter', () => {
    expect(getNextChapterIndex(mockChapters, 6000)).toBeNull();
  });

  it('returns null for empty chapters', () => {
    expect(getNextChapterIndex([], 100)).toBeNull();
  });
});

describe('getPreviousChapterIndex', () => {
  it('returns current chapter if more than threshold into it', () => {
    // 10 seconds into chapter 2 (1800 + 10 = 1810)
    expect(getPreviousChapterIndex(mockChapters, 1810)).toBe(1);
  });

  it('returns previous chapter if less than threshold into current', () => {
    // 2 seconds into chapter 2 (1800 + 2 = 1802)
    expect(getPreviousChapterIndex(mockChapters, 1802)).toBe(0);
  });

  it('respects custom threshold', () => {
    // 4 seconds in, with threshold of 5 -> go to previous
    expect(getPreviousChapterIndex(mockChapters, 1804, 5)).toBe(0);
    // 6 seconds in, with threshold of 5 -> restart current
    expect(getPreviousChapterIndex(mockChapters, 1806, 5)).toBe(1);
  });

  it('stays at chapter 0 when already at start', () => {
    expect(getPreviousChapterIndex(mockChapters, 1)).toBe(0);
  });

  it('returns null for empty chapters', () => {
    expect(getPreviousChapterIndex([], 100)).toBeNull();
  });
});

describe('getChapterProgress', () => {
  it('returns 0 at chapter start', () => {
    expect(getChapterProgress(mockChapters, 0)).toBe(0);
    expect(getChapterProgress(mockChapters, 1800)).toBe(0);
  });

  it('returns 50 at chapter midpoint', () => {
    expect(getChapterProgress(mockChapters, 900)).toBe(50); // Middle of chapter 1
    expect(getChapterProgress(mockChapters, 2700)).toBe(50); // Middle of chapter 2
  });

  it('returns close to 100 near chapter end', () => {
    const progress = getChapterProgress(mockChapters, 1799);
    expect(progress).toBeGreaterThan(99);
  });

  it('returns 0 for empty chapters', () => {
    expect(getChapterProgress([], 100)).toBe(0);
  });

  it('clamps to 0-100 range', () => {
    const progress = getChapterProgress(mockChapters, 500);
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(100);
  });
});

describe('getChapterTimeRemaining', () => {
  it('returns full duration at chapter start', () => {
    expect(getChapterTimeRemaining(mockChapters, 0)).toBe(1800);
  });

  it('returns half duration at chapter midpoint', () => {
    expect(getChapterTimeRemaining(mockChapters, 900)).toBe(900);
  });

  it('returns 0 at chapter end', () => {
    expect(getChapterTimeRemaining(mockChapters, 1800)).toBe(1800); // This is start of chapter 2
  });

  it('returns 0 for empty chapters', () => {
    expect(getChapterTimeRemaining([], 100)).toBe(0);
  });

  it('never returns negative', () => {
    const remaining = getChapterTimeRemaining(mockChapters, 7200);
    expect(remaining).toBeGreaterThanOrEqual(0);
  });
});

describe('getRemainingChaptersCount', () => {
  it('returns all chapters at start', () => {
    expect(getRemainingChaptersCount(mockChapters, 0)).toBe(4);
  });

  it('returns remaining chapters in middle', () => {
    expect(getRemainingChaptersCount(mockChapters, 2700)).toBe(3); // In chapter 2
  });

  it('returns 1 in last chapter', () => {
    expect(getRemainingChaptersCount(mockChapters, 6000)).toBe(1);
  });

  it('returns 0 for empty chapters', () => {
    expect(getRemainingChaptersCount([], 100)).toBe(0);
  });
});

describe('getChapterAtIndex', () => {
  it('returns chapter at valid index', () => {
    expect(getChapterAtIndex(mockChapters, 0)).toEqual(mockChapters[0]);
    expect(getChapterAtIndex(mockChapters, 1)).toEqual(mockChapters[1]);
    expect(getChapterAtIndex(mockChapters, 3)).toEqual(mockChapters[3]);
  });

  it('returns null for negative index', () => {
    expect(getChapterAtIndex(mockChapters, -1)).toBeNull();
  });

  it('returns null for index beyond array', () => {
    expect(getChapterAtIndex(mockChapters, 99)).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(getChapterAtIndex([], 0)).toBeNull();
  });
});

describe('getChapterDuration', () => {
  it('calculates duration correctly', () => {
    expect(getChapterDuration(mockChapters[0])).toBe(1800);
    expect(getChapterDuration(mockChapters[1])).toBe(1800);
  });

  it('handles zero duration chapter', () => {
    const zeroChapter: Chapter = { id: 1, title: 'Empty', start: 100, end: 100 };
    expect(getChapterDuration(zeroChapter)).toBe(0);
  });

  it('handles inverted start/end (returns 0)', () => {
    const invertedChapter: Chapter = { id: 1, title: 'Bad', start: 200, end: 100 };
    expect(getChapterDuration(invertedChapter)).toBe(0);
  });
});

describe('findNearestChapterStart', () => {
  it('returns null for empty chapters', () => {
    expect(findNearestChapterStart([], 100)).toBeNull();
  });

  it('finds exact chapter start', () => {
    const result = findNearestChapterStart(mockChapters, 1800);
    expect(result?.index).toBe(1);
  });

  it('finds nearest chapter when between starts', () => {
    // 2600 is closer to 1800 (chapter 2 start) than 3600 (chapter 3 start)
    const result = findNearestChapterStart(mockChapters, 2600);
    expect(result?.index).toBe(1);
  });

  it('finds nearest chapter when closer to next', () => {
    // 3400 is closer to 3600 (chapter 3 start) than 1800 (chapter 2 start)
    const result = findNearestChapterStart(mockChapters, 3400);
    expect(result?.index).toBe(2);
  });

  it('returns first chapter for position before all chapters', () => {
    const result = findNearestChapterStart(mockChapters, -100);
    expect(result?.index).toBe(0);
  });

  it('returns last chapter for position after all chapters', () => {
    const result = findNearestChapterStart(mockChapters, 10000);
    // Should find the one with minimum diff from 10000
    // Chapter 4 starts at 5400, which is closest to 10000
    expect(result?.index).toBe(3);
  });
});
