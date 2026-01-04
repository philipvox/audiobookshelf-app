/**
 * Tests for Smart Rewind Calculator
 *
 * Based on Ebbinghaus forgetting curve research.
 * Tests anchor points documented in smartRewindCalculator.ts
 */

import { calculateSmartRewindSeconds } from '../smartRewindCalculator';

describe('calculateSmartRewindSeconds', () => {
  const DEFAULT_MAX = 60; // 60 second max rewind

  describe('Echoic memory threshold (< 3s)', () => {
    it('returns 0 for 0ms pause', () => {
      expect(calculateSmartRewindSeconds(0, DEFAULT_MAX)).toBe(0);
    });

    it('returns 0 for 1s pause', () => {
      expect(calculateSmartRewindSeconds(1000, DEFAULT_MAX)).toBe(0);
    });

    it('returns 0 for 2.9s pause', () => {
      expect(calculateSmartRewindSeconds(2900, DEFAULT_MAX)).toBe(0);
    });
  });

  describe('Short pause range (3-10s)', () => {
    it('returns ~3s for 3s pause', () => {
      const result = calculateSmartRewindSeconds(3000, DEFAULT_MAX);
      expect(result).toBe(3);
    });

    it('returns ~4s for 6.5s pause (midpoint)', () => {
      const result = calculateSmartRewindSeconds(6500, DEFAULT_MAX);
      expect(result).toBeGreaterThanOrEqual(3);
      expect(result).toBeLessThanOrEqual(5);
    });

    it('returns ~5s for 10s pause', () => {
      const result = calculateSmartRewindSeconds(10000, DEFAULT_MAX);
      expect(result).toBe(5);
    });
  });

  describe('Medium pause range (10-30s)', () => {
    it('returns ~5s at start of range', () => {
      expect(calculateSmartRewindSeconds(10000, DEFAULT_MAX)).toBe(5);
    });

    it('returns between 5-10s for 20s pause', () => {
      const result = calculateSmartRewindSeconds(20000, DEFAULT_MAX);
      expect(result).toBeGreaterThanOrEqual(7);
      expect(result).toBeLessThanOrEqual(8);
    });

    it('returns ~10s for 30s pause', () => {
      const result = calculateSmartRewindSeconds(30000, DEFAULT_MAX);
      expect(result).toBe(10);
    });
  });

  describe('Longer pause ranges', () => {
    it('returns ~15s for 2min pause', () => {
      const result = calculateSmartRewindSeconds(120000, DEFAULT_MAX);
      expect(result).toBe(15);
    });

    it('returns ~20s for 5min pause', () => {
      const result = calculateSmartRewindSeconds(300000, DEFAULT_MAX);
      expect(result).toBe(20);
    });

    it('returns ~25s for 15min pause', () => {
      const result = calculateSmartRewindSeconds(900000, DEFAULT_MAX);
      expect(result).toBe(25);
    });

    it('returns ~30s for 1hr pause', () => {
      const result = calculateSmartRewindSeconds(3600000, DEFAULT_MAX);
      expect(result).toBe(30);
    });
  });

  describe('Extended pause (1hr - 24hr)', () => {
    it('returns 30-45s for 12hr pause', () => {
      const result = calculateSmartRewindSeconds(12 * 3600 * 1000, DEFAULT_MAX);
      expect(result).toBeGreaterThanOrEqual(30);
      expect(result).toBeLessThanOrEqual(45);
    });
  });

  describe('Maximum rewind (24hr+)', () => {
    it('returns max for 24hr pause', () => {
      expect(calculateSmartRewindSeconds(86400000, DEFAULT_MAX)).toBe(DEFAULT_MAX);
    });

    it('returns max for 48hr pause', () => {
      expect(calculateSmartRewindSeconds(172800000, DEFAULT_MAX)).toBe(DEFAULT_MAX);
    });

    it('respects custom max rewind', () => {
      expect(calculateSmartRewindSeconds(86400000, 30)).toBe(30);
      expect(calculateSmartRewindSeconds(86400000, 120)).toBe(120);
    });
  });

  describe('Max rewind clamping', () => {
    it('never exceeds max rewind', () => {
      const result = calculateSmartRewindSeconds(100000000, 20);
      expect(result).toBe(20);
    });

    it('clamps intermediate values to max', () => {
      // 1hr would normally give 30s, but max is 15s
      const result = calculateSmartRewindSeconds(3600000, 15);
      expect(result).toBe(15);
    });
  });

  describe('Edge cases', () => {
    it('handles negative pause duration', () => {
      const result = calculateSmartRewindSeconds(-1000, DEFAULT_MAX);
      expect(result).toBe(0);
    });

    it('handles very small max rewind', () => {
      const result = calculateSmartRewindSeconds(3600000, 5);
      expect(result).toBe(5);
    });

    it('returns integer values', () => {
      // Mid-range values should still return integers
      const result = calculateSmartRewindSeconds(15000, DEFAULT_MAX);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('Monotonic increase', () => {
    it('rewind increases with pause duration', () => {
      const pauses = [3, 10, 30, 120, 300, 900, 3600].map((s) => s * 1000);
      const rewinds = pauses.map((p) => calculateSmartRewindSeconds(p, DEFAULT_MAX));

      for (let i = 1; i < rewinds.length; i++) {
        expect(rewinds[i]).toBeGreaterThanOrEqual(rewinds[i - 1]);
      }
    });
  });
});
