/**
 * src/features/home/utils/spine/composition/profiles.ts
 *
 * Genre composition profiles - defines valid layout options for each genre.
 * Ported from GENRE_COMPOSITION_PROFILES in spineCalculations.ts.
 */

import { GenreCompositionProfile } from './types';

// =============================================================================
// GENRE COMPOSITION PROFILES
// =============================================================================

export const GENRE_COMPOSITION_PROFILES: Record<string, GenreCompositionProfile> = {
  // ===========================================================================
  // FANTASY - Bold, dramatic, can be experimental
  // ===========================================================================
  'fantasy': {
    titleOrientations: ['vertical-up', 'vertical-down', 'stacked-letters'],
    titleScales: ['statement', 'shout', 'normal', 'balanced'],
    titleWeights: ['bold', 'black', 'medium'],
    titleCases: ['uppercase', 'capitalize'],
    authorOrientations: ['vertical-up', 'vertical-down', 'oppose-title'],
    authorTreatments: ['plain', 'underlined'],
    authorScales: ['tiny', 'whisper', 'small'],
    densities: ['balanced', 'dense'],
    alignments: ['centered', 'bottom-heavy'],
    lineStyles: ['thin', 'medium', 'double'],
    decorativeElements: ['divider-line', 'top-line', 'bottom-line'],
    prefersBold: true,
    prefersMinimal: false,
    prefersClassic: true,
    prefersExperimental: true,
  },

  // ===========================================================================
  // LITERARY FICTION - Elegant, refined, typographically sophisticated
  // ===========================================================================
  'literary-fiction': {
    titleOrientations: ['horizontal', 'vertical-up'],
    titleScales: ['normal', 'whisper', 'statement', 'balanced'],
    titleWeights: ['light', 'regular', 'medium'],
    titleCases: ['capitalize', 'lowercase', 'uppercase'],
    authorOrientations: ['horizontal', 'match-title'],
    authorTreatments: ['plain', 'prefixed', 'underlined'],
    authorScales: ['small', 'balanced', 'tiny'],
    densities: ['minimal', 'balanced'],
    alignments: ['centered', 'top-heavy', 'bottom-heavy'],
    lineStyles: ['thin', 'none'],
    decorativeElements: ['none', 'divider-line'],
    prefersBold: false,
    prefersMinimal: true,
    prefersClassic: true,
    prefersExperimental: true,
  },

  // ===========================================================================
  // THRILLER - High contrast, tension, asymmetric
  // ===========================================================================
  'thriller': {
    titleOrientations: ['horizontal', 'stacked-letters', 'vertical-down'],
    titleScales: ['shout', 'statement', 'balanced'],
    titleWeights: ['black', 'bold'],
    titleCases: ['uppercase'],
    authorOrientations: ['horizontal', 'oppose-title'],
    authorTreatments: ['plain', 'boxed'],
    authorScales: ['tiny', 'whisper', 'small'],
    densities: ['asymmetric', 'dense'],
    alignments: ['bottom-heavy', 'top-heavy', 'scattered'],
    lineStyles: ['thick', 'medium'],
    decorativeElements: ['partial-border', 'side-line'],
    prefersBold: true,
    prefersMinimal: false,
    prefersClassic: false,
    prefersExperimental: true,
  },

  // ===========================================================================
  // MYSTERY - Classic, structured, intriguing
  // ===========================================================================
  'mystery': {
    titleOrientations: ['vertical-up', 'horizontal'],
    titleScales: ['normal', 'statement', 'balanced'],
    titleWeights: ['medium', 'bold'],
    titleCases: ['uppercase', 'capitalize'],
    authorOrientations: ['horizontal', 'oppose-title'],
    authorTreatments: ['plain', 'boxed', 'underlined'],
    authorScales: ['small', 'tiny', 'whisper'],
    densities: ['balanced', 'dense'],
    alignments: ['centered', 'bottom-heavy'],
    lineStyles: ['medium', 'double'],
    decorativeElements: ['divider-line', 'partial-border'],
    prefersBold: true,
    prefersMinimal: false,
    prefersClassic: true,
    prefersExperimental: false,
  },

  // ===========================================================================
  // ROMANCE - Warm, elegant, flowing
  // ===========================================================================
  'romance': {
    titleOrientations: ['horizontal', 'vertical-up'],
    titleScales: ['normal', 'statement', 'balanced', 'shout'],
    titleWeights: ['light', 'regular', 'medium'],
    titleCases: ['capitalize', 'uppercase'],
    authorOrientations: ['horizontal', 'match-title'],
    authorTreatments: ['plain', 'prefixed', 'underlined'],
    authorScales: ['small', 'balanced', 'tiny'],
    densities: ['balanced', 'minimal'],
    alignments: ['centered', 'top-heavy'],
    lineStyles: ['thin', 'double'],
    decorativeElements: ['divider-line', 'top-line', 'bottom-line'],
    prefersBold: false,
    prefersMinimal: false,
    prefersClassic: true,
    prefersExperimental: false,
  },

  // ===========================================================================
  // SCIENCE FICTION - Modern, geometric, clean
  // ===========================================================================
  'science-fiction': {
    titleOrientations: ['horizontal', 'vertical-up', 'stacked-words'],
    titleScales: ['normal', 'statement', 'whisper', 'balanced'],
    titleWeights: ['light', 'medium', 'bold'],
    titleCases: ['uppercase', 'lowercase'],
    authorOrientations: ['horizontal', 'vertical-up'],
    authorTreatments: ['plain', 'bracketed'],
    authorScales: ['tiny', 'small', 'whisper'],
    densities: ['minimal', 'balanced', 'asymmetric'],
    alignments: ['centered', 'left-heavy', 'scattered'],
    lineStyles: ['thin', 'medium'],
    decorativeElements: ['corner-marks', 'side-line', 'none'],
    prefersBold: false,
    prefersMinimal: true,
    prefersClassic: false,
    prefersExperimental: true,
  },

  // ===========================================================================
  // HORROR - Dark, unsettling, experimental
  // ===========================================================================
  'horror': {
    titleOrientations: ['stacked-letters', 'vertical-down', 'horizontal'],
    titleScales: ['shout', 'statement', 'whisper', 'balanced'],
    titleWeights: ['black', 'bold', 'hairline'],
    titleCases: ['uppercase', 'lowercase'],
    authorOrientations: ['horizontal', 'oppose-title', 'vertical-down'],
    authorTreatments: ['plain', 'bracketed'],
    authorScales: ['tiny', 'small', 'whisper'],
    densities: ['asymmetric', 'minimal', 'dense'],
    alignments: ['scattered', 'bottom-heavy', 'top-heavy'],
    lineStyles: ['thick', 'thin', 'none'],
    decorativeElements: ['partial-border', 'side-line', 'none'],
    prefersBold: true,
    prefersMinimal: false,
    prefersClassic: false,
    prefersExperimental: true,
  },

  // ===========================================================================
  // NON-FICTION - Clean, authoritative, informative
  // ===========================================================================
  'non-fiction': {
    titleOrientations: ['horizontal', 'vertical-up'],
    titleScales: ['normal', 'statement'],
    titleWeights: ['medium', 'bold', 'regular'],
    titleCases: ['uppercase', 'capitalize'],
    authorOrientations: ['horizontal', 'vertical-up', 'match-title'],
    authorTreatments: ['plain', 'prefixed'],
    authorScales: ['small', 'balanced'],
    densities: ['balanced', 'minimal'],
    alignments: ['centered', 'top-heavy'],
    lineStyles: ['thin', 'medium'],
    decorativeElements: ['top-line', 'bottom-line', 'none'],
    prefersBold: false,
    prefersMinimal: true,
    prefersClassic: true,
    prefersExperimental: false,
  },

  // ===========================================================================
  // BIOGRAPHY / MEMOIR - Personal, dignified
  // ===========================================================================
  'biography': {
    titleOrientations: ['horizontal', 'vertical-up'],
    titleScales: ['normal', 'statement'],
    titleWeights: ['regular', 'medium'],
    titleCases: ['capitalize', 'uppercase'],
    authorOrientations: ['horizontal', 'match-title'],
    authorTreatments: ['plain', 'underlined', 'prefixed'],
    authorScales: ['balanced', 'small'],
    densities: ['balanced', 'minimal'],
    alignments: ['centered', 'top-heavy'],
    lineStyles: ['thin', 'none'],
    decorativeElements: ['divider-line', 'none'],
    prefersBold: false,
    prefersMinimal: true,
    prefersClassic: true,
    prefersExperimental: false,
  },

  // ===========================================================================
  // HISTORY - Traditional, authoritative
  // ===========================================================================
  'history': {
    titleOrientations: ['vertical-up', 'horizontal'],
    titleScales: ['normal', 'statement'],
    titleWeights: ['medium', 'bold'],
    titleCases: ['uppercase', 'capitalize'],
    authorOrientations: ['horizontal', 'vertical-up'],
    authorTreatments: ['plain', 'underlined'],
    authorScales: ['small', 'tiny'],
    densities: ['balanced', 'dense'],
    alignments: ['centered', 'bottom-heavy'],
    lineStyles: ['medium', 'thin'],
    decorativeElements: ['top-line', 'bottom-line', 'divider-line'],
    prefersBold: false,
    prefersMinimal: false,
    prefersClassic: true,
    prefersExperimental: false,
  },

  // ===========================================================================
  // BUSINESS - Professional, bold, modern
  // ===========================================================================
  'business': {
    titleOrientations: ['horizontal', 'stacked-words'],
    titleScales: ['statement', 'shout'],
    titleWeights: ['bold', 'black', 'medium'],
    titleCases: ['uppercase', 'capitalize'],
    authorOrientations: ['horizontal', 'vertical-down', 'oppose-title'],
    authorTreatments: ['boxed', 'plain'],
    authorScales: ['tiny', 'small'],
    densities: ['asymmetric', 'dense'],
    alignments: ['bottom-heavy', 'centered'],
    lineStyles: ['thick', 'medium'],
    decorativeElements: ['partial-border', 'side-line'],
    prefersBold: true,
    prefersMinimal: false,
    prefersClassic: false,
    prefersExperimental: true,
  },

  // ===========================================================================
  // SELF-HELP - Inspiring, accessible, clear
  // ===========================================================================
  'self-help': {
    titleOrientations: ['horizontal', 'stacked-words'],
    titleScales: ['statement', 'normal'],
    titleWeights: ['bold', 'medium'],
    titleCases: ['uppercase', 'capitalize'],
    authorOrientations: ['horizontal', 'vertical-up', 'match-title'],
    authorTreatments: ['plain', 'boxed'],
    authorScales: ['small', 'tiny'],
    densities: ['balanced', 'dense'],
    alignments: ['centered', 'bottom-heavy'],
    lineStyles: ['medium', 'thin'],
    decorativeElements: ['divider-line', 'top-line'],
    prefersBold: true,
    prefersMinimal: false,
    prefersClassic: false,
    prefersExperimental: false,
  },

  // ===========================================================================
  // CRIME - Noir, gritty, structured
  // ===========================================================================
  'crime': {
    titleOrientations: ['horizontal', 'vertical-down', 'stacked-letters'],
    titleScales: ['statement', 'shout'],
    titleWeights: ['bold', 'black'],
    titleCases: ['uppercase'],
    authorOrientations: ['horizontal', 'oppose-title'],
    authorTreatments: ['boxed', 'plain'],
    authorScales: ['tiny', 'small'],
    densities: ['asymmetric', 'dense'],
    alignments: ['bottom-heavy', 'scattered'],
    lineStyles: ['thick', 'medium'],
    decorativeElements: ['partial-border', 'side-line'],
    prefersBold: true,
    prefersMinimal: false,
    prefersClassic: false,
    prefersExperimental: true,
  },

  // ===========================================================================
  // CHILDREN'S - Playful, clear, friendly
  // ===========================================================================
  'children': {
    titleOrientations: ['horizontal', 'stacked-words'],
    titleScales: ['statement', 'shout'],
    titleWeights: ['bold', 'black'],
    titleCases: ['capitalize', 'uppercase'],
    authorOrientations: ['horizontal', 'vertical-up', 'vertical-down'],
    authorTreatments: ['plain'],
    authorScales: ['small', 'tiny'],
    densities: ['balanced', 'dense'],
    alignments: ['centered', 'bottom-heavy'],
    lineStyles: ['medium', 'thick'],
    decorativeElements: ['top-line', 'bottom-line'],
    prefersBold: true,
    prefersMinimal: false,
    prefersClassic: false,
    prefersExperimental: false,
  },

  // ===========================================================================
  // YOUNG ADULT - Modern, energetic
  // ===========================================================================
  'young-adult': {
    titleOrientations: ['horizontal', 'vertical-up', 'stacked-letters'],
    titleScales: ['statement', 'normal'],
    titleWeights: ['bold', 'medium'],
    titleCases: ['capitalize', 'uppercase'],
    authorOrientations: ['horizontal', 'match-title'],
    authorTreatments: ['plain', 'underlined'],
    authorScales: ['small', 'tiny'],
    densities: ['balanced', 'asymmetric'],
    alignments: ['centered', 'bottom-heavy'],
    lineStyles: ['thin', 'medium'],
    decorativeElements: ['divider-line', 'side-line'],
    prefersBold: true,
    prefersMinimal: false,
    prefersClassic: false,
    prefersExperimental: true,
  },

  // ===========================================================================
  // POETRY - Delicate, artistic, minimal
  // ===========================================================================
  'poetry': {
    titleOrientations: ['vertical-up', 'horizontal'],
    titleScales: ['whisper', 'normal'],
    titleWeights: ['light', 'regular'],
    titleCases: ['lowercase', 'capitalize'],
    authorOrientations: ['match-title', 'horizontal'],
    authorTreatments: ['plain', 'prefixed'],
    authorScales: ['balanced', 'small'],
    densities: ['minimal'],
    alignments: ['centered', 'scattered'],
    lineStyles: ['thin', 'none'],
    decorativeElements: ['none', 'divider-line'],
    prefersBold: false,
    prefersMinimal: true,
    prefersClassic: true,
    prefersExperimental: true,
  },

  // ===========================================================================
  // HUMOR - Playful, bold, quirky
  // ===========================================================================
  'humor': {
    titleOrientations: ['horizontal', 'stacked-letters', 'stacked-words'],
    titleScales: ['statement', 'shout'],
    titleWeights: ['bold', 'black'],
    titleCases: ['uppercase', 'capitalize'],
    authorOrientations: ['horizontal', 'oppose-title'],
    authorTreatments: ['plain', 'bracketed'],
    authorScales: ['tiny', 'small'],
    densities: ['asymmetric', 'balanced'],
    alignments: ['scattered', 'centered'],
    lineStyles: ['medium', 'thick'],
    decorativeElements: ['corner-marks', 'partial-border'],
    prefersBold: true,
    prefersMinimal: false,
    prefersClassic: false,
    prefersExperimental: true,
  },

  // ===========================================================================
  // ADVENTURE - Dynamic, bold
  // ===========================================================================
  'adventure': {
    titleOrientations: ['vertical-up', 'horizontal', 'stacked-letters'],
    titleScales: ['statement', 'shout'],
    titleWeights: ['bold', 'black'],
    titleCases: ['uppercase', 'capitalize'],
    authorOrientations: ['horizontal', 'oppose-title'],
    authorTreatments: ['plain', 'underlined'],
    authorScales: ['tiny', 'small'],
    densities: ['balanced', 'dense'],
    alignments: ['centered', 'bottom-heavy'],
    lineStyles: ['medium', 'thick'],
    decorativeElements: ['divider-line', 'top-line'],
    prefersBold: true,
    prefersMinimal: false,
    prefersClassic: false,
    prefersExperimental: true,
  },

  // ===========================================================================
  // DEFAULT - Balanced, versatile
  // ===========================================================================
  'default': {
    titleOrientations: ['vertical-up', 'horizontal'],
    titleScales: ['normal', 'statement', 'balanced', 'shout'],
    titleWeights: ['medium', 'bold'],
    titleCases: ['capitalize', 'uppercase'],
    authorOrientations: ['horizontal', 'match-title', 'vertical-up', 'vertical-down', 'oppose-title'],
    authorTreatments: ['plain', 'underlined'],
    authorScales: ['small', 'tiny', 'whisper'],
    densities: ['balanced'],
    alignments: ['centered', 'bottom-heavy'],
    lineStyles: ['thin', 'none'],
    decorativeElements: ['divider-line', 'none'],
    prefersBold: false,
    prefersMinimal: false,
    prefersClassic: true,
    prefersExperimental: false,
  },
};

/**
 * Get composition profile for a genre.
 */
export function getCompositionProfile(genreProfile: string): GenreCompositionProfile {
  return GENRE_COMPOSITION_PROFILES[genreProfile] || GENRE_COMPOSITION_PROFILES['default'];
}
