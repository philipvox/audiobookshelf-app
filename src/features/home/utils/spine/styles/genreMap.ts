/**
 * src/features/home/utils/spine/styles/genreMap.ts
 *
 * Maps 40+ genres to base style + composition preset pairs.
 * Replaces 41 individual profile files with a single lookup table.
 */

import { BaseStyleName } from './baseStyles';
import { CompositionPresetName } from './compositionPresets';

export interface GenreStyleMapping {
  style: BaseStyleName;
  composition: CompositionPresetName;
}

/**
 * Genre to style mapping.
 * Each genre maps to a base typography style and a composition preset.
 *
 * Style determines: fonts, weights, letter-spacing, text case
 * Composition determines: orientations, scales, densities, decorations
 */
export const GENRE_TO_STYLE: Record<string, GenreStyleMapping> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // LITERARY & CLASSICS
  // ═══════════════════════════════════════════════════════════════════════════
  'literary-fiction': { style: 'elegantSerif', composition: 'balanced' },
  'classics': { style: 'classicSerif', composition: 'balanced' },
  'contemporary-fiction': { style: 'elegantSerif', composition: 'balanced' },
  'fiction': { style: 'classicSerif', composition: 'balanced' },

  // ═══════════════════════════════════════════════════════════════════════════
  // THRILLER & ACTION
  // ═══════════════════════════════════════════════════════════════════════════
  'thriller': { style: 'boldSans', composition: 'dramatic' },
  'suspense': { style: 'boldSans', composition: 'dramatic' },
  'action': { style: 'boldSans', composition: 'dramatic' },
  'crime': { style: 'boldSans', composition: 'dramatic' },
  'mystery': { style: 'classicSerif', composition: 'balanced' },
  'cozy-mystery': { style: 'elegantSerif', composition: 'balanced' },
  'espionage': { style: 'boldSans', composition: 'dramatic' },
  'military': { style: 'boldSans', composition: 'dramatic' },
  'true-crime': { style: 'boldSans', composition: 'minimal' },

  // ═══════════════════════════════════════════════════════════════════════════
  // FANTASY & SCI-FI
  // ═══════════════════════════════════════════════════════════════════════════
  'fantasy': { style: 'decorative', composition: 'dramatic' },
  'epic-fantasy': { style: 'decorative', composition: 'dramatic' },
  'urban-fantasy': { style: 'gothic', composition: 'dramatic' },
  'paranormal': { style: 'gothic', composition: 'dramatic' },
  'paranormal-romance': { style: 'gothic', composition: 'balanced' },
  'science-fiction': { style: 'futuristic', composition: 'dramatic' },
  'sci-fi': { style: 'futuristic', composition: 'dramatic' },
  'dystopian': { style: 'futuristic', composition: 'experimental' },
  'litrpg': { style: 'futuristic', composition: 'dramatic' },
  'gamelit': { style: 'futuristic', composition: 'dramatic' },

  // ═══════════════════════════════════════════════════════════════════════════
  // HORROR & DARK
  // ═══════════════════════════════════════════════════════════════════════════
  'horror': { style: 'gothic', composition: 'experimental' },
  'dark-fantasy': { style: 'gothic', composition: 'dramatic' },
  'gothic': { style: 'gothic', composition: 'dramatic' },

  // ═══════════════════════════════════════════════════════════════════════════
  // ROMANCE
  // ═══════════════════════════════════════════════════════════════════════════
  'romance': { style: 'script', composition: 'balanced' },
  'historical-romance': { style: 'script', composition: 'balanced' },
  'contemporary-romance': { style: 'script', composition: 'balanced' },
  'womens-fiction': { style: 'script', composition: 'balanced' },

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTORICAL
  // ═══════════════════════════════════════════════════════════════════════════
  'historical-fiction': { style: 'classicSerif', composition: 'balanced' },
  'history': { style: 'classicSerif', composition: 'balanced' },
  'western': { style: 'decorative', composition: 'dramatic' },

  // ═══════════════════════════════════════════════════════════════════════════
  // NON-FICTION
  // ═══════════════════════════════════════════════════════════════════════════
  'non-fiction': { style: 'modernSans', composition: 'minimal' },
  'biography': { style: 'elegantSerif', composition: 'minimal' },
  'memoir': { style: 'elegantSerif', composition: 'minimal' },
  'autobiography': { style: 'elegantSerif', composition: 'minimal' },
  'self-help': { style: 'modernSans', composition: 'minimal' },
  'self-improvement': { style: 'modernSans', composition: 'minimal' },
  'business': { style: 'modernSans', composition: 'minimal' },
  'finance': { style: 'modernSans', composition: 'minimal' },
  'economics': { style: 'modernSans', composition: 'minimal' },
  'technology': { style: 'futuristic', composition: 'minimal' },
  'science': { style: 'modernSans', composition: 'minimal' },
  'philosophy': { style: 'elegantSerif', composition: 'minimal' },
  'psychology': { style: 'modernSans', composition: 'minimal' },
  'health': { style: 'modernSans', composition: 'minimal' },
  'wellness': { style: 'modernSans', composition: 'minimal' },

  // ═══════════════════════════════════════════════════════════════════════════
  // ARTS & CULTURE
  // ═══════════════════════════════════════════════════════════════════════════
  'poetry': { style: 'script', composition: 'minimal' },
  'art': { style: 'elegantSerif', composition: 'experimental' },
  'art-design': { style: 'elegantSerif', composition: 'experimental' },
  'music': { style: 'elegantSerif', composition: 'balanced' },
  'music-arts': { style: 'elegantSerif', composition: 'balanced' },
  'travel': { style: 'classicSerif', composition: 'balanced' },
  'cooking': { style: 'classicSerif', composition: 'balanced' },
  'food': { style: 'classicSerif', composition: 'balanced' },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIAL CATEGORIES
  // ═══════════════════════════════════════════════════════════════════════════
  'humor': { style: 'boldSans', composition: 'experimental' },
  'comedy': { style: 'boldSans', composition: 'experimental' },
  'satire': { style: 'boldSans', composition: 'experimental' },
  'sports': { style: 'boldSans', composition: 'dramatic' },
  'adventure': { style: 'decorative', composition: 'dramatic' },
  'children': { style: 'boldSans', composition: 'balanced' },
  'young-adult': { style: 'boldSans', composition: 'balanced' },
  'ya': { style: 'boldSans', composition: 'balanced' },
  'anthology': { style: 'classicSerif', composition: 'balanced' },
  'short-stories': { style: 'classicSerif', composition: 'balanced' },

  // ═══════════════════════════════════════════════════════════════════════════
  // DEFAULT
  // ═══════════════════════════════════════════════════════════════════════════
  'default': { style: 'classicSerif', composition: 'balanced' },
};

/**
 * Normalize a genre string for lookup.
 * Converts to lowercase and replaces spaces with hyphens.
 */
export function normalizeGenre(genre: string): string {
  return genre.toLowerCase().trim().replace(/\s+/g, '-');
}

/**
 * Get style mapping for a genre.
 * Returns default if genre not found.
 */
export function getGenreMapping(genre: string): GenreStyleMapping {
  const key = normalizeGenre(genre);
  return GENRE_TO_STYLE[key] || GENRE_TO_STYLE['default'];
}
