/**
 * src/features/home/utils/spine/__tests__/hashing.test.ts
 *
 * Tests for deterministic hashing utilities.
 */

import {
  hashString,
  seededRandom,
  hashToPercent,
  hashToBool,
  hashToPick,
} from '../core/hashing';

describe('Hashing Utilities', () => {
  describe('hashString', () => {
    it('returns consistent hash for same input', () => {
      const hash1 = hashString('book-123');
      const hash2 = hashString('book-123');
      expect(hash1).toBe(hash2);
    });

    it('returns different hashes for different inputs', () => {
      const hash1 = hashString('book-123');
      const hash2 = hashString('book-456');
      expect(hash1).not.toBe(hash2);
    });

    it('handles empty string', () => {
      expect(hashString('')).toBe(0);
    });

    it('returns positive numbers', () => {
      const hash = hashString('test');
      expect(hash).toBeGreaterThanOrEqual(0);
    });

    it('produces well-distributed hashes', () => {
      // Generate 1000 hashes and check distribution
      const hashes = Array.from({ length: 1000 }, (_, i) =>
        hashString(`book-${i}`)
      );

      // Check that hashes are reasonably distributed
      // (no obvious patterns or clustering)
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBeGreaterThan(900); // Should have very few collisions
    });
  });

  describe('seededRandom', () => {
    it('returns consistent value for same seed', () => {
      const r1 = seededRandom(12345, 1, 100);
      const r2 = seededRandom(12345, 1, 100);
      expect(r1).toBe(r2);
    });

    it('returns different values for different seeds', () => {
      const r1 = seededRandom(12345, 1, 100);
      const r2 = seededRandom(54321, 1, 100);
      expect(r1).not.toBe(r2);
    });

    it('returns values within range', () => {
      for (let i = 0; i < 100; i++) {
        const value = seededRandom(i * 1000, 10, 50);
        expect(value).toBeGreaterThanOrEqual(10);
        expect(value).toBeLessThanOrEqual(50);
      }
    });

    it('produces reasonable distribution', () => {
      const values = Array.from({ length: 1000 }, (_, i) =>
        seededRandom(i, 0, 100)
      );

      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      expect(avg).toBeGreaterThan(40);  // Should be near 50
      expect(avg).toBeLessThan(60);
    });
  });

  describe('hashToPercent', () => {
    it('returns value between 0-100', () => {
      for (let i = 0; i < 100; i++) {
        const percent = hashToPercent(`test-${i}`);
        expect(percent).toBeGreaterThanOrEqual(0);
        expect(percent).toBeLessThanOrEqual(100);
      }
    });

    it('returns consistent value for same input', () => {
      const p1 = hashToPercent('book-123');
      const p2 = hashToPercent('book-123');
      expect(p1).toBe(p2);
    });
  });

  describe('hashToBool', () => {
    it('returns true approximately X% of the time', () => {
      const probability = 30;
      let trueCount = 0;
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        if (hashToBool(`test-${i}`, probability)) {
          trueCount++;
        }
      }

      const actualPercent = (trueCount / iterations) * 100;
      expect(actualPercent).toBeGreaterThan(probability - 5);
      expect(actualPercent).toBeLessThan(probability + 5);
    });

    it('returns consistent value for same input', () => {
      const b1 = hashToBool('book-123', 50);
      const b2 = hashToBool('book-123', 50);
      expect(b1).toBe(b2);
    });

    it('returns false for 0% probability', () => {
      expect(hashToBool('test', 0)).toBe(false);
    });

    it('returns true for 100% probability', () => {
      expect(hashToBool('test', 100)).toBe(true);
    });
  });

  describe('hashToPick', () => {
    it('picks consistent item for same input', () => {
      const items = ['a', 'b', 'c', 'd', 'e'];
      const pick1 = hashToPick('book-123', items);
      const pick2 = hashToPick('book-123', items);
      expect(pick1).toBe(pick2);
    });

    it('picks different items for different inputs', () => {
      const items = ['a', 'b', 'c', 'd', 'e'];
      const picks = new Set(
        Array.from({ length: 100 }, (_, i) =>
          hashToPick(`book-${i}`, items)
        )
      );

      // Should pick all items at least once with 100 tries
      expect(picks.size).toBe(items.length);
    });

    it('throws error for empty array', () => {
      expect(() => hashToPick('test', [])).toThrow();
    });

    it('returns single item for single-item array', () => {
      expect(hashToPick('test', ['only'])).toBe('only');
    });
  });
});
