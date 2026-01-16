/**
 * src/features/home/utils/spine/__tests__/genre-matcher.test.ts
 *
 * Tests for genre matching system.
 */

import {
  normalizeGenre,
  matchGenre,
  matchBestGenre,
  matchComboGenres,
  areGenresEquivalent,
} from '../genre/matcher';

describe('Genre Matcher', () => {
  describe('normalizeGenre', () => {
    it('lowercases genre', () => {
      expect(normalizeGenre('FANTASY')).toBe('fantasy');
      expect(normalizeGenre('Science Fiction')).toBe('science fiction');
    });

    it('trims whitespace', () => {
      expect(normalizeGenre('  fantasy  ')).toBe('fantasy');
    });

    it('normalizes multiple spaces', () => {
      expect(normalizeGenre('science    fiction')).toBe('science fiction');
    });

    it('normalizes apostrophes', () => {
      expect(normalizeGenre("children's")).toBe("children's");
      expect(normalizeGenre("children's")).toBe("children's");  // Smart quote converted to regular
    });

    it('removes special characters', () => {
      expect(normalizeGenre('sci-fi/fantasy')).toBe('sci-fi');
    });
  });

  describe('matchGenre', () => {
    it('matches exact genre names', () => {
      expect(matchGenre('Fantasy')).not.toBeNull();
      expect(matchGenre('Fantasy')?.profile).toBe('fantasy');
    });

    it('matches case-insensitively', () => {
      expect(matchGenre('FANTASY')).not.toBeNull();
      expect(matchGenre('fantasy')).not.toBeNull();
      expect(matchGenre('FaNtAsY')).not.toBeNull();
    });

    it('matches aliases', () => {
      expect(matchGenre('sci-fi')?.profile).toBe('science-fiction');
      expect(matchGenre('scifi')?.profile).toBe('science-fiction');
    });

    it('matches prefix for compound genres', () => {
      const match = matchGenre('Science Fiction & Fantasy');
      expect(match).not.toBeNull();
      expect(match?.profile).toBe('science-fiction');
    });

    it('returns null for unknown genres', () => {
      expect(matchGenre('Unknown Genre')).toBeNull();
      expect(matchGenre('Not A Real Genre')).toBeNull();
    });

    it('matches specific subgenres', () => {
      expect(matchGenre('Epic Fantasy')?.profile).toBe('fantasy');
      expect(matchGenre('Cozy Mystery')?.profile).toBe('mystery');
      expect(matchGenre('Historical Romance')?.profile).toBe('romance');
    });
  });

  describe('matchBestGenre', () => {
    it('returns highest priority match', () => {
      const genres = ['Fiction', 'Fantasy', 'Adventure'];
      const match = matchBestGenre(genres);
      expect(match?.profile).toBe('fantasy'); // Fantasy has higher priority than Fiction
    });

    it('returns null for empty array', () => {
      expect(matchBestGenre([])).toBeNull();
      expect(matchBestGenre(undefined)).toBeNull();
    });

    it('handles single genre', () => {
      const match = matchBestGenre(['Romance']);
      expect(match?.profile).toBe('romance');
    });

    it('prioritizes specific over generic', () => {
      const genres = ['Fiction', 'Thriller'];
      const match = matchBestGenre(genres);
      expect(match?.profile).toBe('thriller'); // More specific
    });

    it('uses priority when multiple genres match', () => {
      const genres = ['Epic Fantasy', 'Fantasy', 'Fiction'];
      const match = matchBestGenre(genres);
      expect(match?.priority).toBeGreaterThan(100); // Epic Fantasy has higher priority
    });
  });

  describe('matchComboGenres', () => {
    it('returns tuple for two different genres', () => {
      const result = matchComboGenres(['Fantasy', 'Romance']);
      expect(result).not.toBeNull();
      expect(result![0].profile).toBe('fantasy');
      expect(result![1].profile).toBe('romance');
    });

    it('returns null for same genre twice', () => {
      const result = matchComboGenres(['Fantasy', 'Epic Fantasy']);
      expect(result).toBeNull(); // Both map to 'fantasy'
    });

    it('returns null for single genre', () => {
      expect(matchComboGenres(['Fantasy'])).toBeNull();
    });

    it('returns null for empty array', () => {
      expect(matchComboGenres([])).toBeNull();
      expect(matchComboGenres(undefined)).toBeNull();
    });

    it('only checks first two genres', () => {
      const result = matchComboGenres(['Fantasy', 'Romance', 'Adventure']);
      expect(result).not.toBeNull();
      expect(result![0].profile).toBe('fantasy');
      expect(result![1].profile).toBe('romance');
    });
  });

  describe('areGenresEquivalent', () => {
    it('returns true for same genre', () => {
      expect(areGenresEquivalent('Fantasy', 'Fantasy')).toBe(true);
    });

    it('returns true for different spellings of same genre', () => {
      expect(areGenresEquivalent('Science Fiction', 'sci-fi')).toBe(true);
      expect(areGenresEquivalent('scifi', 'Science Fiction')).toBe(true);
    });

    it('returns false for different genres', () => {
      expect(areGenresEquivalent('Fantasy', 'Romance')).toBe(false);
      expect(areGenresEquivalent('Thriller', 'Mystery')).toBe(false);
    });

    it('handles case differences', () => {
      expect(areGenresEquivalent('FANTASY', 'fantasy')).toBe(true);
    });

    it('returns false when one genre is unknown', () => {
      expect(areGenresEquivalent('Fantasy', 'Unknown')).toBe(false);
    });
  });
});
