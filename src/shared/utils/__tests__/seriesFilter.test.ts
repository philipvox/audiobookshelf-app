/**
 * src/shared/utils/__tests__/seriesFilter.test.ts
 *
 * Tests for series filtering utilities.
 */

import {
  getSeriesInfo,
  buildSeriesProgressMap,
  buildSeriesCountMap,
  buildSeriesFirstBookMap,
  isSeriesAppropriate,
} from '../seriesFilter';
import { LibraryItem } from '@/core/types';

// Helper to create mock library items
function createMockItem(id: string, seriesName?: string, sequence?: string | number): LibraryItem {
  return {
    id,
    ino: `ino-${id}`,
    libraryId: 'lib1',
    folderId: 'folder1',
    path: `/books/${id}`,
    relPath: id,
    isFile: false,
    mtimeMs: Date.now(),
    ctimeMs: Date.now(),
    birthtimeMs: Date.now(),
    addedAt: Date.now(),
    updatedAt: Date.now(),
    isMissing: false,
    isInvalid: false,
    mediaType: 'book',
    media: {
      id: `media-${id}`,
      libraryItemId: id,
      metadata: {
        title: `Book ${id}`,
        series: seriesName ? [{ name: seriesName, sequence: sequence }] : undefined,
      },
      coverPath: null,
      tags: [],
      audioFiles: [],
      chapters: [],
      duration: 3600,
      size: 100000,
    } as any,
    libraryFiles: [],
  };
}

describe('seriesFilter', () => {
  describe('getSeriesInfo', () => {
    it('returns null for items without series', () => {
      const item = createMockItem('book1');
      expect(getSeriesInfo(item)).toBeNull();
    });

    it('extracts series name and sequence', () => {
      const item = createMockItem('book1', 'Harry Potter', '1');
      const info = getSeriesInfo(item);
      expect(info).toEqual({
        name: 'Harry Potter',
        sequence: 1,
        isOmnibus: false,
        sequenceEnd: 1,
      });
    });

    it('handles decimal sequences', () => {
      const item = createMockItem('book1', 'Discworld', '1.5');
      const info = getSeriesInfo(item);
      expect(info?.sequence).toBe(1.5);
      expect(info?.isOmnibus).toBe(false);
    });

    it('handles omnibus/range sequences', () => {
      const item = createMockItem('book1', 'Foundation', '1-3');
      const info = getSeriesInfo(item);
      expect(info?.sequence).toBe(1);
      expect(info?.sequenceEnd).toBe(3);
      expect(info?.isOmnibus).toBe(true);
    });

    it('handles null/undefined sequence', () => {
      const item = createMockItem('book1', 'Unknown Series', undefined);
      const info = getSeriesInfo(item);
      expect(info?.sequence).toBe(0);
      expect(info?.isOmnibus).toBe(false);
    });

    it('handles numeric sequence values', () => {
      const item = createMockItem('book1', 'Dune', 2);
      const info = getSeriesInfo(item);
      expect(info?.sequence).toBe(2);
    });
  });

  describe('buildSeriesProgressMap', () => {
    const items = [
      createMockItem('hp1', 'Harry Potter', '1'),
      createMockItem('hp2', 'Harry Potter', '2'),
      createMockItem('hp3', 'Harry Potter', '3'),
      createMockItem('dune1', 'Dune', '1'),
      createMockItem('dune2', 'Dune', '2'),
      createMockItem('standalone', undefined, undefined),
    ];

    it('returns empty map when no books are finished', () => {
      const isFinished = () => false;
      const map = buildSeriesProgressMap(items, isFinished);
      expect(map.size).toBe(0);
    });

    it('tracks highest finished sequence per series', () => {
      const isFinished = (id: string) => ['hp1', 'hp2', 'dune1'].includes(id);
      const map = buildSeriesProgressMap(items, isFinished);

      expect(map.get('Harry Potter')).toBe(2);
      expect(map.get('Dune')).toBe(1);
    });

    it('handles started but not finished books', () => {
      const isFinished = (id: string) => id === 'hp1';
      const hasStarted = (id: string) => ['hp1', 'hp2'].includes(id);
      const map = buildSeriesProgressMap(items, isFinished, hasStarted);

      // Should track that user has started hp2 (sequence 2)
      expect(map.get('Harry Potter')).toBeGreaterThanOrEqual(1);
    });

    it('ignores standalone books', () => {
      const isFinished = (id: string) => id === 'standalone';
      const map = buildSeriesProgressMap(items, isFinished);
      expect(map.size).toBe(0);
    });

    it('handles omnibus editions', () => {
      const omnibusItems = [
        createMockItem('lotr-omnibus', 'LOTR', '1-3'),
        createMockItem('lotr4', 'LOTR', '4'),
      ];
      const isFinished = (id: string) => id === 'lotr-omnibus';
      const map = buildSeriesProgressMap(omnibusItems, isFinished);

      // Should use end sequence (3) for finished omnibus
      expect(map.get('LOTR')).toBe(3);
    });

    it('handles invalid isFinished function', () => {
      const map = buildSeriesProgressMap(items, null as any);
      expect(map.size).toBe(0);
    });
  });

  describe('buildSeriesCountMap', () => {
    const items = [
      createMockItem('hp1', 'Harry Potter', '1'),
      createMockItem('hp2', 'Harry Potter', '2'),
      createMockItem('hp3', 'Harry Potter', '3'),
      createMockItem('dune1', 'Dune', '1'),
      createMockItem('standalone', undefined, undefined),
    ];

    it('counts books per series', () => {
      const map = buildSeriesCountMap(items);
      expect(map.get('Harry Potter')).toBe(3);
      expect(map.get('Dune')).toBe(1);
    });

    it('ignores standalone books', () => {
      const map = buildSeriesCountMap(items);
      expect(map.has('standalone')).toBe(false);
    });
  });

  describe('buildSeriesFirstBookMap', () => {
    const items = [
      createMockItem('hp3', 'Harry Potter', '3'),
      createMockItem('hp1', 'Harry Potter', '1'),
      createMockItem('hp2', 'Harry Potter', '2'),
      createMockItem('dune2', 'Dune', '2'),
      createMockItem('dune1', 'Dune', '1'),
    ];

    it('finds lowest sequence per series', () => {
      const map = buildSeriesFirstBookMap(items);
      expect(map.get('Harry Potter')).toBe(1);
      expect(map.get('Dune')).toBe(1);
    });

    it('handles out-of-order items', () => {
      const map = buildSeriesFirstBookMap(items);
      // Should still find the lowest regardless of order
      expect(map.get('Harry Potter')).toBe(1);
    });
  });

  describe('isSeriesAppropriate', () => {
    const items = [
      createMockItem('hp1', 'Harry Potter', '1'),
      createMockItem('hp2', 'Harry Potter', '2'),
      createMockItem('hp3', 'Harry Potter', '3'),
    ];

    it('returns true for standalone books', () => {
      const standalone = createMockItem('standalone');
      const progressMap = new Map<string, number>();
      const countMap = buildSeriesCountMap(items);
      const firstBookMap = buildSeriesFirstBookMap(items);

      expect(isSeriesAppropriate(standalone, progressMap, countMap, firstBookMap)).toBe(true);
    });

    it('returns true for first book of unstarted series', () => {
      const progressMap = new Map<string, number>();
      const countMap = buildSeriesCountMap(items);
      const firstBookMap = buildSeriesFirstBookMap(items);

      expect(isSeriesAppropriate(items[0], progressMap, countMap, firstBookMap)).toBe(true);
    });

    it('returns false for middle book of unstarted series', () => {
      const progressMap = new Map<string, number>();
      const countMap = buildSeriesCountMap(items);
      const firstBookMap = buildSeriesFirstBookMap(items);

      expect(isSeriesAppropriate(items[1], progressMap, countMap, firstBookMap)).toBe(false);
      expect(isSeriesAppropriate(items[2], progressMap, countMap, firstBookMap)).toBe(false);
    });

    it('returns true for next book after progress', () => {
      const progressMap = new Map<string, number>([['Harry Potter', 1]]);
      const countMap = buildSeriesCountMap(items);
      const firstBookMap = buildSeriesFirstBookMap(items);

      // hp2 (sequence 2) should be appropriate after finishing hp1 (sequence 1)
      expect(isSeriesAppropriate(items[1], progressMap, countMap, firstBookMap)).toBe(true);
    });
  });
});

