/**
 * src/features/home/utils/spine/genre/profiles/fantasy.ts
 *
 * Fantasy genre typography profile.
 * Self-contained module following strategy pattern.
 */

import { GenreTypographyProfile } from '../../typography/types';

/**
 * Fantasy genre typography.
 *
 * Design philosophy:
 * - Tall, dramatic spines (height: 400px base)
 * - Serif fonts with bold weight for epic feel
 * - UPPERCASE titles for classic fantasy look
 * - Vertical orientation for traditional spine aesthetic
 * - No boxes - elegant, refined presentation
 */
export const FANTASY_PROFILE: GenreTypographyProfile = {
  name: 'fantasy',
  displayName: 'Fantasy',
  priority: 100,

  typography: {
    title: {
      fontFamily: 'PlayfairDisplay-Bold',
      weight: 'bold',
      style: 'normal',
      transform: 'uppercase',
      letterSpacing: 0.04, // Wide spacing for epic feel
    },

    author: {
      fontFamily: 'PlayfairDisplay-Regular',
      weight: 'regular',
      style: 'italic',
      transform: 'none',
      letterSpacing: 0.02,
      abbreviation: 'auto', // Full name for literary weight
    },

    layout: {
      authorPosition: 'top',
      authorOrientationBias: 'vertical', // Traditional spine look
      authorBox: false, // Elegant, no boxes
    },

    personality: 'classic',
  },
};
