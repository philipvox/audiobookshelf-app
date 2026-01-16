/**
 * src/features/home/utils/spine/genre/profiles/thriller.ts
 *
 * Thriller genre typography profile.
 */

import { GenreTypographyProfile } from '../../typography/types';

/**
 * Thriller genre typography.
 *
 * Design philosophy:
 * - Medium height spines (330px base)
 * - Sans-serif fonts for modern, commercial look
 * - UPPERCASE, bold titles for impact
 * - Horizontal author boxes for commercial appeal
 * - High contrast, bold personality
 */
export const THRILLER_PROFILE: GenreTypographyProfile = {
  name: 'thriller',
  displayName: 'Thriller',
  priority: 100,

  typography: {
    title: {
      fontFamily: 'BebasNeue-Regular',
      weight: 'bold',
      style: 'normal',
      transform: 'uppercase',
      letterSpacing: 0.06, // Extra wide for tension
    },

    author: {
      fontFamily: 'Oswald-Bold',
      weight: 'bold',
      style: 'normal',
      transform: 'uppercase',
      letterSpacing: 0.04,
      abbreviation: 'last-only', // "KING" not "Stephen King"
    },

    layout: {
      authorPosition: 'top',
      authorOrientationBias: 'horizontal', // Commercial look
      authorBox: true, // Boxed author for impact
    },

    personality: 'bold',
  },
};
