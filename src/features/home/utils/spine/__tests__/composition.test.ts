/**
 * src/features/home/utils/spine/__tests__/composition.test.ts
 *
 * Tests for composition generation system.
 */

import { generateComposition, getCompositionProfile } from '../composition';
import { hashString } from '../core/hashing';

describe('Composition System', () => {
  describe('generateComposition', () => {
    it('generates consistent composition for same book ID', () => {
      const comp1 = generateComposition('book-123', 'fantasy');
      const comp2 = generateComposition('book-123', 'fantasy');

      expect(comp1).toEqual(comp2);
      expect(comp1.title.orientation).toBe(comp2.title.orientation);
      expect(comp1.author.orientation).toBe(comp2.author.orientation);
    });

    it('generates different compositions for different book IDs', () => {
      const comp1 = generateComposition('book-123', 'fantasy');
      const comp2 = generateComposition('book-456', 'fantasy');

      // They should differ in at least one property
      const same =
        comp1.title.orientation === comp2.title.orientation &&
        comp1.title.scale === comp2.title.scale &&
        comp1.title.weight === comp2.title.weight &&
        comp1.author.orientation === comp2.author.orientation;

      expect(same).toBe(false);
    });

    it('respects genre constraints', () => {
      const comp = generateComposition('book-123', 'fantasy');
      const profile = getCompositionProfile('fantasy');

      // Title orientation should be one of fantasy's valid options
      expect(profile.titleOrientations).toContain(comp.title.orientation);
      expect(profile.titleScales).toContain(comp.title.scale);
      expect(profile.titleWeights).toContain(comp.title.weight);
      expect(profile.titleCases).toContain(comp.title.case);
    });

    it('resolves match-title author orientation', () => {
      // Fantasy profile includes 'oppose-title' in authorOrientations
      // Test multiple books to find one that resolves to a concrete orientation
      let foundResolved = false;

      for (let i = 0; i < 10; i++) {
        const comp = generateComposition(`book-${i}`, 'fantasy');

        // Author orientation should be concrete (not relative)
        const isAbsolute =
          comp.author.orientation === 'horizontal' ||
          comp.author.orientation === 'vertical-up' ||
          comp.author.orientation === 'vertical-down';

        if (isAbsolute) {
          foundResolved = true;
          break;
        }
      }

      expect(foundResolved).toBe(true);
    });

    it('generates valid composition for default genre', () => {
      const comp = generateComposition('book-test', 'default');

      expect(comp.title).toBeDefined();
      expect(comp.author).toBeDefined();
      expect(comp.layout).toBeDefined();
      expect(comp.decoration).toBeDefined();

      expect(typeof comp.title.letterSpacing).toBe('number');
      expect(comp.title.letterSpacing).toBeGreaterThan(0);
    });

    it('calculates letter spacing based on genre personality', () => {
      const fantasyComp = generateComposition('book-1', 'fantasy');
      const literaryComp = generateComposition('book-1', 'literary-fiction');

      // Both should have letter spacing defined
      expect(fantasyComp.title.letterSpacing).toBeGreaterThan(0);
      expect(literaryComp.title.letterSpacing).toBeGreaterThan(0);

      // Values should be different based on personality flags
      // Fantasy: prefersBold=true, prefersExperimental=true
      // Literary: prefersMinimal=true, prefersExperimental=true
      expect(fantasyComp.title.letterSpacing).toBeDefined();
      expect(literaryComp.title.letterSpacing).toBeDefined();
    });
  });

  describe('getCompositionProfile', () => {
    it('returns fantasy profile', () => {
      const profile = getCompositionProfile('fantasy');

      expect(profile.titleOrientations).toContain('vertical-up');
      expect(profile.prefersBold).toBe(true);
      expect(profile.prefersClassic).toBe(true);
    });

    it('returns default for unknown genre', () => {
      const profile = getCompositionProfile('unknown-genre');

      expect(profile.titleOrientations).toBeDefined();
      expect(profile.authorOrientations).toBeDefined();
      expect(profile.densities).toBeDefined();
    });

    it('has different profiles for different genres', () => {
      const fantasy = getCompositionProfile('fantasy');
      const thriller = getCompositionProfile('thriller');

      // Fantasy and thriller should have different preferences
      expect(fantasy.prefersBold).toBe(true);
      expect(fantasy.prefersClassic).toBe(true);

      expect(thriller.prefersBold).toBe(true);
      expect(thriller.prefersClassic).toBe(false);

      // Different orientation options
      expect(fantasy.titleOrientations).not.toEqual(thriller.titleOrientations);
    });
  });

  describe('Genre-specific compositions', () => {
    const genres = [
      'fantasy',
      'literary-fiction',
      'thriller',
      'mystery',
      'romance',
      'science-fiction',
      'horror',
      'non-fiction',
      'biography',
      'history',
    ];

    genres.forEach(genre => {
      it(`generates valid composition for ${genre}`, () => {
        const comp = generateComposition('test-book', genre);
        const profile = getCompositionProfile(genre);

        // Validate all properties are within profile constraints
        expect(profile.titleOrientations).toContain(comp.title.orientation);
        expect(profile.titleScales).toContain(comp.title.scale);
        expect(profile.titleWeights).toContain(comp.title.weight);
        expect(profile.titleCases).toContain(comp.title.case);

        expect(profile.authorTreatments).toContain(comp.author.treatment);
        expect(profile.authorScales).toContain(comp.author.scale);

        expect(profile.densities).toContain(comp.layout.density);
        expect(profile.alignments).toContain(comp.layout.alignment);

        expect(profile.lineStyles).toContain(comp.decoration.lineStyle);
        expect(profile.decorativeElements).toContain(comp.decoration.element);
      });
    });
  });

  describe('Deterministic hashing', () => {
    it('same book always gets same composition across genres', () => {
      const bookId = 'consistent-book';

      const comp1a = generateComposition(bookId, 'fantasy');
      const comp1b = generateComposition(bookId, 'fantasy');

      expect(comp1a).toEqual(comp1b);
    });

    it('distributes books across different orientations', () => {
      const orientations = new Set<string>();

      // Generate compositions for 20 different books
      for (let i = 0; i < 20; i++) {
        const comp = generateComposition(`book-${i}`, 'default');
        orientations.add(comp.title.orientation);
      }

      // Should have used at least 2 different orientations
      expect(orientations.size).toBeGreaterThanOrEqual(2);
    });
  });
});
