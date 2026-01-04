/**
 * Tests for Search Index
 */

import { SearchIndex } from '../searchIndex';
import { LibraryItem } from '@/core/types';

// Mock library items
function createMockItem(overrides: Partial<{
  id: string;
  title: string;
  author: string;
  narrator: string;
  series: string;
}>): LibraryItem {
  const { id = 'item-1', title = 'Test Book', author = 'Test Author', narrator = '', series = '' } = overrides;

  return {
    id,
    ino: '123',
    libraryId: 'lib-1',
    media: {
      metadata: {
        title,
        authorName: author,
        narratorName: narrator,
        seriesName: series,
      } as any,
      audioFiles: [],
      tracks: [],
      chapters: [],
    },
  } as LibraryItem;
}

describe('SearchIndex', () => {
  let index: SearchIndex;

  beforeEach(() => {
    index = new SearchIndex();
  });

  describe('build', () => {
    it('builds index from items', () => {
      const items = [
        createMockItem({ id: '1', title: 'The Great Adventure' }),
        createMockItem({ id: '2', title: 'A Small Journey' }),
      ];

      index.build(items);

      expect(index.ready).toBe(true);
      expect(index.getStats().itemCount).toBe(2);
    });

    it('handles empty item list', () => {
      index.build([]);

      expect(index.ready).toBe(true);
      expect(index.getStats().itemCount).toBe(0);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      const items = [
        createMockItem({ id: '1', title: 'The Great Adventure', author: 'John Smith' }),
        createMockItem({ id: '2', title: 'A Small Journey', author: 'Jane Doe' }),
        createMockItem({ id: '3', title: 'Mystery Manor', author: 'John Smith', series: 'Mystery Series' }),
        createMockItem({ id: '4', title: 'Love and Thunder', narrator: 'Bob Voice' }),
        createMockItem({ id: '5', title: 'The Last Battle', author: 'C.S. Lewis', series: 'Narnia' }),
      ];
      index.build(items);
    });

    it('returns empty array for empty query', () => {
      expect(index.search('')).toEqual([]);
      expect(index.search('   ')).toEqual([]);
    });

    it('finds items by title', () => {
      const results = index.search('adventure');

      expect(results.length).toBe(1);
      expect(results[0].item.id).toBe('1');
      expect(results[0].matchedFields).toContain('title');
    });

    it('finds items by author', () => {
      const results = index.search('john smith');

      expect(results.length).toBe(2);
      expect(results.some(r => r.item.id === '1')).toBe(true);
      expect(results.some(r => r.item.id === '3')).toBe(true);
    });

    it('finds items by series', () => {
      const results = index.search('narnia');

      expect(results.length).toBe(1);
      expect(results[0].item.id).toBe('5');
    });

    it('finds items by narrator', () => {
      const results = index.search('bob voice');

      expect(results.length).toBe(1);
      expect(results[0].item.id).toBe('4');
    });

    it('handles partial matches', () => {
      const results = index.search('adven');

      expect(results.length).toBe(1);
      expect(results[0].item.id).toBe('1');
    });

    it('is case insensitive', () => {
      const results1 = index.search('ADVENTURE');
      const results2 = index.search('adventure');

      expect(results1.length).toBe(results2.length);
      expect(results1[0].item.id).toBe(results2[0].item.id);
    });

    it('respects limit parameter', () => {
      const results = index.search('the', 1);

      expect(results.length).toBe(1);
    });

    it('sorts by relevance score', () => {
      // Exact match should rank higher
      const results = index.search('Mystery Manor');

      expect(results[0].item.id).toBe('3');
      expect(results[0].score).toBeGreaterThan(0.5);
    });

    it('handles short queries (1-2 chars)', () => {
      const results = index.search('Th');

      // Should match titles starting with "Th"
      expect(results.some(r => r.item.id === '1')).toBe(true); // The Great Adventure
      expect(results.some(r => r.item.id === '5')).toBe(true); // The Last Battle
    });
  });

  describe('getByExactMatch', () => {
    beforeEach(() => {
      const items = [
        createMockItem({ id: '1', title: 'Test Book', author: 'John Smith' }),
        createMockItem({ id: '2', title: 'Another Book', author: 'John Smith' }),
        createMockItem({ id: '3', title: 'Different Book', author: 'Jane Doe' }),
      ];
      index.build(items);
    });

    it('finds items by exact author match', () => {
      const results = index.getByExactMatch('author', 'John Smith');

      expect(results.length).toBe(2);
      expect(results.every(r => {
        const metadata = (r.media?.metadata as any) || {};
        return metadata.authorName === 'John Smith';
      })).toBe(true);
    });

    it('is case insensitive', () => {
      const results = index.getByExactMatch('author', 'john smith');

      expect(results.length).toBe(2);
    });

    it('returns empty array for no match', () => {
      const results = index.getByExactMatch('author', 'Unknown Author');

      expect(results).toEqual([]);
    });
  });

  describe('getById', () => {
    beforeEach(() => {
      const items = [
        createMockItem({ id: '1', title: 'Test Book' }),
        createMockItem({ id: '2', title: 'Another Book' }),
      ];
      index.build(items);
    });

    it('returns item by ID', () => {
      const item = index.getById('1');

      expect(item).toBeDefined();
      expect(item?.id).toBe('1');
    });

    it('returns undefined for unknown ID', () => {
      const item = index.getById('unknown');

      expect(item).toBeUndefined();
    });
  });

  describe('performance', () => {
    it('builds index for 1000 items quickly', () => {
      const items = Array.from({ length: 1000 }, (_, i) =>
        createMockItem({
          id: `item-${i}`,
          title: `Book Title Number ${i}`,
          author: `Author ${i % 100}`,
          series: i % 10 === 0 ? `Series ${i % 20}` : '',
        })
      );

      const startTime = performance.now();
      index.build(items);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(500); // Should be < 500ms
      expect(index.getStats().itemCount).toBe(1000);
    });

    it('searches 1000 items quickly', () => {
      const items = Array.from({ length: 1000 }, (_, i) =>
        createMockItem({
          id: `item-${i}`,
          title: `Book Title Number ${i}`,
          author: `Author ${i % 100}`,
        })
      );
      index.build(items);

      const startTime = performance.now();
      const results = index.search('book title');
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(100); // Should be < 100ms
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('handles items with missing metadata', () => {
      const items = [
        { id: '1', ino: '1', libraryId: 'lib-1', media: null } as any,
        { id: '2', ino: '2', libraryId: 'lib-1', media: { metadata: null } } as any,
      ];

      // Should not throw
      expect(() => index.build(items)).not.toThrow();
      expect(index.getStats().itemCount).toBe(2);
    });

    it('handles special characters in search', () => {
      const items = [
        createMockItem({ id: '1', title: "Harry Potter & the Philosopher's Stone" }),
        createMockItem({ id: '2', title: 'The A-Team: Special Edition' }),
      ];
      index.build(items);

      const results1 = index.search("philosopher's");
      expect(results1.length).toBe(1);

      const results2 = index.search('a-team');
      expect(results2.length).toBe(1);
    });

    it('handles unicode characters', () => {
      const items = [
        createMockItem({ id: '1', title: 'Café Stories' }),
        createMockItem({ id: '2', title: 'El Niño Tales' }),
      ];
      index.build(items);

      const results = index.search('café');
      expect(results.length).toBe(1);
      expect(results[0].item.id).toBe('1');
    });
  });
});
