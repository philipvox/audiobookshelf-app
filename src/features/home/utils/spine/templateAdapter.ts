/**
 * src/features/home/utils/spine/templateAdapter.ts
 *
 * Adapter layer between spine templates and BookSpineVertical rendering.
 * Converts template configurations into the format expected by the existing rendering system.
 */

import {
  SPINE_TEMPLATES,
  getBestTemplateForGenre,
  getConfigForSize,
  selectFontForBook,
  SpineTemplate,
  BaseTitleConfig,
  BaseAuthorConfig,
} from './templates/spineTemplates';

// =============================================================================
// TYPE CONVERSIONS
// =============================================================================

/**
 * Convert template orientation to composition orientation format.
 * Template uses more specific names, composition uses simplified format.
 */
function convertTitleOrientation(templateOrientation: string): string {
  switch (templateOrientation) {
    case 'vertical-up':
    case 'vertical-down':
      return 'vertical';
    case 'horizontal':
      return 'horizontal';
    case 'stacked-letters':
      return 'stacked-letters';
    case 'stacked-words':
      return 'stacked-words';
    case 'vertical-two-row':
      return 'vertical-two-row';
    default:
      return 'vertical'; // Safe fallback
  }
}

/**
 * Convert author orientation (similar to title)
 */
function convertAuthorOrientation(templateOrientation: string): string {
  switch (templateOrientation) {
    case 'vertical-up':
    case 'vertical-down':
      return 'vertical';
    case 'horizontal':
    case 'horizontal-below-title':
      return 'horizontal';
    case 'stacked-letters':
      return 'stacked-letters';
    case 'stacked-words':
      return 'stacked-words';
    case 'vertical-two-row':
      return 'vertical-two-row';
    default:
      return 'horizontal'; // Authors default to horizontal
  }
}

/**
 * Convert template text case to composition format
 */
function convertTextCase(templateCase: string): string {
  switch (templateCase) {
    case 'uppercase':
      return 'uppercase';
    case 'lowercase':
      return 'lowercase';
    case 'capitalize':
      return 'mixed'; // Template's capitalize maps to composition's mixed
    default:
      return 'mixed';
  }
}

/**
 * Convert weight string to numeric value
 */
function convertWeightToNumber(weight: string): string {
  // Template uses numeric strings ('300', '400', etc.)
  // Composition expects descriptive strings ('light', 'regular', etc.)
  switch (weight) {
    case '300': return 'light';
    case '400': return 'regular';
    case '500': return 'medium';
    case '600': return 'semibold';
    case '700': return 'bold';
    case '800': return 'bold';
    case '900': return 'black';
    default: return 'regular';
  }
}

// =============================================================================
// TEMPLATE MATCHING
// =============================================================================

/**
 * Match book genres to best template.
 * Tries each genre in order, returns first match.
 * Falls back to literary-fiction template if no match found.
 */
export function matchBookToTemplate(genres: string[]): SpineTemplate {
  if (!genres || genres.length === 0) {
    return SPINE_TEMPLATES[0]; // Default to first template (literary-fiction)
  }

  // Try each genre, looking for preferred matches first
  for (const genre of genres) {
    const template = SPINE_TEMPLATES.find(t => t.preferredFor?.includes(genre.toLowerCase()));
    if (template) return template;
  }

  // Try again for usedFor matches
  for (const genre of genres) {
    const template = SPINE_TEMPLATES.find(t => t.usedFor.includes(genre.toLowerCase()));
    if (template) return template;
  }

  // Use helper function as final fallback
  return getBestTemplateForGenre(genres[0]?.toLowerCase() || 'fiction');
}

// =============================================================================
// TEMPLATE APPLICATION
// =============================================================================

export interface AppliedTemplateConfig {
  // Title configuration
  title: {
    orientation: string;
    fontSize: number;
    fontFamily: string;
    weight: string; // Composition format (light, regular, bold, etc.)
    case: string;
    letterSpacing: number;
    lineHeight?: number;
    placement: string;
    align: string;
    heightPercent: number;
    paddingHorizontal: number;
    paddingVertical: number;
  };

  // Author configuration
  author: {
    orientation: string;
    fontSize: number;
    fontFamily: string;
    weight: string;
    case: string;
    letterSpacing: number;
    lineHeight?: number;
    placement: string;
    align: string;
    heightPercent: number;
    treatment: string;
    paddingHorizontal: number;
    paddingVertical: number;
  };

  // Decoration
  decoration: {
    element: string;
    lineStyle: string;
  };

  // Metadata
  templateId: string;
  templateName: string;
}

/**
 * Apply template configuration for a given spine width.
 * Retrieves template, applies size-based overrides, and converts to rendering format.
 *
 * @param genres - Book genres for template matching
 * @param spineWidth - Width of the spine for size-based config
 * @param bookTitle - Book title for deterministic font selection (if fontFamilies defined)
 */
export function applyTemplateConfig(
  genres: string[],
  spineWidth: number,
  bookTitle: string = ''
): AppliedTemplateConfig {
  // Match template
  const template = matchBookToTemplate(genres);

  // Get size-appropriate configs
  const titleConfig = getConfigForSize(template.title, spineWidth);
  const authorConfig = getConfigForSize(template.author, spineWidth);

  // Select fonts (if fontFamilies is defined, picks one based on book title hash)
  const titleFont = selectFontForBook(titleConfig, bookTitle);
  const authorFont = selectFontForBook(authorConfig, bookTitle);

  // Convert to rendering format
  return {
    title: {
      orientation: convertTitleOrientation(titleConfig.orientation),
      fontSize: titleConfig.fontSize,
      fontFamily: titleFont, // Uses selected font from fontFamilies if available
      weight: convertWeightToNumber(titleConfig.weight),
      case: convertTextCase(titleConfig.case),
      letterSpacing: titleConfig.letterSpacing || 0,
      lineHeight: titleConfig.lineHeight,
      placement: titleConfig.placement,
      align: titleConfig.align || 'center',
      heightPercent: titleConfig.heightPercent,
      paddingHorizontal: titleConfig.paddingHorizontal || 8,
      paddingVertical: titleConfig.paddingVertical || 8,
    },
    author: {
      orientation: convertAuthorOrientation(authorConfig.orientation),
      fontSize: authorConfig.fontSize,
      fontFamily: authorFont, // Uses selected font from fontFamilies if available
      weight: convertWeightToNumber(authorConfig.weight),
      case: convertTextCase(authorConfig.case),
      letterSpacing: authorConfig.letterSpacing || 0,
      lineHeight: authorConfig.lineHeight,
      placement: authorConfig.placement,
      align: authorConfig.align || 'center',
      heightPercent: authorConfig.heightPercent,
      treatment: authorConfig.treatment || 'plain',
      paddingHorizontal: authorConfig.paddingHorizontal || 8,
      paddingVertical: authorConfig.paddingVertical || 6,
    },
    decoration: template.decoration || { element: 'none', lineStyle: 'none' },
    templateId: template.id,
    templateName: template.name,
  };
}

/**
 * Check if a book should use template-driven rendering.
 * Returns true if the book has genres that match our template system.
 */
export function shouldUseTemplates(genres: string[]): boolean {
  if (!genres || genres.length === 0) return false;

  // Try to find a matching template
  const hasMatch = genres.some(genre =>
    SPINE_TEMPLATES.some(t =>
      t.usedFor.includes(genre.toLowerCase()) ||
      t.preferredFor?.includes(genre.toLowerCase())
    )
  );

  return hasMatch;
}

/**
 * Get template info for debugging
 */
export function getTemplateInfo(genres: string[], spineWidth: number): string {
  const template = matchBookToTemplate(genres);
  const titleConfig = getConfigForSize(template.title, spineWidth);

  let sizeCategory = 'medium';
  if (spineWidth < 60) sizeCategory = 'small';
  else if (spineWidth > 90) sizeCategory = 'large';

  return `${template.name} (${sizeCategory}, ${titleConfig.orientation})`;
}
