/**
 * Tests for Accessibility Utilities
 */

import {
  MIN_TOUCH_TARGET,
  HIT_SLOP,
  calculateHitSlop,
  buildButtonAccessibility,
  buildSliderAccessibility,
  buildProgressAccessibility,
  buildImageAccessibility,
  buildHeadingAccessibility,
  buildLinkAccessibility,
  buildToggleAccessibility,
  buildTabAccessibility,
  buildListItemAccessibility,
  formatTimeForAccessibility,
  formatProgressForAccessibility,
  buildBookDescription,
  checkColorContrast,
} from '../accessibilityUtils';

describe('Accessibility Utils', () => {
  describe('constants', () => {
    it('defines minimum touch target as 44', () => {
      expect(MIN_TOUCH_TARGET).toBe(44);
    });

    it('defines hit slop presets', () => {
      expect(HIT_SLOP.small).toEqual({ top: 6, bottom: 6, left: 6, right: 6 });
      expect(HIT_SLOP.xsmall).toEqual({ top: 10, bottom: 10, left: 10, right: 10 });
      expect(HIT_SLOP.xxsmall).toEqual({ top: 14, bottom: 14, left: 14, right: 14 });
    });
  });

  describe('calculateHitSlop', () => {
    it('returns zero padding for elements at minimum size', () => {
      const result = calculateHitSlop(44, 44);
      expect(result).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    });

    it('returns zero padding for elements larger than minimum', () => {
      const result = calculateHitSlop(60, 50);
      expect(result).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    });

    it('calculates padding for 32pt element', () => {
      const result = calculateHitSlop(32, 32);
      expect(result).toEqual({ top: 6, bottom: 6, left: 6, right: 6 });
    });

    it('calculates padding for 24pt element', () => {
      const result = calculateHitSlop(24, 24);
      expect(result).toEqual({ top: 10, bottom: 10, left: 10, right: 10 });
    });

    it('handles non-square elements', () => {
      const result = calculateHitSlop(24, 44);
      expect(result).toEqual({ top: 0, bottom: 0, left: 10, right: 10 });
    });
  });

  describe('buildButtonAccessibility', () => {
    it('builds basic button props', () => {
      const result = buildButtonAccessibility({ label: 'Play' });

      expect(result).toEqual({
        accessible: true,
        accessibilityLabel: 'Play',
        accessibilityHint: undefined,
        accessibilityRole: 'button',
        accessibilityState: undefined,
      });
    });

    it('includes hint when provided', () => {
      const result = buildButtonAccessibility({
        label: 'Play',
        hint: 'Plays the audiobook',
      });

      expect(result.accessibilityHint).toBe('Plays the audiobook');
    });

    it('includes disabled state', () => {
      const result = buildButtonAccessibility({
        label: 'Play',
        disabled: true,
      });

      expect(result.accessibilityState).toEqual({ disabled: true });
    });

    it('includes selected state', () => {
      const result = buildButtonAccessibility({
        label: 'Like',
        selected: true,
      });

      expect(result.accessibilityState).toEqual({ selected: true });
    });

    it('includes multiple states', () => {
      const result = buildButtonAccessibility({
        label: 'Submit',
        disabled: false,
        busy: true,
      });

      expect(result.accessibilityState).toEqual({ disabled: false, busy: true });
    });
  });

  describe('buildSliderAccessibility', () => {
    it('builds slider props without unit', () => {
      const result = buildSliderAccessibility({
        label: 'Volume',
        value: 50,
        min: 0,
        max: 100,
      });

      expect(result).toEqual({
        accessible: true,
        accessibilityLabel: 'Volume',
        accessibilityRole: 'adjustable',
        accessibilityValue: {
          min: 0,
          max: 100,
          now: 50,
          text: '50',
        },
      });
    });

    it('builds slider props with unit', () => {
      const result = buildSliderAccessibility({
        label: 'Playback speed',
        value: 1.5,
        min: 0.5,
        max: 3.0,
        unit: 'x',
      });

      expect(result.accessibilityValue).toEqual({
        min: 0.5,
        max: 3.0,
        now: 1.5,
        text: '1.5x',
      });
    });
  });

  describe('buildProgressAccessibility', () => {
    it('builds progress props with percentage', () => {
      const result = buildProgressAccessibility({
        label: 'Download progress',
        progress: 45,
      });

      expect(result.accessibilityLabel).toBe('Download progress: 45%');
      expect(result.accessibilityValue?.now).toBe(45);
    });

    it('builds progress props with custom total', () => {
      const result = buildProgressAccessibility({
        label: 'Chapter progress',
        progress: 3,
        total: 10,
      });

      expect(result.accessibilityLabel).toBe('Chapter progress: 30%');
      expect(result.accessibilityValue?.max).toBe(10);
    });

    it('builds progress props with unit', () => {
      const result = buildProgressAccessibility({
        label: 'Storage used',
        progress: 2.5,
        total: 10,
        unit: ' GB',
      });

      expect(result.accessibilityLabel).toBe('Storage used: 2.5 GB');
      expect(result.accessibilityValue?.text).toBe('2.5 GB');
    });
  });

  describe('buildImageAccessibility', () => {
    it('builds image props', () => {
      const result = buildImageAccessibility('Cover art for Harry Potter');

      expect(result).toEqual({
        accessible: true,
        accessibilityLabel: 'Cover art for Harry Potter',
        accessibilityRole: 'image',
      });
    });
  });

  describe('buildHeadingAccessibility', () => {
    it('builds heading props', () => {
      const result = buildHeadingAccessibility('Chapter 1');

      expect(result).toEqual({
        accessible: true,
        accessibilityLabel: 'Chapter 1',
        accessibilityRole: 'header',
      });
    });
  });

  describe('buildLinkAccessibility', () => {
    it('builds link props without hint', () => {
      const result = buildLinkAccessibility('View author');

      expect(result).toEqual({
        accessible: true,
        accessibilityLabel: 'View author',
        accessibilityHint: undefined,
        accessibilityRole: 'link',
      });
    });

    it('builds link props with hint', () => {
      const result = buildLinkAccessibility('View author', 'Opens author profile');

      expect(result.accessibilityHint).toBe('Opens author profile');
    });
  });

  describe('buildToggleAccessibility', () => {
    it('builds toggle props when on', () => {
      const result = buildToggleAccessibility('Dark mode', true);

      expect(result).toEqual({
        accessible: true,
        accessibilityLabel: 'Dark mode',
        accessibilityHint: undefined,
        accessibilityRole: 'switch',
        accessibilityState: { checked: true },
      });
    });

    it('builds toggle props when off', () => {
      const result = buildToggleAccessibility('Dark mode', false);

      expect(result.accessibilityState).toEqual({ checked: false });
    });

    it('includes hint when provided', () => {
      const result = buildToggleAccessibility('Dark mode', false, 'Toggles dark appearance');

      expect(result.accessibilityHint).toBe('Toggles dark appearance');
    });
  });

  describe('buildTabAccessibility', () => {
    it('builds tab props when selected', () => {
      const result = buildTabAccessibility('Home', true);

      expect(result).toEqual({
        accessible: true,
        accessibilityLabel: 'Home',
        accessibilityRole: 'tab',
        accessibilityState: { selected: true },
      });
    });

    it('builds tab props when not selected', () => {
      const result = buildTabAccessibility('Library', false);

      expect(result.accessibilityState).toEqual({ selected: false });
    });
  });

  describe('buildListItemAccessibility', () => {
    it('builds list item props', () => {
      const result = buildListItemAccessibility('Harry Potter, by J.K. Rowling');

      expect(result).toEqual({
        accessible: true,
        accessibilityLabel: 'Harry Potter, by J.K. Rowling',
        accessibilityHint: undefined,
      });
    });

    it('includes hint when provided', () => {
      const result = buildListItemAccessibility(
        'Harry Potter',
        'Double tap to open book details'
      );

      expect(result.accessibilityHint).toBe('Double tap to open book details');
    });
  });

  describe('formatTimeForAccessibility', () => {
    it('formats seconds only', () => {
      expect(formatTimeForAccessibility(30)).toBe('30 seconds');
      expect(formatTimeForAccessibility(1)).toBe('1 second');
    });

    it('formats minutes and seconds', () => {
      expect(formatTimeForAccessibility(90)).toBe('1 minute, 30 seconds');
      expect(formatTimeForAccessibility(125)).toBe('2 minutes, 5 seconds');
    });

    it('formats hours, minutes, and seconds', () => {
      expect(formatTimeForAccessibility(3665)).toBe('1 hour, 1 minute, 5 seconds');
      expect(formatTimeForAccessibility(7320)).toBe('2 hours, 2 minutes');
    });

    it('handles zero', () => {
      expect(formatTimeForAccessibility(0)).toBe('0 seconds');
    });

    it('handles full hours', () => {
      expect(formatTimeForAccessibility(3600)).toBe('1 hour');
      expect(formatTimeForAccessibility(7200)).toBe('2 hours');
    });

    it('handles full minutes', () => {
      expect(formatTimeForAccessibility(120)).toBe('2 minutes');
    });
  });

  describe('formatProgressForAccessibility', () => {
    it('formats progress as percentage', () => {
      expect(formatProgressForAccessibility(0.5)).toBe('50 percent complete');
      expect(formatProgressForAccessibility(0.25)).toBe('25 percent complete');
      expect(formatProgressForAccessibility(1)).toBe('100 percent complete');
    });

    it('rounds to nearest integer', () => {
      expect(formatProgressForAccessibility(0.456)).toBe('46 percent complete');
      expect(formatProgressForAccessibility(0.994)).toBe('99 percent complete');
    });
  });

  describe('buildBookDescription', () => {
    it('builds description with title only', () => {
      expect(buildBookDescription({ title: 'Harry Potter' })).toBe('Harry Potter');
    });

    it('builds description with author', () => {
      expect(buildBookDescription({
        title: 'Harry Potter',
        author: 'J.K. Rowling',
      })).toBe('Harry Potter, by J.K. Rowling');
    });

    it('builds description with narrator', () => {
      expect(buildBookDescription({
        title: 'Harry Potter',
        narrator: 'Stephen Fry',
      })).toBe('Harry Potter, narrated by Stephen Fry');
    });

    it('builds description with duration', () => {
      expect(buildBookDescription({
        title: 'Harry Potter',
        duration: 36000,
      })).toBe('Harry Potter, 10 hours');
    });

    it('builds description with progress', () => {
      expect(buildBookDescription({
        title: 'Harry Potter',
        progress: 0.5,
      })).toBe('Harry Potter, 50 percent complete');
    });

    it('builds full description', () => {
      const result = buildBookDescription({
        title: 'Harry Potter',
        author: 'J.K. Rowling',
        narrator: 'Stephen Fry',
        duration: 36000,
        progress: 0.5,
      });

      expect(result).toBe(
        'Harry Potter, by J.K. Rowling, narrated by Stephen Fry, 10 hours, 50 percent complete'
      );
    });

    it('excludes zero progress', () => {
      expect(buildBookDescription({
        title: 'Harry Potter',
        progress: 0,
      })).toBe('Harry Potter');
    });
  });

  describe('checkColorContrast', () => {
    it('passes for black on white', () => {
      const result = checkColorContrast('#000000', '#FFFFFF');

      expect(result.ratio).toBeGreaterThan(20);
      expect(result.passesNormal).toBe(true);
      expect(result.passesLarge).toBe(true);
    });

    it('passes for white on black', () => {
      const result = checkColorContrast('#FFFFFF', '#000000');

      expect(result.ratio).toBeGreaterThan(20);
      expect(result.passesNormal).toBe(true);
      expect(result.passesLarge).toBe(true);
    });

    it('fails for similar colors', () => {
      const result = checkColorContrast('#888888', '#999999');

      expect(result.ratio).toBeLessThan(3);
      expect(result.passesNormal).toBe(false);
      expect(result.passesLarge).toBe(false);
    });

    it('calculates intermediate contrast', () => {
      // Gold (#F3B60C) on black (#000000) should pass for large text
      const result = checkColorContrast('#F3B60C', '#000000');

      expect(result.ratio).toBeGreaterThan(3);
      expect(result.passesLarge).toBe(true);
    });
  });
});
