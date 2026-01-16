/**
 * src/features/home/utils/spine/genre/profiles/index.ts
 *
 * Aggregates all genre profiles.
 * Allows tree-shaking to remove unused profiles.
 */

import { GenreTypographyProfile } from '../../typography/types';
import { FANTASY_PROFILE } from './fantasy';
import { THRILLER_PROFILE } from './thriller';
import { ROMANCE_PROFILE } from './romance';

/**
 * All genre typography profiles.
 * Add new profiles here as they're created.
 */
export const GENRE_PROFILES: Record<string, GenreTypographyProfile> = {
  'fantasy': FANTASY_PROFILE,
  'thriller': THRILLER_PROFILE,
  'romance': ROMANCE_PROFILE,

  // TODO: Add remaining 47+ genres
  // This allows gradual migration from old system
};

/**
 * Get typography profile for genre.
 * Returns default if not found.
 */
export function getGenreProfile(profileName: string): GenreTypographyProfile {
  return GENRE_PROFILES[profileName] || DEFAULT_PROFILE;
}

/**
 * Default profile for unknown genres.
 */
const DEFAULT_PROFILE: GenreTypographyProfile = {
  name: 'default',
  displayName: 'Fiction',
  priority: 0,

  typography: {
    title: {
      fontFamily: 'Lora-Regular',
      weight: 'medium',
      style: 'normal',
      transform: 'capitalize',
      letterSpacing: 0.01,
    },

    author: {
      fontFamily: 'Lora-Regular',
      weight: 'regular',
      style: 'normal',
      transform: 'capitalize',
      letterSpacing: 0.01,
      abbreviation: 'auto',
    },

    layout: {
      authorPosition: 'top',
      authorOrientationBias: 'neutral',
      authorBox: false,
    },

    personality: 'classic',
  },
};
