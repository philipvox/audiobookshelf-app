/**
 * src/features/home/utils/spine/typography/types.ts
 *
 * Unified typography system types.
 * Replaces the old TypographyProfile/SpineTypography duplication.
 */

// =============================================================================
// FONT TYPES
// =============================================================================

export type FontFamily =
  | 'BebasNeue-Regular'
  | 'Oswald-Regular'
  | 'Oswald-Bold'
  | 'Lora-Regular'
  | 'Lora-Bold'
  | 'PlayfairDisplay-Regular'
  | 'PlayfairDisplay-Bold';

export type FontWeight = 'light' | 'regular' | 'medium' | 'bold' | 'black';
export type FontStyle = 'normal' | 'italic';

export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize' | 'small-caps';

// =============================================================================
// LAYOUT TYPES
// =============================================================================

export type AuthorPosition = 'top' | 'bottom';
export type Orientation = 'horizontal' | 'vertical-up' | 'vertical-down';
export type OrientationBias = 'horizontal' | 'vertical' | 'neutral';

// =============================================================================
// UNIFIED TYPOGRAPHY CONFIGURATION
// =============================================================================

/**
 * Complete typography configuration for a book spine.
 * This replaces both TypographyProfile and SpineTypography.
 */
export interface SpineTypography {
  /** Title text styling */
  title: {
    fontFamily: FontFamily;
    weight: FontWeight;
    style: FontStyle;
    transform: TextTransform;
    letterSpacing: number; // Multiplier (e.g., 0.04 = 4% extra spacing)
  };

  /** Author text styling */
  author: {
    fontFamily: FontFamily;
    weight: FontWeight;
    style: FontStyle;
    transform: TextTransform;
    letterSpacing: number;
    abbreviation?: 'full' | 'first-initial' | 'last-only' | 'initials' | 'auto';
  };

  /** Layout configuration */
  layout: {
    /** Where to place author (top or bottom) */
    authorPosition: AuthorPosition;
    /** Preferred orientation for author name */
    authorOrientationBias: OrientationBias;
    /** Should author have a box/background? */
    authorBox: boolean;
  };

  /** Visual personality for color/decoration hints */
  personality: 'bold' | 'refined' | 'warm' | 'modern' | 'classic' | 'stark' | 'playful';
}

// =============================================================================
// GENRE TYPOGRAPHY PROFILE
// =============================================================================

/**
 * Simplified genre profile - just the typography rules.
 * Dimensions are handled separately in core/dimensions.ts
 */
export interface GenreTypographyProfile {
  /** Normalized genre name (lowercase, no special chars) */
  name: string;
  /** Display name */
  displayName: string;
  /** Typography configuration */
  typography: SpineTypography;
  /** Priority for genre matching (higher = checked first) */
  priority: number;
}

// =============================================================================
// COMPOSITION (for generative layouts)
// =============================================================================

/**
 * Generative composition options.
 * Used by the layout solver for procedural spine designs.
 */
export interface CompositionOptions {
  titleOrientations: Orientation[];
  authorOrientations: Orientation[];
  densities: ('minimal' | 'balanced' | 'dense' | 'asymmetric')[];
  alignments: ('centered' | 'top-heavy' | 'bottom-heavy' | 'scattered')[];
  decorativeElements: ('none' | 'divider-line' | 'top-line' | 'bottom-line')[];
}
