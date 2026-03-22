/**
 * src/features/home/utils/spine/genreVisualConfig.ts
 *
 * Maps genres to visual identity for generative spines:
 * paper backgrounds, text colors, genre-appropriate fonts.
 */

import { normalizeGenre } from './styles/genreMap';
import { matchBestGenre } from './genre/matcher';

// =============================================================================
// TYPES
// =============================================================================

export interface GenreVisualConfig {
  backgrounds: string[];
  titleFonts: string[];
  authorFonts: string[];
  isDark: boolean;
}

// =============================================================================
// COLOR HELPERS (matching playground fg/fg2/fgS/rc)
// =============================================================================

/** Primary text color */
export function fg(isDark: boolean): string {
  return isDark ? '#EEEBE5' : '#18180F';
}

/** Secondary text — author first name, muted */
export function fg2(isDark: boolean): string {
  return isDark ? 'rgba(238,235,229,0.55)' : 'rgba(24,24,15,0.38)';
}

/** Semi-bold text — author last name */
export function fgS(isDark: boolean): string {
  return isDark ? 'rgba(238,235,229,0.82)' : 'rgba(24,24,15,0.58)';
}

/** Rule/decoration color */
export function rc(isDark: boolean): string {
  return isDark ? 'rgba(238,235,229,0.13)' : 'rgba(24,24,15,0.11)';
}

// =============================================================================
// GENRE VISUAL CONFIGS
// =============================================================================

const GENRE_VISUALS: Record<string, GenreVisualConfig> = {
  // Fantasy
  'fantasy': {
    backgrounds: ['#F5F0E8', '#EDE6D6', '#F0E8D8', '#E8E0D0'],
    titleFonts: ['GravitasOne-Regular', 'AlmendraSC-Regular', 'PlayfairDisplay-Bold'],
    authorFonts: ['LibreBaskerville-Regular', 'Lora-Regular'],
    isDark: false,
  },
  'epic-fantasy': {
    backgrounds: ['#F3EDE2', '#EAE2D4', '#F0E6D6', '#E6DED0'],
    titleFonts: ['GravitasOne-Regular', 'AlmendraSC-Regular'],
    authorFonts: ['LibreBaskerville-Regular', 'Lora-Regular'],
    isDark: false,
  },
  'dark-fantasy': {
    backgrounds: ['#F3EDE2', '#EAE2D4'],
    titleFonts: ['GrenzeGotisch-Regular', 'GravitasOne-Regular'],
    authorFonts: ['Lora-Regular'],
    isDark: false,
  },

  // Sci-Fi
  'science-fiction': {
    backgrounds: ['#EEF1F5', '#E4E9EF', '#E8ECF2', '#DDE3EB'],
    titleFonts: ['Orbitron-Regular', 'ZenDots-Regular'],
    authorFonts: ['Oswald-Regular'],
    isDark: false,
  },
  'sci-fi': {
    backgrounds: ['#EEF1F5', '#E4E9EF'],
    titleFonts: ['Orbitron-Regular', 'ZenDots-Regular'],
    authorFonts: ['Oswald-Regular'],
    isDark: false,
  },
  'dystopian': {
    backgrounds: ['#EEF1F5', '#E4E9EF'],
    titleFonts: ['Orbitron-Regular', 'Oswald-Bold'],
    authorFonts: ['Oswald-Regular'],
    isDark: false,
  },

  // Thriller & Dark
  'thriller': {
    backgrounds: ['#1A1A1A', '#222222', '#2A2A2A', '#181818'],
    titleFonts: ['Oswald-Bold', 'GravitasOne-Regular', 'BebasNeue-Regular'],
    authorFonts: ['Oswald-Regular'],
    isDark: true,
  },
  'suspense': {
    backgrounds: ['#1A1A1A', '#222222'],
    titleFonts: ['Oswald-Bold', 'BebasNeue-Regular'],
    authorFonts: ['Oswald-Regular'],
    isDark: true,
  },
  'horror': {
    backgrounds: ['#181518', '#201C20', '#1A161A', '#151015'],
    titleFonts: ['GrenzeGotisch-Regular', 'Eater-Regular'],
    authorFonts: ['Lora-Regular'],
    isDark: true,
  },

  // Mystery
  'mystery': {
    backgrounds: ['#F0EDE8', '#E8E4DE', '#ECE8E2', '#E4E0D8'],
    titleFonts: ['PlayfairDisplay-Bold', 'Lora-Bold'],
    authorFonts: ['Lora-Regular'],
    isDark: false,
  },

  // Romance
  'romance': {
    backgrounds: ['#F8F0F0', '#F2E8E8', '#F5EDED', '#EFE4E4'],
    titleFonts: ['Charm-Regular', 'PlayfairDisplay-Regular'],
    authorFonts: ['PlayfairDisplay-Regular', 'Lora-Regular'],
    isDark: false,
  },
  'historical-romance': {
    backgrounds: ['#F8F0F0', '#F2E8E8'],
    titleFonts: ['Charm-Regular', 'PlayfairDisplay-Regular'],
    authorFonts: ['PlayfairDisplay-Regular'],
    isDark: false,
  },

  // Literary
  'literary-fiction': {
    backgrounds: ['#F5F3F0', '#EFECE8', '#F2F0EC', '#EBE8E4'],
    titleFonts: ['PlayfairDisplay-Bold', 'Lora-Bold', 'LibreBaskerville-Bold'],
    authorFonts: ['LibreBaskerville-Regular', 'Lora-Regular'],
    isDark: false,
  },
  'classics': {
    backgrounds: ['#F5F3F0', '#EFECE8'],
    titleFonts: ['PlayfairDisplay-Bold', 'LibreBaskerville-Bold'],
    authorFonts: ['LibreBaskerville-Regular'],
    isDark: false,
  },

  // Biography & History
  'biography': {
    backgrounds: ['#F0F2F5', '#E8EBF0', '#ECEFF3', '#E2E6EC'],
    titleFonts: ['LibreBaskerville-Bold', 'Lora-Bold'],
    authorFonts: ['Lora-Regular'],
    isDark: false,
  },
  'memoir': {
    backgrounds: ['#F0F2F5', '#E8EBF0'],
    titleFonts: ['LibreBaskerville-Bold', 'PlayfairDisplay-Bold'],
    authorFonts: ['Lora-Regular'],
    isDark: false,
  },
  'history': {
    backgrounds: ['#F2F0E8', '#EAE8DE', '#EEECE2', '#E4E2D8'],
    titleFonts: ['GravitasOne-Regular', 'LibreBaskerville-Bold'],
    authorFonts: ['LibreBaskerville-Regular', 'Lora-Regular'],
    isDark: false,
  },

  // Non-Fiction
  'non-fiction': {
    backgrounds: ['#F5F5F5', '#EEEEEE', '#F0F0F0', '#E8E8E8'],
    titleFonts: ['BebasNeue-Regular', 'Oswald-Bold'],
    authorFonts: ['Oswald-Regular'],
    isDark: false,
  },
  'self-help': {
    backgrounds: ['#F8F5F0', '#F2EEE6', '#F5F2EC', '#EFEBE4'],
    titleFonts: ['Oswald-Bold', 'BebasNeue-Regular'],
    authorFonts: ['Oswald-Regular'],
    isDark: false,
  },
  'business': {
    backgrounds: ['#F5F5F5', '#EEEEEE'],
    titleFonts: ['BebasNeue-Regular', 'Oswald-Bold'],
    authorFonts: ['Oswald-Regular'],
    isDark: false,
  },
  'science': {
    backgrounds: ['#F0F2F5', '#E8EBF0'],
    titleFonts: ['Oswald-Bold', 'BebasNeue-Regular'],
    authorFonts: ['Oswald-Regular'],
    isDark: false,
  },

  // Poetry & Arts
  'poetry': {
    backgrounds: ['#F8F5F8', '#F2EEF2', '#F5F2F5', '#EFEBEF'],
    titleFonts: ['Charm-Regular', 'PlayfairDisplay-Regular'],
    authorFonts: ['PlayfairDisplay-Regular', 'Lora-Regular'],
    isDark: false,
  },

  // Young Adult & Humor
  'young-adult': {
    backgrounds: ['#F0F0F8', '#E8E8F2', '#ECECF5', '#E2E2EF'],
    titleFonts: ['Oswald-Bold', 'BebasNeue-Regular'],
    authorFonts: ['Oswald-Regular'],
    isDark: false,
  },
  'humor': {
    backgrounds: ['#F2F5F0', '#EAF0E6', '#EEF2EA', '#E4ECE0'],
    titleFonts: ['Oswald-Bold', 'BebasNeue-Regular'],
    authorFonts: ['Oswald-Regular'],
    isDark: false,
  },

  // Crime & Action
  'crime': {
    backgrounds: ['#1A1A1A', '#222222'],
    titleFonts: ['Oswald-Bold', 'BebasNeue-Regular'],
    authorFonts: ['Oswald-Regular'],
    isDark: true,
  },
  'action': {
    backgrounds: ['#1A1A1A', '#222222'],
    titleFonts: ['Oswald-Bold', 'GravitasOne-Regular'],
    authorFonts: ['Oswald-Regular'],
    isDark: true,
  },

  // Adventure & Western
  'adventure': {
    backgrounds: ['#F2F0E8', '#EAE8DE'],
    titleFonts: ['GravitasOne-Regular', 'Oswald-Bold'],
    authorFonts: ['Lora-Regular'],
    isDark: false,
  },
  'western': {
    backgrounds: ['#F2F0E8', '#EAE8DE'],
    titleFonts: ['GravitasOne-Regular', 'AlfaSlabOne-Regular'],
    authorFonts: ['Lora-Regular'],
    isDark: false,
  },

  // Default
  'default': {
    backgrounds: ['#F5F5F2', '#EEEEEA', '#F0F0EC', '#E8E8E4'],
    titleFonts: ['Lora-Bold', 'LibreBaskerville-Bold'],
    authorFonts: ['Lora-Regular'],
    isDark: false,
  },
};

// =============================================================================
// LOOKUP
// =============================================================================

/**
 * Get visual config for a set of genres.
 * Uses genre matcher to find best match, then looks up visual config.
 */
export function getGenreVisualConfig(genres: string[]): GenreVisualConfig {
  if (genres.length === 0) return GENRE_VISUALS['default'];

  // Try direct match first
  for (const genre of genres) {
    const key = normalizeGenre(genre);
    if (GENRE_VISUALS[key]) return GENRE_VISUALS[key];
  }

  // Use genre matcher for fuzzy matching
  const match = matchBestGenre(genres);
  if (match) {
    const key = normalizeGenre(match.profile);
    if (GENRE_VISUALS[key]) return GENRE_VISUALS[key];
  }

  return GENRE_VISUALS['default'];
}
