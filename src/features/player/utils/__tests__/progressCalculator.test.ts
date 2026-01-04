/**
 * Tests for Progress Calculator utility functions
 */

import {
  calculateProgress,
  isBookComplete,
  formatDuration,
  formatRemaining,
  clampPosition,
  calculateSkipPosition,
  calculateProgressPercent,
  calculateTimeRemaining,
  formatTimeRemainingWithRate,
} from '../progressCalculator';

describe('calculateProgress', () => {
  it('returns 0 for position 0', () => {
    expect(calculateProgress(0, 3600)).toBe(0);
  });

  it('returns 0.5 for halfway', () => {
    expect(calculateProgress(1800, 3600)).toBe(0.5);
  });

  it('returns 1 for complete', () => {
    expect(calculateProgress(3600, 3600)).toBe(1);
  });

  it('returns 0 for zero duration', () => {
    expect(calculateProgress(100, 0)).toBe(0);
  });

  it('returns 0 for negative duration', () => {
    expect(calculateProgress(100, -100)).toBe(0);
  });

  it('clamps to 0 for negative position', () => {
    expect(calculateProgress(-100, 3600)).toBe(0);
  });

  it('clamps to 1 for position beyond duration', () => {
    expect(calculateProgress(5000, 3600)).toBe(1);
  });

  it('handles fractional progress', () => {
    const result = calculateProgress(900, 3600);
    expect(result).toBe(0.25);
  });
});

describe('isBookComplete', () => {
  it('returns true at 100%', () => {
    expect(isBookComplete(3600, 3600)).toBe(true);
  });

  it('returns true at 99%', () => {
    expect(isBookComplete(3564, 3600)).toBe(true);
  });

  it('returns false at 98%', () => {
    expect(isBookComplete(3528, 3600)).toBe(false);
  });

  it('uses custom threshold', () => {
    expect(isBookComplete(3420, 3600, 0.95)).toBe(true); // 95%
    expect(isBookComplete(3400, 3600, 0.95)).toBe(false); // 94.4%
  });

  it('returns false for zero duration', () => {
    expect(isBookComplete(100, 0)).toBe(false);
  });
});

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2:05');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatDuration(3725)).toBe('1:02:05');
  });

  it('pads seconds correctly', () => {
    expect(formatDuration(61)).toBe('1:01');
  });

  it('pads minutes correctly in hour format', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('handles negative values', () => {
    expect(formatDuration(-100)).toBe('0:00');
  });

  it('handles NaN', () => {
    expect(formatDuration(NaN)).toBe('0:00');
  });

  it('handles Infinity', () => {
    expect(formatDuration(Infinity)).toBe('0:00');
  });

  it('truncates fractional seconds', () => {
    expect(formatDuration(65.9)).toBe('1:05');
  });
});

describe('formatRemaining', () => {
  it('formats remaining time with minus sign', () => {
    expect(formatRemaining(1800, 3600)).toBe('-30:00');
  });

  it('shows 0:00 when complete', () => {
    expect(formatRemaining(3600, 3600)).toBe('-0:00');
  });

  it('handles position beyond duration', () => {
    expect(formatRemaining(4000, 3600)).toBe('-0:00');
  });

  it('shows full duration at start', () => {
    expect(formatRemaining(0, 3600)).toBe('-1:00:00');
  });
});

describe('clampPosition', () => {
  it('returns position when in bounds', () => {
    expect(clampPosition(1800, 3600)).toBe(1800);
  });

  it('clamps to 0 for negative position', () => {
    expect(clampPosition(-100, 3600)).toBe(0);
  });

  it('clamps to duration for position beyond duration', () => {
    expect(clampPosition(5000, 3600)).toBe(3600);
  });

  it('handles zero duration', () => {
    expect(clampPosition(100, 0)).toBe(0);
  });
});

describe('calculateSkipPosition', () => {
  it('skips forward correctly', () => {
    expect(calculateSkipPosition(1800, 30, 3600)).toBe(1830);
  });

  it('skips backward correctly', () => {
    expect(calculateSkipPosition(1800, -30, 3600)).toBe(1770);
  });

  it('clamps forward skip to duration', () => {
    expect(calculateSkipPosition(3590, 30, 3600)).toBe(3600);
  });

  it('clamps backward skip to zero', () => {
    expect(calculateSkipPosition(20, -30, 3600)).toBe(0);
  });
});

describe('calculateProgressPercent', () => {
  it('returns 0 at start', () => {
    expect(calculateProgressPercent(0, 3600)).toBe(0);
  });

  it('returns 50 at halfway', () => {
    expect(calculateProgressPercent(1800, 3600)).toBe(50);
  });

  it('returns 100 at end', () => {
    expect(calculateProgressPercent(3600, 3600)).toBe(100);
  });

  it('rounds to nearest integer', () => {
    expect(calculateProgressPercent(1000, 3600)).toBe(28); // 27.78%
  });
});

describe('calculateTimeRemaining', () => {
  it('calculates remaining at normal speed', () => {
    expect(calculateTimeRemaining(1800, 3600, 1.0)).toBe(1800);
  });

  it('adjusts for faster playback', () => {
    expect(calculateTimeRemaining(1800, 3600, 2.0)).toBe(900);
  });

  it('adjusts for slower playback', () => {
    expect(calculateTimeRemaining(1800, 3600, 0.5)).toBe(3600);
  });

  it('handles zero rate (uses minimum)', () => {
    const result = calculateTimeRemaining(1800, 3600, 0);
    expect(result).toBeGreaterThan(0);
  });

  it('returns 0 at end', () => {
    expect(calculateTimeRemaining(3600, 3600, 1.0)).toBe(0);
  });
});

describe('formatTimeRemainingWithRate', () => {
  it('formats remaining time at normal speed', () => {
    expect(formatTimeRemainingWithRate(0, 3600, 1.0)).toBe('1:00:00');
  });

  it('shows less time at faster speed', () => {
    expect(formatTimeRemainingWithRate(0, 3600, 2.0)).toBe('30:00');
  });

  it('shows more time at slower speed', () => {
    expect(formatTimeRemainingWithRate(0, 3600, 0.5)).toBe('2:00:00');
  });
});
