/**
 * src/features/home/utils/spine/styles/compositionPresets.ts
 *
 * 4 composition presets that define layout behavior.
 * Combined with base styles to create full genre profiles.
 */

import {
  CompositionTitleOrientation,
  CompositionScale,
  CompositionWeight,
  CompositionCase,
  CompositionAuthorOrientation,
  CompositionAuthorTreatment,
  CompositionDensity,
  CompositionAlignment,
  CompositionLineStyle,
  CompositionDecorativeElement,
} from '../profiles/types';

export interface CompositionPreset {
  // Title layout options
  titleOrientations: CompositionTitleOrientation[];
  titleScales: CompositionScale[];
  titleWeights: CompositionWeight[];
  titleCases: CompositionCase[];

  // Author layout options
  authorOrientations: CompositionAuthorOrientation[];
  authorTreatments: CompositionAuthorTreatment[];
  authorScales: CompositionScale[];

  // Layout options
  densities: CompositionDensity[];
  alignments: CompositionAlignment[];

  // Decoration options
  lineStyles: CompositionLineStyle[];
  decorativeElements: CompositionDecorativeElement[];

  // Personality flags (affect generator behavior)
  prefersBold: boolean;
  prefersMinimal: boolean;
  prefersClassic: boolean;
  prefersExperimental: boolean;
}

/**
 * 4 composition presets covering all layout styles:
 *
 * 1. balanced - Traditional, centered, readable (classics, literary fiction)
 * 2. dramatic - Bold, asymmetric, impactful (thriller, action, fantasy)
 * 3. minimal - Clean, sparse, modern (non-fiction, self-help, business)
 * 4. experimental - Creative, unusual layouts (horror, sci-fi, avant-garde)
 */
export const COMPOSITION_PRESETS: Record<string, CompositionPreset> = {
  // Balanced - traditional, centered, professional
  balanced: {
    titleOrientations: ['vertical-up', 'horizontal'],
    titleScales: ['normal', 'statement', 'balanced'],
    titleWeights: ['regular', 'medium', 'bold'],
    titleCases: ['capitalize', 'uppercase'],
    authorOrientations: ['horizontal', 'match-title'],
    authorTreatments: ['plain', 'prefixed'],
    authorScales: ['small', 'balanced'],
    densities: ['balanced'],
    alignments: ['centered', 'bottom-heavy'],
    lineStyles: ['thin', 'none'],
    decorativeElements: ['none', 'divider-line'],
    prefersBold: false,
    prefersMinimal: false,
    prefersClassic: true,
    prefersExperimental: false,
  },

  // Dramatic - bold, impactful, attention-grabbing
  dramatic: {
    titleOrientations: ['vertical-up', 'vertical-down', 'stacked-letters'],
    titleScales: ['statement', 'shout'],
    titleWeights: ['bold', 'black'],
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

  // Minimal - clean, sparse, modern
  minimal: {
    titleOrientations: ['horizontal', 'vertical-up'],
    titleScales: ['whisper', 'small', 'normal'],
    titleWeights: ['light', 'regular'],
    titleCases: ['capitalize', 'lowercase'],
    authorOrientations: ['horizontal', 'match-title'],
    authorTreatments: ['plain'],
    authorScales: ['tiny', 'small'],
    densities: ['minimal', 'balanced'],
    alignments: ['centered', 'top-heavy'],
    lineStyles: ['none', 'thin'],
    decorativeElements: ['none'],
    prefersBold: false,
    prefersMinimal: true,
    prefersClassic: false,
    prefersExperimental: false,
  },

  // Experimental - creative, unusual, artistic
  experimental: {
    titleOrientations: ['stacked-letters', 'stacked-words', 'vertical-down'],
    titleScales: ['shout', 'whisper'],
    titleWeights: ['black', 'light'],
    titleCases: ['uppercase', 'lowercase'],
    authorOrientations: ['oppose-title', 'vertical-down'],
    authorTreatments: ['boxed', 'bracketed'],
    authorScales: ['tiny', 'statement'],
    densities: ['asymmetric'],
    alignments: ['scattered', 'left-heavy'],
    lineStyles: ['double', 'thick'],
    decorativeElements: ['corner-marks', 'partial-border'],
    prefersBold: true,
    prefersMinimal: false,
    prefersClassic: false,
    prefersExperimental: true,
  },
} as const;

export type CompositionPresetName = keyof typeof COMPOSITION_PRESETS;
