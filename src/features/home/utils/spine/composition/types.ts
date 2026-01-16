/**
 * src/features/home/utils/spine/composition/types.ts
 *
 * Types for generative spine composition system.
 * Each book gets a unique but deterministic layout based on genre constraints.
 */

// =============================================================================
// COMPOSITION ELEMENT TYPES
// =============================================================================

/** Title orientation options */
export type CompositionTitleOrientation =
  | 'horizontal'      // Normal left-to-right
  | 'vertical-up'     // Rotated 90° CCW (reads bottom-to-top)
  | 'vertical-down'   // Rotated 90° CW (reads top-to-bottom)
  | 'stacked-letters' // Letters stacked vertically
  | 'stacked-words';  // Words stacked vertically

/** Author orientation options */
export type CompositionAuthorOrientation =
  | 'horizontal'      // Normal left-to-right
  | 'vertical-up'     // Rotated 90° CCW
  | 'vertical-down'   // Rotated 90° CW
  | 'match-title'     // Same as title orientation
  | 'oppose-title';   // Opposite rotation from title

/** Title/author scale presets */
export type CompositionScale =
  | 'whisper'         // Very small, subtle
  | 'tiny'            // Small
  | 'small'           // Slightly reduced
  | 'normal'          // Standard size
  | 'balanced'        // Equal prominence
  | 'statement'       // Emphasized, large
  | 'shout';          // Maximum size, dominant

/** Font weight options */
export type CompositionWeight =
  | 'hairline'        // 100
  | 'light'           // 300
  | 'regular'         // 400
  | 'medium'          // 500
  | 'bold'            // 700
  | 'black';          // 900

/** Text transformation */
export type CompositionCase =
  | 'uppercase'
  | 'lowercase'
  | 'capitalize'
  | 'none';

/** Author name treatments */
export type CompositionAuthorTreatment =
  | 'plain'           // Just the name
  | 'prefixed'        // "by Author Name"
  | 'underlined'      // Name with underline
  | 'boxed'           // Name in a box
  | 'bracketed';      // [Author Name]

/** Layout density */
export type CompositionDensity =
  | 'minimal'         // Lots of whitespace
  | 'balanced'        // Standard spacing
  | 'dense'           // Compact, information-rich
  | 'asymmetric';     // Unbalanced for tension

/** Vertical alignment bias */
export type CompositionAlignment =
  | 'centered'        // Balanced vertical center
  | 'top-heavy'       // More content at top
  | 'bottom-heavy'    // More content at bottom
  | 'left-heavy'      // Pushed to left edge
  | 'scattered';      // Irregular placement

/** Decorative line styles */
export type CompositionLineStyle =
  | 'none'
  | 'thin'            // 1px line
  | 'medium'          // 2px line
  | 'thick'           // 3-4px line
  | 'double';         // Two parallel lines

/** Decorative elements */
export type CompositionDecorativeElement =
  | 'none'
  | 'divider-line'    // Horizontal line between sections
  | 'top-line'        // Line at top
  | 'bottom-line'     // Line at bottom
  | 'side-line'       // Vertical line on side
  | 'partial-border'  // Incomplete border
  | 'corner-marks';   // Corner brackets/marks

// =============================================================================
// GENRE COMPOSITION PROFILE
// =============================================================================

/**
 * Composition profile for a genre.
 * Defines valid ranges for generative layout decisions.
 */
export interface GenreCompositionProfile {
  // Title options (randomly picked from based on hash)
  titleOrientations: CompositionTitleOrientation[];
  titleScales: CompositionScale[];
  titleWeights: CompositionWeight[];
  titleCases: CompositionCase[];

  // Author options
  authorOrientations: CompositionAuthorOrientation[];
  authorTreatments: CompositionAuthorTreatment[];
  authorScales: CompositionScale[];

  // Layout options
  densities: CompositionDensity[];
  alignments: CompositionAlignment[];

  // Decoration options
  lineStyles: CompositionLineStyle[];
  decorativeElements: CompositionDecorativeElement[];

  // Personality flags (for biasing decisions)
  prefersBold: boolean;          // Tends toward bold weights
  prefersMinimal: boolean;       // Tends toward minimal layouts
  prefersClassic: boolean;       // Traditional typography
  prefersExperimental: boolean;  // Willing to try unusual layouts
}

// =============================================================================
// GENERATED COMPOSITION
// =============================================================================

/**
 * Final composition generated for a specific book.
 * Deterministically picked from genre profile based on book ID hash.
 */
export interface SpineComposition {
  // Title configuration
  title: {
    orientation: CompositionTitleOrientation;
    scale: CompositionScale;
    weight: CompositionWeight;
    case: CompositionCase;
    letterSpacing: number;
  };

  // Author configuration
  author: {
    orientation: CompositionAuthorOrientation;
    treatment: CompositionAuthorTreatment;
    scale: CompositionScale;
    weight: CompositionWeight;
  };

  // Layout configuration
  layout: {
    density: CompositionDensity;
    alignment: CompositionAlignment;
    authorPosition: 'top' | 'bottom';  // Where to place author name
  };

  // Decoration configuration
  decoration: {
    lineStyle: CompositionLineStyle;
    element: CompositionDecorativeElement;
  };
}
