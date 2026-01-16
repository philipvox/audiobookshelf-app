/**
 * src/features/home/utils/spine/genre/profiles/romance.ts
 *
 * Romance genre typography profile.
 */

import { GenreTypographyProfile } from '../../typography/types';

/**
 * Romance genre typography.
 *
 * Design philosophy:
 * - Medium-short spines (290px base)
 * - Serif fonts with italic for elegance
 * - Capitalize or Mixed case (not all caps)
 * - Horizontal layout for readability
 * - Warm, inviting personality
 */
export const ROMANCE_PROFILE: GenreTypographyProfile = {
  name: 'romance',
  displayName: 'Romance',
  priority: 100,

  typography: {
    title: {
      fontFamily: 'Lora-Regular',
      weight: 'regular',
      style: 'italic',
      transform: 'capitalize',
      letterSpacing: 0.02,
    },

    author: {
      fontFamily: 'Lora-Regular',
      weight: 'regular',
      style: 'normal',
      transform: 'capitalize',
      letterSpacing: 0.02,
      abbreviation: 'full', // Full name for romance
    },

    layout: {
      authorPosition: 'top',
      authorOrientationBias: 'horizontal',
      authorBox: false,
    },

    personality: 'warm',
  },
};
