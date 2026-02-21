/**
 * src/features/home/utils/spine/styles/baseStyles.ts
 *
 * 8 base typography styles that cover all visual categories.
 * Each genre maps to one of these base styles, reducing 41 profiles to 8 reusable patterns.
 */

import { FontFamily, FontWeight, TextCase } from '../profiles/types';

export interface BaseTypographyStyle {
  title: {
    fontFamily: FontFamily;
    fontFamilies?: FontFamily[];
    weight: FontWeight;
    case: TextCase;
    letterSpacing: number;
  };
  author: {
    fontFamily: FontFamily;
    fontFamilies?: FontFamily[];
    weight: FontWeight;
    case: TextCase;
    letterSpacing: number;
  };
}

/**
 * 8 base typography styles covering all visual aesthetics:
 *
 * 1. elegantSerif - Literary fiction, classics, refined reads
 * 2. classicSerif - General fiction, biography, history
 * 3. boldSans - Thriller, action, military, sports
 * 4. modernSans - Non-fiction, self-help, business, technology
 * 5. script - Romance, women's fiction, poetry
 * 6. gothic - Horror, dark fantasy, gothic fiction
 * 7. futuristic - Science fiction, dystopian, LitRPG
 * 8. decorative - Fantasy, adventure, epic tales
 */
export const BASE_STYLES: Record<string, BaseTypographyStyle> = {
  // Elegant serif - refined, literary
  elegantSerif: {
    title: {
      fontFamily: 'PlayfairDisplay-Bold',
      fontFamilies: ['PlayfairDisplay-Bold', 'PlayfairDisplay-Regular', 'Lora-Bold'],
      weight: '600',
      case: 'capitalize',
      letterSpacing: 0.04,
    },
    author: {
      fontFamily: 'PlayfairDisplay-Regular',
      fontFamilies: ['PlayfairDisplay-Regular', 'Lora-Regular'],
      weight: '400',
      case: 'capitalize',
      letterSpacing: 0.02,
    },
  },

  // Classic serif - traditional, readable
  classicSerif: {
    title: {
      fontFamily: 'Lora-Bold',
      fontFamilies: ['Lora-Bold', 'NotoSerif-Bold', 'LibreBaskerville-Bold'],
      weight: '700',
      case: 'capitalize',
      letterSpacing: 0.03,
    },
    author: {
      fontFamily: 'Lora-Regular',
      fontFamilies: ['Lora-Regular', 'NotoSerif-Regular'],
      weight: '400',
      case: 'capitalize',
      letterSpacing: 0.02,
    },
  },

  // Bold sans-serif - impactful, urgent
  boldSans: {
    title: {
      fontFamily: 'Oswald-Bold',
      fontFamilies: ['GravitasOne-Regular', 'AlfaSlabOne-Regular', 'Oswald-Bold'],
      weight: '900',
      case: 'uppercase',
      letterSpacing: 0.06,
    },
    author: {
      fontFamily: 'Oswald-Regular',
      fontFamilies: ['Oswald-Regular', 'BebasNeue-Regular'],
      weight: '700',
      case: 'uppercase',
      letterSpacing: 0.04,
    },
  },

  // Modern sans-serif - clean, professional
  modernSans: {
    title: {
      fontFamily: 'BebasNeue-Regular',
      fontFamilies: ['BebasNeue-Regular', 'Oswald-Bold'],
      weight: '400',
      case: 'uppercase',
      letterSpacing: 0.08,
    },
    author: {
      fontFamily: 'Oswald-Regular',
      fontFamilies: ['Oswald-Regular', 'BebasNeue-Regular'],
      weight: '500',
      case: 'uppercase',
      letterSpacing: 0.04,
    },
  },

  // Script - flowing, romantic
  script: {
    title: {
      fontFamily: 'Charm-Regular',
      fontFamilies: ['Charm-Regular', 'FleurDeLeah-Regular'],
      weight: '400',
      case: 'capitalize',
      letterSpacing: 0.04,
    },
    author: {
      fontFamily: 'PlayfairDisplay-Regular',
      fontFamilies: ['PlayfairDisplay-Regular', 'Lora-Regular'],
      weight: '400',
      case: 'capitalize',
      letterSpacing: 0.02,
    },
  },

  // Gothic - dark, atmospheric
  gothic: {
    title: {
      fontFamily: 'GrenzeGotisch-Regular',
      fontFamilies: ['GrenzeGotisch-Regular', 'UncialAntiqua-Regular'],
      weight: '400',
      case: 'capitalize',
      letterSpacing: 0.05,
    },
    author: {
      fontFamily: 'Lora-Regular',
      fontFamilies: ['Lora-Regular', 'NotoSerif-Regular'],
      weight: '400',
      case: 'capitalize',
      letterSpacing: 0.02,
    },
  },

  // Futuristic - tech, sci-fi
  futuristic: {
    title: {
      fontFamily: 'Orbitron-Regular',
      fontFamilies: ['Orbitron-Regular', 'ZenDots-Regular', 'Silkscreen-Regular'],
      weight: '400',
      case: 'uppercase',
      letterSpacing: 0.1,
    },
    author: {
      fontFamily: 'Oswald-Regular',
      fontFamilies: ['Oswald-Regular', 'BebasNeue-Regular'],
      weight: '500',
      case: 'uppercase',
      letterSpacing: 0.04,
    },
  },

  // Decorative - fantasy, epic
  decorative: {
    title: {
      fontFamily: 'GravitasOne-Regular',
      fontFamilies: ['GravitasOne-Regular', 'AlmendraSC-Regular', 'AlfaSlabOne-Regular'],
      weight: '400',
      case: 'uppercase',
      letterSpacing: 0.08,
    },
    author: {
      fontFamily: 'Lora-Regular',
      fontFamilies: ['Lora-Regular', 'LibreBaskerville-Regular'],
      weight: '400',
      case: 'capitalize',
      letterSpacing: 0.02,
    },
  },
} as const;

export type BaseStyleName = keyof typeof BASE_STYLES;
