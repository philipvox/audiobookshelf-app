/**
 * src/features/home/utils/spine/templates/spineTemplates.ts
 *
 * Genre-specific spine templates with professional typography.
 * Now supports size-based styling (small/medium/large) for each genre.
 */

// =============================================================================
// SIZE-BASED CONFIGURATION SYSTEM
// =============================================================================

// Size breakpoints for responsive spine templates
export const SPINE_SIZE_BREAKPOINTS = {
  small: { max: 60 },      // < 60px: narrow spines
  medium: { min: 60, max: 90 }, // 60-90px: standard spines
  large: { min: 90 },      // > 90px: wide spines
};

// Base configuration types
type TitleOrientation = 'horizontal' | 'vertical-up' | 'vertical-down' | 'vertical-two-row' | 'stacked-letters' | 'stacked-words' | 'vertical-with-horizontal-author';
type AuthorOrientation = 'horizontal' | 'vertical-up' | 'vertical-down' | 'vertical-two-row' | 'horizontal-below-title' | 'stacked-letters' | 'stacked-words';
type FontWeight = '300' | '400' | '500' | '600' | '700' | '800' | '900';
type FontFamily =
  // Serif fonts - elegant, traditional
  | 'PlayfairDisplay-Bold' | 'PlayfairDisplay-Regular'
  | 'Lora-Bold' | 'Lora-Regular'
  | 'NotoSerif-Bold' | 'NotoSerif-Regular'        // New: Classic serif
  | 'LibreBaskerville-Bold' | 'LibreBaskerville-Regular'  // New: Traditional serif
  // Sans-serif - bold, modern
  | 'Oswald-Bold' | 'Oswald-Regular'
  | 'BebasNeue-Regular'
  // Display/Slab fonts - impactful
  | 'GravitasOne-Regular'      // New: Bold display
  | 'AlfaSlabOne-Regular'      // New: Bold slab serif
  | 'Notable-Regular'
  | 'Federo-Regular'
  // Decorative/Themed fonts
  | 'MacondoSwashCaps-Regular'
  | 'UncialAntiqua-Regular'
  | 'GrenzeGotisch-Regular'
  | 'FleurDeLeah-Regular'
  | 'Charm-Regular'            // Elegant script for romance/poetry
  | 'AlmendraSC-Regular'       // New: Vintage/decorative
  // Futuristic fonts
  | 'Orbitron-Regular'
  | 'Silkscreen-Regular'
  | 'ZenDots-Regular'          // New: Futuristic
  // Playful/Expressive fonts
  | 'Eater-Regular'            // New: Horror/excited
  | 'RubikBeastly-Regular'     // New: Playful/monster
  | 'Barriecito-Regular';      // New: Quirky/playful
type TextCase = 'uppercase' | 'lowercase' | 'capitalize';
type TextAlign = 'left' | 'center' | 'right' | 'top' | 'bottom';
type TitlePlacement = 'top' | 'center' | 'bottom' | 'center-top' | 'center-bottom';
type AuthorPlacement = 'top' | 'bottom';

interface BaseTitleConfig {
  orientation: TitleOrientation;
  fontSize: number;           // Base font size in pts
  weight: FontWeight;
  fontFamily: FontFamily;
  fontFamilies?: FontFamily[]; // Optional array of fonts to randomly select from (per book)
  case: TextCase;
  letterSpacing?: number;     // Optional letter spacing multiplier
  lineHeight?: number;        // Optional line height in pixels
  lineHeightScale?: number;   // Optional multiplier for lineHeight (e.g., 0.7 = 70% of fontSize)
  maxLines?: number;          // Max lines for horizontal text (1 = no wrap, 2 = allow 2 lines, etc.)
  wordsPerLine?: number;      // Force line break after N words (e.g., 2 = "THE SONG\nOF ACHILLES")
  textSplitPercent?: number;  // For vertical-two-row: where to split text between lines (0-100, default 50)
  placement: TitlePlacement;
  placements?: TitlePlacement[]; // Optional array of placements to randomly select from (per book)
  heightPercent: number;      // Percentage of spine height to occupy
  align?: TextAlign;          // Text alignment within box (left/center/right for horizontal, top/center/bottom for vertical)
  paddingHorizontal?: number; // Horizontal padding in pixels
  paddingVertical?: number;   // Vertical padding in pixels
}

interface BaseAuthorConfig {
  orientation: AuthorOrientation;
  fontSize: number;
  weight: FontWeight;
  fontFamily: FontFamily;
  fontFamilies?: FontFamily[]; // Optional array of fonts to randomly select from (per book)
  case: TextCase;
  lineHeight?: number;        // Optional line height in pixels
  lineHeightScale?: number;   // Optional multiplier for lineHeight (e.g., 0.7 = 70% of fontSize)
  textSplitPercent?: number;  // For vertical-two-row: where to split text between lines (0-100, default 50)
  placement: AuthorPlacement;
  placements?: AuthorPlacement[]; // Optional array of placements to randomly select from (per book)
  heightPercent: number;
  treatment?: 'plain' | 'prefixed' | 'underlined' | 'boxed';
  align?: TextAlign;          // Text alignment within box
  letterSpacing?: number;     // Optional letter spacing multiplier (for stacked orientations)
  paddingHorizontal?: number; // Horizontal padding in pixels
  paddingVertical?: number;   // Vertical padding in pixels
}

// Partial configs for size overrides (all properties optional except those that must change)
type TitleSizeOverride = Partial<BaseTitleConfig>;
type AuthorSizeOverride = Partial<BaseAuthorConfig>;

export interface SpineTemplate {
  id: string;
  name: string;
  description: string;

  // Visual layout - now with size-based variants
  title: BaseTitleConfig & {
    sizes?: {
      small?: TitleSizeOverride;   // Overrides for spineWidth < 60px
      medium?: TitleSizeOverride;  // Overrides for 60px <= spineWidth <= 90px
      large?: TitleSizeOverride;   // Overrides for spineWidth > 90px
    };
  };

  author: BaseAuthorConfig & {
    sizes?: {
      small?: AuthorSizeOverride;
      medium?: AuthorSizeOverride;
      large?: AuthorSizeOverride;
    };
  };

  decoration?: {
    element: 'none' | 'divider-line' | 'top-line' | 'bottom-line' | 'partial-border';
    lineStyle: 'none' | 'thin' | 'medium' | 'thick';
  };

  // Matching rules
  usedFor: string[];            // Genre profiles this works well for
  preferredFor?: string[];      // Genres this is OPTIMAL for

  // Example books for testing (not used in code, just for reference)
  exampleBooks?: {
    short: string;   // ~3-5 hours (~44-60px width)
    medium: string;  // ~12-18 hours (~90-140px width)
    long: string;    // ~35-50 hours (~232-280px width)
  };
}

// Helper function to get the appropriate config for a given spine width
export function getConfigForSize<T extends BaseTitleConfig | BaseAuthorConfig>(
  baseConfig: T & { sizes?: { small?: Partial<T>; medium?: Partial<T>; large?: Partial<T> } },
  spineWidth: number
): T {
  const { sizes, ...defaultConfig } = baseConfig;

  if (!sizes) {
    return baseConfig as T;
  }

  let sizeOverride: Partial<T> | undefined;

  if (spineWidth < SPINE_SIZE_BREAKPOINTS.small.max) {
    sizeOverride = sizes.small;
  } else if (spineWidth <= SPINE_SIZE_BREAKPOINTS.medium.max) {
    sizeOverride = sizes.medium;
  } else {
    sizeOverride = sizes.large;
  }

  return { ...defaultConfig, ...sizeOverride } as T;
}

/**
 * Simple string hash for deterministic font selection.
 * Same title always produces same hash → same font.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Select a font from fontFamilies array based on book title.
 * If fontFamilies is not defined, returns the default fontFamily.
 * This ensures the same book always gets the same font (deterministic).
 *
 * @param config - The title or author config
 * @param bookTitle - The book title to use as seed for selection
 * @returns The selected font family
 */
export function selectFontForBook<T extends { fontFamily: FontFamily; fontFamilies?: FontFamily[] }>(
  config: T,
  bookTitle: string
): FontFamily {
  // If no fontFamilies array, use the default
  if (!config.fontFamilies || config.fontFamilies.length === 0) {
    return config.fontFamily;
  }

  // Use title hash to pick from array (deterministic)
  const hash = hashString(bookTitle);
  const index = hash % config.fontFamilies.length;
  return config.fontFamilies[index];
}

/**
 * Select placements for title and author based on book title.
 * Ensures:
 * 1. Same book always gets same placement (deterministic)
 * 2. Title and author never get the same position
 * 3. Author is never 'center' (only 'top' or 'bottom')
 *
 * @param titleConfig - The title configuration
 * @param authorConfig - The author configuration
 * @param bookTitle - The book title to use as seed for selection
 * @returns Object with selected titlePlacement and authorPlacement
 */
export function selectPlacementsForBook(
  titleConfig: { placement: TitlePlacement; placements?: TitlePlacement[] },
  authorConfig: { placement: AuthorPlacement; placements?: AuthorPlacement[] },
  bookTitle: string
): { titlePlacement: TitlePlacement; authorPlacement: AuthorPlacement } {
  const hash = hashString(bookTitle);

  // Select title placement
  let titlePlacement: TitlePlacement;
  if (titleConfig.placements && titleConfig.placements.length > 0) {
    const titleIndex = hash % titleConfig.placements.length;
    titlePlacement = titleConfig.placements[titleIndex];
  } else {
    titlePlacement = titleConfig.placement;
  }

  // Select author placement, ensuring it doesn't conflict with title
  let authorPlacement: AuthorPlacement;
  if (authorConfig.placements && authorConfig.placements.length > 0) {
    // Filter out any placements that would conflict with title
    const availableAuthorPlacements = authorConfig.placements.filter(p => {
      // Author can never be center (type system enforces this, but be explicit)
      if (p === 'center' as AuthorPlacement) return false;
      // If title is at top, author shouldn't be at top
      if (titlePlacement === 'top' && p === 'top') return false;
      // If title is at bottom, author shouldn't be at bottom
      if (titlePlacement === 'bottom' && p === 'bottom') return false;
      return true;
    });

    if (availableAuthorPlacements.length > 0) {
      // Use a different hash offset for author to add variety
      const authorIndex = (hash + 7) % availableAuthorPlacements.length;
      authorPlacement = availableAuthorPlacements[authorIndex];
    } else {
      // Fallback: if no valid placements, put author opposite of title
      authorPlacement = (titlePlacement === 'top' || titlePlacement === 'center-top')
        ? 'bottom'
        : 'top';
    }
  } else {
    // No placements array - use default but ensure no conflict
    if (titlePlacement === 'top' && authorConfig.placement === 'top') {
      authorPlacement = 'bottom';
    } else if (titlePlacement === 'bottom' && authorConfig.placement === 'bottom') {
      authorPlacement = 'top';
    } else {
      authorPlacement = authorConfig.placement;
    }
  }

  return { titlePlacement, authorPlacement };
}

// =============================================================================
// GENRE-SPECIFIC SPINE TEMPLATES
// =============================================================================

export const SPINE_TEMPLATES: SpineTemplate[] = [
  // Literary Fiction
  {
    id: 'literary-fiction',
    name: 'Literary Fiction',
    description: 'Elegant serif with refined typography',

    title: {
      orientation: 'stacked-words',
      fontSize: 40,
      weight: '400',
      fontFamily: 'PlayfairDisplay-Regular',
      fontFamilies: ['PlayfairDisplay-Regular', 'Lora-Regular', 'NotoSerif-Regular', 'LibreBaskerville-Regular'],
      case: 'capitalize',
      letterSpacing: 0.05,
      placement: 'center',
      heightPercent: 75,
      align: 'center',
      paddingHorizontal: 5,
      paddingVertical: 5,
      // Size-based overrides
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 32,
          paddingHorizontal: 3,
          paddingVertical: 3,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 48,
          paddingHorizontal: 8,
          paddingVertical: 8,
        },
      },
    },

    author: {
      orientation: 'vertical-two-row',
      fontSize: 18,
      weight: '400',
      fontFamily: 'PlayfairDisplay-Regular',
      case: 'capitalize',
      placement: 'bottom',
      heightPercent: 20,
      treatment: 'plain',
      align: 'center',
      lineHeight: 15,
      paddingHorizontal: 8,
      paddingVertical: 6,
      // Size-based overrides
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 14,
          paddingHorizontal: 3,
          paddingVertical: 3,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 20,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
      },
    },

    decoration: {
      element: 'none',
      lineStyle: 'none',
    },

    usedFor: ['literary-fiction', 'contemporary-fiction', 'classics'],
    preferredFor: ['literary-fiction'],
    exampleBooks: {
      short: 'The Old Man and the Sea - Hemingway (2.5hr)',
      medium: 'The Great Gatsby - Fitzgerald (5hr)',
      long: 'War and Peace - Tolstoy (61hr)',
    },
  },

  // Science Fiction
  {
    id: 'science-fiction',
    name: 'Science Fiction',
    description: 'Futuristic geometric type for space-age stories',

    title: {
      orientation: 'vertical-up',
      fontSize: 50,
      weight: '400',
      fontFamily: 'Orbitron-Regular',
      fontFamilies: ['Orbitron-Regular', 'ZenDots-Regular', 'BebasNeue-Regular'],
      case: 'uppercase',
      letterSpacing: 0.08,
      placement: 'center',
      align: 'center',
      heightPercent: 80,
      paddingHorizontal: 4,
      paddingVertical: 8,
      // Size-based overrides
      sizes: {
        small: {
          fontSize: 38,
          letterSpacing: 0.06,
          paddingHorizontal: 3,
          paddingVertical: 5,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 58,
          letterSpacing: 0.10,
          paddingHorizontal: 5,
          paddingVertical: 10,
        },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 14,
      weight: '600',
      fontFamily: 'Oswald-Bold',
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 15,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      // Size-based overrides
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 11,
          paddingHorizontal: 4,
          paddingVertical: 4,
        },
        medium: {
          orientation: 'stacked-words'
          // Uses default config
        },
        large: {
          fontSize: 16,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
      },
    },

    decoration: {
      element: 'none',
      lineStyle: 'none',
    },

    usedFor: ['science-fiction', 'scifi', 'space-opera', 'cyberpunk'],
    preferredFor: ['science-fiction', 'cyberpunk'],
    exampleBooks: {
      short: 'The Martian - Andy Weir (10hr)',
      medium: 'Dune - Frank Herbert (21hr)',
      long: 'Hyperion Cantos - Dan Simmons (45hr)',
    },
  },

  // Technology
  {
    id: 'technology',
    name: 'Technology',
    description: 'Modern digital aesthetic for tech books',

    title: {
      orientation: 'vertical-up',
      fontSize: 44,
      weight: '400',
      fontFamily: 'Orbitron-Regular',
      fontFamilies: ['Orbitron-Regular', 'ZenDots-Regular', 'BebasNeue-Regular'],
      case: 'uppercase',
      letterSpacing: 0.12,
      placement: 'center',
      align: 'center',
      heightPercent: 75,
      paddingHorizontal: 4,
      paddingVertical: 8,
      // Size-based overrides
      sizes: {
        small: {
          fontSize: 34,
          letterSpacing: 0.08,
          paddingHorizontal: 3,
          paddingVertical: 5,
        },
        medium: {
          // Uses default config
        },
        large: {
          orientation: 'stacked-words',
          fontSize: 52,
          letterSpacing: 0.15,
          paddingHorizontal: 5,
          paddingVertical: 10,
        },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '600',
      fontFamily: 'Oswald-Bold',
      case: 'uppercase',
      placement: 'top',
      align: 'center',
      heightPercent: 16,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      // Size-based overrides
      sizes: {
        small: {
          placement: 'bottom',
          orientation: 'vertical-up',
          fontSize: 10,
          paddingHorizontal: 4,
          paddingVertical: 4,
        },
        medium: {
          orientation: 'stacked-words'
          // Uses default config
        },
        large: {
          placement: 'bottom',
          fontSize: 15,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
      },
    },

    decoration: {
      element: 'none',
      lineStyle: 'none',
    },

    usedFor: ['technology', 'programming', 'digital', 'computers'],
    preferredFor: ['technology', 'programming'],
    exampleBooks: {
      short: 'The Lean Startup - Eric Ries (8hr)',
      medium: 'Steve Jobs - Walter Isaacson (25hr)',
      long: 'The Code Breaker - Walter Isaacson (18hr)',
    },
  },

  // Western
  {
    id: 'western',
    name: 'Western',
    description: 'Bold frontier aesthetic with slab serif',

    title: {
      orientation: 'vertical-up',
      fontSize: 28,
      weight: '400',
      fontFamily: 'Notable-Regular',
      fontFamilies: ['Notable-Regular', 'AlfaSlabOne-Regular', 'GravitasOne-Regular'],
      case: 'uppercase',
      letterSpacing: 1,
      maxLines: 2,
      placement: 'center',
      align: 'center',
      heightPercent: 75,
      paddingHorizontal: 10,
      paddingVertical: 10,
      textSplitPercent: 50,  // Balanced split
      lineHeight: 30,
      // Size-based overrides
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 24,
          paddingHorizontal: 5,
          paddingVertical: 5,
        },
        medium: {
          // Uses default config
        },
        large: {
          placement: 'bottom',
          orientation: 'vertical-up',
          fontSize: 36,
          heightPercent: 70,
          paddingHorizontal: 12,
          paddingVertical: 20,
          lineHeight: 36,
        },
      },
    },

    author: {
      orientation: 'stacked-words',
      fontSize: 15,
      weight: '700',
      fontFamily: 'Oswald-Bold',
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 20,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      // Size-based overrides
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 12,
          paddingHorizontal: 4,
          paddingVertical: 4,
        },
        medium: {
          // Uses default config
        },
        large: {
          orientation: 'vertical-two-row',
          placement: 'top',
          fontSize: 18,
          heightPercent: 30,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
      },
    },

    decoration: {
      element: 'none',
      lineStyle: 'none',
    },

    usedFor: ['western', 'frontier', 'cowboy', 'americana'],
    preferredFor: ['western'],
    exampleBooks: {
      short: 'Shane - Jack Schaefer (4hr)',
      medium: 'True Grit - Charles Portis (6hr)',
      long: 'Lonesome Dove - Larry McMurtry (36hr)',
    },
  },

  // Art & Design
  {
    id: 'art-design',
    name: 'Art & Design',
    description: '1920s art deco elegance',

    title: {
      orientation: 'stacked-words',
      fontSize: 50,
      weight: '400',
      fontFamily: 'Federo-Regular',
      fontFamilies: ['Federo-Regular', 'GravitasOne-Regular', 'PlayfairDisplay-Bold'],
      case: 'uppercase',
      letterSpacing: 0.15,
      placement: 'center',
      align: 'center',
      heightPercent: 75,
      paddingHorizontal: 8,
      paddingVertical: 1,
      // Size-based overrides
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 38,
          paddingHorizontal: 4,
          paddingVertical: 4,
        },
        medium: {
          fontSize: 45,
        },
        large: {
          fontSize: 56,
          paddingHorizontal: 10,
          paddingVertical: 2,
        },
      },
    },

    author: {
      orientation: 'stacked-words',
      fontSize: 14,
      weight: '600',
      fontFamily: 'Federo-Regular',
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 18,
      treatment: 'plain',
      paddingHorizontal: 1,
      paddingVertical: 6,
      // Size-based overrides
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 11,
          paddingHorizontal: 3,
          paddingVertical: 4,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 16,
          paddingHorizontal: 2,
          paddingVertical: 8,
        },
      },
    },

    decoration: {
      element: 'none',
      lineStyle: 'none',
    },

    usedFor: ['art', 'design', 'architecture', '1920s', 'jazz'],
    preferredFor: ['art', '1920s'],
    exampleBooks: {
      short: 'The Art Spirit - Robert Henri (5hr)',
      medium: 'Just Kids - Patti Smith (8hr)',
      long: 'Leonardo da Vinci - Isaacson (17hr)',
    },
  },

  // Adventure
  {
    id: 'adventure',
    name: 'Adventure',
    description: 'Bold explorer aesthetic with adventure spirit',

    title: {
      orientation: 'vertical-up',
      fontSize: 54,
      weight: '700',
      fontFamily: 'Oswald-Bold',
      fontFamilies: ['AlfaSlabOne-Regular', 'GravitasOne-Regular', 'Oswald-Bold'],
      case: 'uppercase',
      letterSpacing: 0.1,
      placement: 'center',
      align: 'center',
      heightPercent: 72,
      paddingHorizontal: 4,
      paddingVertical: 8,
      // Size-based overrides
      sizes: {
        small: {
          fontSize: 42,
          letterSpacing: 0.08,
          paddingHorizontal: 3,
          paddingVertical: 5,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 64,
          letterSpacing: 0.12,
          paddingHorizontal: 5,
          paddingVertical: 10,
        },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 14,
      weight: '600',
      fontFamily: 'Oswald-Regular',
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 16,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      // Size-based overrides
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 11,
          paddingHorizontal: 4,
          paddingVertical: 4,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 16,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
      },
    },

    decoration: {
      element: 'none',
      lineStyle: 'none',
    },

    usedFor: ['adventure', 'action', 'thriller', 'exploration'],
    preferredFor: ['adventure'],
    exampleBooks: {
      short: 'Treasure Island - Stevenson (7hr)',
      medium: 'The Count of Monte Cristo (47hr)',
      long: 'Shogun - James Clavell (53hr)',
    },
  },

  // Fantasy
  {
    id: 'fantasy',
    name: 'Fantasy',
    description: 'Epic serif typography for swords, sorcery, and epic quests',

    title: {
      orientation: 'vertical-up',
      fontSize: 54,
      weight: '700',
      fontFamily: 'PlayfairDisplay-Bold',
      fontFamilies: ['AlmendraSC-Regular', 'GravitasOne-Regular', 'PlayfairDisplay-Bold', 'Lora-Bold'],
      case: 'capitalize',
      letterSpacing: 0.1,
      placement: 'center',
      align: 'center',
      heightPercent: 72,
      paddingHorizontal: 4,
      paddingVertical: 8,
      // Size-based overrides
      sizes: {
        small: {
          fontSize: 42,
          letterSpacing: 0.08,
          paddingHorizontal: 3,
          paddingVertical: 5,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 64,
          letterSpacing: 0.12,
          paddingHorizontal: 5,
          paddingVertical: 10,
        },
      },
    },

    author: {
      orientation: 'stacked-words',
      fontSize: 14,
      weight: '600',
      fontFamily: 'LibreBaskerville-Regular',
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 16,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      // Size-based overrides
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 11,
          paddingHorizontal: 4,
          paddingVertical: 4,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 16,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
      },
    },

    decoration: {
      element: 'none',
      lineStyle: 'none',
    },

    // DISABLED FOR NOW - let Fantasy books use their secondary genre (Adventure, Thriller, etc.)
    usedFor: [],
    preferredFor: [],
    exampleBooks: {
      short: 'The Hobbit - Tolkien (11hr)',
      medium: 'The Name of the Wind (28hr)',
      long: 'The Way of Kings - Sanderson (45hr)',
    },
  },

  // Humor / Comedy
  {
    id: 'humor',
    name: 'Humor',
    description: 'Light and playful typography for comedic reads',

    title: {
      orientation: 'vertical-up',
      fontSize: 48,
      weight: '600',
      fontFamily: 'Oswald-Bold',
      fontFamilies: ['Barriecito-Regular', 'RubikBeastly-Regular', 'Oswald-Bold'],
      case: 'uppercase',
      letterSpacing: 0.05,
      placement: 'center',
      align: 'center',
      heightPercent: 70,
      paddingHorizontal: 4,
      paddingVertical: 6,
      sizes: {
        small: {
          fontSize: 36,
          letterSpacing: 0.03,
          paddingHorizontal: 3,
          paddingVertical: 4,
        },
        medium: {
          fontSize: 48,
        },
        large: {
          fontSize: 58,
          letterSpacing: 0.06,
          paddingHorizontal: 5,
          paddingVertical: 8,
        },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '500',
      fontFamily: 'Oswald-Regular',
      fontFamilies: ['Oswald-Regular', 'BebasNeue-Regular'],
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 18,
      treatment: 'plain',
      paddingHorizontal: 6,
      paddingVertical: 5,
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 10,
          paddingHorizontal: 3,
          paddingVertical: 3,
        },
        medium: {
          fontSize: 13,
        },
        large: {
          fontSize: 15,
          paddingHorizontal: 8,
          paddingVertical: 6,
        },
      },
    },

    decoration: {
      element: 'none',
      lineStyle: 'none',
    },

    usedFor: ['humor', 'comedy', 'satire', 'parody', 'humorous-fiction'],
    preferredFor: ['humor', 'comedy'],
    exampleBooks: {
      short: 'Is Everyone Hanging Out Without Me? (5hr)',
      medium: 'Bossypants - Tina Fey (5hr)',
      long: 'A Walk in the Woods - Bill Bryson (10hr)',
    },
  },

  // True Crime
  {
    id: 'true-crime',
    name: 'True Crime',
    description: 'Dark detective aesthetic with bold type',

    title: {
      orientation: 'vertical-two-row',
      fontSize: 62,
      weight: '900',
      fontFamily: 'Notable-Regular',
      fontFamilies: ['Notable-Regular', 'GravitasOne-Regular', 'AlfaSlabOne-Regular'],
      case: 'uppercase',
      letterSpacing: 0.04,
      placement: 'center',
      align: 'left',
      heightPercent: 80,
      paddingHorizontal: 8,
      paddingVertical: 8,
      lineHeight: 32,
      // Size-based overrides
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 48,
          paddingHorizontal: 4,
          paddingVertical: 4,
        },
        medium: {
          fontSize: 58,
        },
        large: {
          orientation: 'vertical-two-row',
          fontSize: 70,
          paddingHorizontal: 10,
          paddingVertical: 10,
        },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 14,
      weight: '700',
      fontFamily: 'Oswald-Bold',
      fontFamilies: ['Oswald-Bold', 'BebasNeue-Regular'],
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 20,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      // Size-based overrides
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 11,
          paddingHorizontal: 4,
          paddingVertical: 4,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 16,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
      },
    },

    decoration: {
      element: 'none',
      lineStyle: 'none',
    },

    usedFor: ['true-crime', 'crime', 'mystery', 'thriller'],
    preferredFor: ['true-crime'],
    exampleBooks: {
      short: 'Helter Skelter (26hr)',
      medium: 'I\'ll Be Gone in the Dark (10hr)',
      long: 'In Cold Blood - Truman Capote (14hr)',
    },
  },

  // Horror
  {
    id: 'horror',
    name: 'Horror',
    description: 'Dark gothic lettering for supernatural tales',

    title: {
      orientation: 'vertical-up',
      fontSize: 48,
      weight: '400',
      fontFamily: 'GrenzeGotisch-Regular',
      fontFamilies: ['GrenzeGotisch-Regular', 'Eater-Regular', 'PlayfairDisplay-Bold'],
      case: 'capitalize',
      letterSpacing: 0.03,
      placement: 'center',
      align: 'center',
      heightPercent: 70,
      paddingHorizontal: 4,
      paddingVertical: 8,
      // Size-based overrides
      sizes: {
        small: {
          fontSize: 36,
          letterSpacing: 0.02,
          paddingHorizontal: 3,
          paddingVertical: 5,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 56,
          letterSpacing: 0.04,
          paddingHorizontal: 5,
          paddingVertical: 10,
        },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '600',
      fontFamily: 'PlayfairDisplay-Bold',
      fontFamilies: ['PlayfairDisplay-Bold', 'Lora-Bold'],
      case: 'capitalize',
      placement: 'bottom',
      align: 'center',
      heightPercent: 18,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      // Size-based overrides
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 10,
          paddingHorizontal: 4,
          paddingVertical: 4,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 15,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
      },
    },

    decoration: {
      element: 'none',
      lineStyle: 'none',
    },

    usedFor: ['horror', 'supernatural', 'dark-fantasy', 'gothic'],
    preferredFor: ['horror', 'gothic'],
    exampleBooks: {
      short: 'Dr Jekyll and Mr Hyde (3hr)',
      medium: 'The Shining - Stephen King (15hr)',
      long: 'IT - Stephen King (44hr)',
    },
  },

  // Romance
  {
    id: 'romance',
    name: 'Romance',
    description: 'Flowing script for romantic tales',

    title: {
      orientation: 'vertical-up',
      fontSize: 42,
      weight: '400',
      fontFamily: 'Charm-Regular',
      fontFamilies: ['Charm-Regular', 'PlayfairDisplay-Regular'],
      case: 'capitalize',
      letterSpacing: 0.04,
      placement: 'center',
      align: 'center',
      heightPercent: 66,
      paddingHorizontal: 4,
      paddingVertical: 8,
      // Size-based overrides
      sizes: {
        small: {
          fontSize: 32,
          letterSpacing: 0.03,
          paddingHorizontal: 3,
          paddingVertical: 5,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontFamily: 'Charm-Regular',
          fontSize: 50,
          letterSpacing: 0.05,
          paddingHorizontal: 5,
          paddingVertical: 10,
        },
      },
    },

    author: {
      orientation: 'stacked-words',
      fontSize: 15,
      weight: '400',
      fontFamily: 'PlayfairDisplay-Regular',
      fontFamilies: ['PlayfairDisplay-Regular', 'Lora-Regular'],
      case: 'capitalize',
      placement: 'bottom',
      align: 'center',
      heightPercent: 20,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      // Size-based overrides
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 12,
          paddingHorizontal: 4,
          paddingVertical: 4,
        },
        medium: {
          // Uses default config
        },
        large: {
          orientation: 'stacked-words',
          fontSize: 17,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
      },
    },

    decoration: {
      element: 'none',
      lineStyle: 'none',
    },

    usedFor: ['romance', 'historical-romance', 'contemporary-romance', 'womens-fiction'],
    preferredFor: ['romance', 'womens-fiction'],
    exampleBooks: {
      short: 'Pride and Prejudice - Austen (12hr)',
      medium: 'Outlander - Diana Gabaldon (32hr)',
      long: 'Gone with the Wind (49hr)',
    },
  },

  // Biography
  {
    id: 'biography',
    name: 'Biography',
    description: 'Refined serif for life stories',

    title: {
      orientation: 'vertical-up',
      fontSize: 44,
      weight: '600',
      fontFamily: 'PlayfairDisplay-Bold',
      fontFamilies: ['PlayfairDisplay-Bold', 'NotoSerif-Bold', 'LibreBaskerville-Bold'],
      case: 'capitalize',
      letterSpacing: 0.06,
      placement: 'bottom',
      align: 'center',
      heightPercent: 85,
      paddingHorizontal: 4,
      paddingVertical: 20,
      // Size-based overrides
      sizes: {
        small: {
          fontSize: 34,
          letterSpacing: 0.04,
          paddingHorizontal: 3,
          paddingVertical: 5,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 52,
          letterSpacing: 0.08,
          paddingHorizontal: 5,
          paddingVertical: 10,
        },
      },
    },

    author: {
      orientation: 'stacked-words',
      fontSize: 14,
      weight: '400',
      fontFamily: 'PlayfairDisplay-Regular',
      fontFamilies: ['PlayfairDisplay-Regular', 'Lora-Regular'],
      case: 'capitalize',
      placement: 'top',
      align: 'center',
      heightPercent: 15,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      // Size-based overrides
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 11,
          paddingHorizontal: 4,
          paddingVertical: 4,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 16,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
      },
    },

    decoration: {
      element: 'none',
      lineStyle: 'none',
    },

    usedFor: ['biography', 'autobiography', 'memoir', 'history'],
    preferredFor: ['biography', 'autobiography'],
    exampleBooks: {
      short: 'Elon Musk - Ashlee Vance (13hr)',
      medium: 'Einstein - Isaacson (21hr)',
      long: 'Alexander Hamilton (36hr)',
    },
  },

  // Philosophy
  {
    id: 'philosophy',
    name: 'Philosophy',
    description: 'Timeless uncial for philosophical works',

    title: {
      orientation: 'vertical-up',
      fontSize: 40,
      weight: '400',
      fontFamily: 'UncialAntiqua-Regular',
      fontFamilies: ['UncialAntiqua-Regular', 'NotoSerif-Regular', 'LibreBaskerville-Regular'],
      case: 'capitalize',
      letterSpacing: 0.04,
      placement: 'center',
      align: 'center',
      heightPercent: 66,
      paddingHorizontal: 4,
      paddingVertical: 8,
      // Size-based overrides
      sizes: {
        small: {
          fontSize: 30,
          letterSpacing: 0.03,
          paddingHorizontal: 3,
          paddingVertical: 5,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 48,
          letterSpacing: 0.05,
          paddingHorizontal: 5,
          paddingVertical: 10,
        },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '400',
      fontFamily: 'Lora-Regular',
      fontFamilies: ['Lora-Regular', 'PlayfairDisplay-Regular'],
      case: 'capitalize',
      placement: 'bottom',
      align: 'center',
      heightPercent: 20,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      // Size-based overrides
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 10,
          paddingHorizontal: 4,
          paddingVertical: 4,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 15,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
      },
    },

    decoration: {
      element: 'none',
      lineStyle: 'none',
    },

    usedFor: ['philosophy', 'religion', 'spirituality', 'essays'],
    preferredFor: ['philosophy', 'religion'],
    exampleBooks: {
      short: 'Meditations - Marcus Aurelius (3hr)',
      medium: 'Thus Spoke Zarathustra (12hr)',
      long: 'Being and Time - Heidegger (20hr)',
    },
  },

  // Thriller
  {
    id: 'thriller',
    name: 'Thriller',
    description: 'Bold intense type for page-turners',

    title: {
      orientation: 'vertical-up',
      fontSize: 56,
      weight: '900',
      fontFamily: 'Oswald-Bold',
      fontFamilies: ['GravitasOne-Regular', 'AlfaSlabOne-Regular', 'Oswald-Bold'],
      case: 'uppercase',
      letterSpacing: 0.06,
      placement: 'center',
      align: 'center',
      heightPercent: 72,
      paddingHorizontal: 4,
      paddingVertical: 8,
      // Size-based overrides
      sizes: {
        small: {
          fontSize: 44,
          paddingHorizontal: 3,
          paddingVertical: 5,
        },
        medium: {
          fontSize: 56,
        },
        large: {
          fontSize: 66,
          paddingHorizontal: 5,
          paddingVertical: 10,
        },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 14,
      weight: '700',
      fontFamily: 'Oswald-Regular',
      fontFamilies: ['Oswald-Regular', 'BebasNeue-Regular'],
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 16,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      // Size-based overrides
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 11,
          paddingHorizontal: 4,
          paddingVertical: 4,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 16,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
      },
    },

    decoration: {
      element: 'none',
      lineStyle: 'none',
    },

    usedFor: ['thriller', 'suspense', 'action', 'crime'],
    preferredFor: ['thriller', 'suspense'],
    exampleBooks: {
      short: 'The Firm - John Grisham (11hr)',
      medium: 'Gone Girl - Gillian Flynn (13hr)',
      long: 'The Stand - Stephen King (47hr)',
    },
  },

  // Historical Fiction
  {
    id: 'historical-fiction',
    name: 'Historical Fiction',
    description: 'Period-appropriate elegance for historical tales',

    title: {
      orientation: 'vertical-up',
      fontSize: 46,
      weight: '400',
      fontFamily: 'PlayfairDisplay-Regular',
      fontFamilies: ['PlayfairDisplay-Regular', 'NotoSerif-Regular', 'LibreBaskerville-Regular'],
      case: 'capitalize',
      letterSpacing: 0.05,
      placement: 'center',
      align: 'center',
      heightPercent: 75,
      paddingHorizontal: 4,
      paddingVertical: 8,
      // Size-based overrides
      sizes: {
        small: {
          fontSize: 35,
          letterSpacing: 0.04,
          paddingHorizontal: 3,
          paddingVertical: 5,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 54,
          letterSpacing: 0.06,
          paddingHorizontal: 5,
          paddingVertical: 10,
        },
      },
    },

    author: {
      orientation: 'stacked-words',
      fontSize: 14,
      weight: '400',
      fontFamily: 'PlayfairDisplay-Regular',
      fontFamilies: ['PlayfairDisplay-Regular', 'Lora-Regular'],
      case: 'capitalize',
      placement: 'top',
      align: 'center',
      heightPercent: 20,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      // Size-based overrides
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 11,
          paddingHorizontal: 4,
          paddingVertical: 4,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 16,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
      },
    },

    decoration: {
      element: 'none',
      lineStyle: 'none',
    },

    usedFor: ['historical-fiction', 'history', 'period-drama'],
    preferredFor: ['historical-fiction'],
    exampleBooks: {
      short: 'All the Light We Cannot See (16hr)',
      medium: 'The Pillars of the Earth (41hr)',
      long: 'Shogun - James Clavell (53hr)',
    },
  },

  // Business
  {
    id: 'business',
    name: 'Business',
    description: 'Clean modern type for business books',

    title: {
      orientation: 'vertical-up',
      fontSize: 48,
      weight: '400',
      fontFamily: 'Orbitron-Regular',
      fontFamilies: ['Orbitron-Regular', 'ZenDots-Regular', 'GravitasOne-Regular'],
      case: 'uppercase',
      letterSpacing: 0.06,
      placement: 'center',
      align: 'center',
      heightPercent: 68,
      paddingHorizontal: 4,
      paddingVertical: 8,
      // Size-based overrides
      sizes: {
        small: {
          fontSize: 36,
          letterSpacing: 0.05,
          paddingHorizontal: 3,
          paddingVertical: 5,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 56,
          letterSpacing: 0.08,
          paddingHorizontal: 5,
          paddingVertical: 10,
        },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '600',
      fontFamily: 'Oswald-Bold',
      fontFamilies: ['Oswald-Bold', 'BebasNeue-Regular'],
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 18,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      // Size-based overrides
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 10,
          paddingHorizontal: 4,
          paddingVertical: 4,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 15,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
      },
    },

    decoration: {
      element: 'none',
      lineStyle: 'none',
    },

    usedFor: ['business', 'technology', 'economics', 'education'],
    preferredFor: ['business', 'economics'],
    exampleBooks: {
      short: 'The 4-Hour Workweek (13hr)',
      medium: 'Good to Great - Jim Collins (10hr)',
      long: 'Principles - Ray Dalio (16hr)',
    },
  },

  // Music & Arts
  {
    id: 'music-arts',
    name: 'Music & Arts',
    description: '1920s art deco for creative works',

    title: {
      orientation: 'vertical-up',
      fontSize: 52,
      weight: '400',
      fontFamily: 'Federo-Regular',
      fontFamilies: ['Federo-Regular', 'GravitasOne-Regular', 'PlayfairDisplay-Bold'],
      case: 'uppercase',
      letterSpacing: 0.08,
      placement: 'center',
      align: 'center',
      heightPercent: 70,
      paddingHorizontal: 4,
      paddingVertical: 8,
      // Size-based overrides
      sizes: {
        small: {
          fontSize: 40,
          letterSpacing: 0.06,
          paddingHorizontal: 3,
          paddingVertical: 5,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 62,
          letterSpacing: 0.10,
          paddingHorizontal: 5,
          paddingVertical: 10,
        },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 14,
      weight: '600',
      fontFamily: 'PlayfairDisplay-Bold',
      fontFamilies: ['PlayfairDisplay-Bold', 'Lora-Bold'],
      case: 'capitalize',
      placement: 'bottom',
      align: 'center',
      heightPercent: 17,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      // Size-based overrides
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 11,
          paddingHorizontal: 4,
          paddingVertical: 4,
        },
        medium: {
          // Uses default config
        },
        large: {
          fontSize: 16,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
      },
    },

    decoration: {
      element: 'none',
      lineStyle: 'none',
    },

    usedFor: ['music', 'art', 'design', '1920s', 'jazz'],
    preferredFor: ['music', 'art'],
    exampleBooks: {
      short: 'The Rest Is Noise - Alex Ross (18hr)',
      medium: 'Born to Run - Bruce Springsteen (18hr)',
      long: 'Chronicles Vol 1 - Bob Dylan (6hr)',
    },
  },

  // Anthology
  {
    id: 'anthology',
    name: 'Anthology',
    description: 'Elegant varied type for collections',

    title: {
      orientation: 'vertical-up',
      fontSize: 42,
      weight: '400',
      fontFamily: 'PlayfairDisplay-Regular',
      fontFamilies: ['PlayfairDisplay-Regular', 'NotoSerif-Regular', 'LibreBaskerville-Regular'],
      case: 'capitalize',
      letterSpacing: 0.06,
      placement: 'center',
      align: 'center',
      heightPercent: 66,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: {
          fontSize: 32,
          letterSpacing: 0.04,
          paddingHorizontal: 3,
          paddingVertical: 5,
        },
        medium: {},
        large: {
          fontSize: 50,
          letterSpacing: 0.08,
          paddingHorizontal: 5,
          paddingVertical: 10,
        },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '400',
      fontFamily: 'PlayfairDisplay-Regular',
      fontFamilies: ['PlayfairDisplay-Regular', 'Lora-Regular'],
      case: 'capitalize',
      placement: 'bottom',
      align: 'center',
      heightPercent: 20,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: {
          orientation: 'vertical-up',
          fontSize: 10,
          paddingHorizontal: 4,
          paddingVertical: 4,
        },
        medium: {},
        large: {
          fontSize: 15,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['anthology', 'short-stories', 'collection', 'essays'],
    preferredFor: ['anthology', 'short-stories'],
    exampleBooks: {
      short: 'Nine Stories - J.D. Salinger (4hr)',
      medium: 'Dubliners - James Joyce (7hr)',
      long: 'Complete Short Stories - Hemingway (32hr)',
    },
  },

  // Mystery
  {
    id: 'mystery',
    name: 'Mystery',
    description: 'Intriguing type for whodunits and detective stories',

    title: {
      orientation: 'vertical-up',
      fontSize: 50,
      weight: '700',
      fontFamily: 'PlayfairDisplay-Bold',
      fontFamilies: ['PlayfairDisplay-Bold', 'NotoSerif-Bold', 'LibreBaskerville-Bold'],
      case: 'capitalize',
      letterSpacing: 0.04,
      placement: 'center',
      align: 'center',
      heightPercent: 72,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 38, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 60, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '500',
      fontFamily: 'Lora-Regular',
      fontFamilies: ['Lora-Regular', 'PlayfairDisplay-Regular'],
      case: 'capitalize',
      placement: 'bottom',
      align: 'center',
      heightPercent: 16,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 10, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 15, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['mystery', 'detective', 'cozy-mystery', 'whodunit'],
    preferredFor: ['mystery', 'detective'],
    exampleBooks: {
      short: 'The Maltese Falcon - Hammett (6hr)',
      medium: 'Girl with the Dragon Tattoo (18hr)',
      long: 'And Then There Were None (7hr)',
    },
  },

  // Classics
  {
    id: 'classics',
    name: 'Classics',
    description: 'Timeless elegance for literary classics',

    title: {
      orientation: 'vertical-up',
      fontSize: 44,
      weight: '400',
      fontFamily: 'LibreBaskerville-Regular',
      fontFamilies: ['LibreBaskerville-Regular', 'NotoSerif-Regular', 'PlayfairDisplay-Regular'],
      case: 'capitalize',
      letterSpacing: 0.05,
      placement: 'center',
      align: 'center',
      heightPercent: 70,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 34, letterSpacing: 0.04, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 52, letterSpacing: 0.06, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 14,
      weight: '400',
      fontFamily: 'LibreBaskerville-Regular',
      fontFamilies: ['LibreBaskerville-Regular', 'NotoSerif-Regular'],
      case: 'capitalize',
      placement: 'bottom',
      align: 'center',
      heightPercent: 18,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 11, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 16, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['classics', 'classic-literature', 'victorian', 'literary-classics'],
    preferredFor: ['classics'],
    exampleBooks: {
      short: 'Animal Farm - Orwell (3hr)',
      medium: '1984 - George Orwell (11hr)',
      long: 'Les Misérables - Hugo (57hr)',
    },
  },

  // Epic Fantasy
  {
    id: 'epic-fantasy',
    name: 'Epic Fantasy',
    description: 'Grand sweeping type for epic fantasy sagas',

    title: {
      orientation: 'vertical-up',
      fontSize: 58,
      weight: '700',
      fontFamily: 'AlmendraSC-Regular',
      fontFamilies: ['AlmendraSC-Regular', 'UncialAntiqua-Regular', 'GravitasOne-Regular'],
      case: 'uppercase',
      letterSpacing: 0.08,
      placement: 'center',
      align: 'center',
      heightPercent: 75,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 44, letterSpacing: 0.06, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 68, letterSpacing: 0.10, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 14,
      weight: '600',
      fontFamily: 'PlayfairDisplay-Bold',
      fontFamilies: ['PlayfairDisplay-Bold', 'Lora-Bold'],
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 15,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 11, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 16, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['epic-fantasy', 'high-fantasy', 'sword-and-sorcery', 'fantasy'],
    preferredFor: ['epic-fantasy', 'high-fantasy'],
    exampleBooks: {
      short: 'A Wizard of Earthsea (6hr)',
      medium: 'The Eye of the World (30hr)',
      long: 'The Way of Kings - Sanderson (45hr)',
    },
  },

  // Self-Help
  {
    id: 'self-help',
    name: 'Self-Help',
    description: 'Clean motivational type for personal development',

    title: {
      orientation: 'vertical-up',
      fontSize: 46,
      weight: '700',
      fontFamily: 'Oswald-Bold',
      fontFamilies: ['Oswald-Bold', 'BebasNeue-Regular', 'GravitasOne-Regular'],
      case: 'uppercase',
      letterSpacing: 0.06,
      placement: 'center',
      align: 'center',
      heightPercent: 70,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 36, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 56, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '600',
      fontFamily: 'Oswald-Regular',
      fontFamilies: ['Oswald-Regular', 'BebasNeue-Regular'],
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 18,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 10, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 15, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['self-help', 'personal-development', 'motivation', 'self-improvement'],
    preferredFor: ['self-help', 'personal-development'],
    exampleBooks: {
      short: 'Atomic Habits - James Clear (5hr)',
      medium: 'The 7 Habits - Stephen Covey (13hr)',
      long: 'How to Win Friends - Carnegie (7hr)',
    },
  },

  // Young Adult
  {
    id: 'young-adult',
    name: 'Young Adult',
    description: 'Bold modern type for YA fiction',

    title: {
      orientation: 'vertical-up',
      fontSize: 52,
      weight: '700',
      fontFamily: 'Oswald-Bold',
      fontFamilies: ['Oswald-Bold', 'AlfaSlabOne-Regular', 'GravitasOne-Regular'],
      case: 'uppercase',
      letterSpacing: 0.05,
      placement: 'center',
      align: 'center',
      heightPercent: 72,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 40, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 62, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '600',
      fontFamily: 'Oswald-Regular',
      fontFamilies: ['Oswald-Regular', 'BebasNeue-Regular'],
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 16,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 10, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 15, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['young-adult', 'ya', 'teen', 'coming-of-age'],
    preferredFor: ['young-adult', 'ya'],
    exampleBooks: {
      short: 'The Giver - Lois Lowry (4hr)',
      medium: 'The Hunger Games (11hr)',
      long: 'Harry Potter Series (117hr)',
    },
  },

  // Children
  // Prioritizes readable, friendly fonts over quirky ones for better legibility
  {
    id: 'children',
    name: 'Children',
    description: 'Playful friendly type for kids books - prioritizes readability',

    title: {
      orientation: 'vertical-up',
      fontSize: 44,
      weight: '700',
      fontFamily: 'Oswald-Bold',  // Clean, readable sans-serif as primary
      fontFamilies: ['Oswald-Bold', 'BebasNeue-Regular', 'Notable-Regular', 'Barriecito-Regular'],
      case: 'capitalize',
      letterSpacing: 0.04,
      placement: 'center',
      align: 'center',
      heightPercent: 70,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 34, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 54, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 12,
      weight: '500',
      fontFamily: 'Oswald-Regular',
      fontFamilies: ['Oswald-Regular', 'BebasNeue-Regular'],
      case: 'capitalize',
      placement: 'bottom',
      align: 'center',
      heightPercent: 18,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 9, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 14, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['children', 'kids', 'middle-grade', 'juvenile', "children's", 'picture book', 'early readers', 'chapter books'],
    preferredFor: ['children', 'kids', "children's"],
    exampleBooks: {
      short: 'Charlotte\'s Web (3hr)',
      medium: 'Percy Jackson - Lightning Thief (10hr)',
      long: 'Harry Potter and Deathly Hallows (21hr)',
    },
  },

  // Non-Fiction (General)
  {
    id: 'non-fiction',
    name: 'Non-Fiction',
    description: 'Clean informative type for factual works',

    title: {
      orientation: 'vertical-up',
      fontSize: 48,
      weight: '600',
      fontFamily: 'NotoSerif-Bold',
      fontFamilies: ['NotoSerif-Bold', 'LibreBaskerville-Bold', 'PlayfairDisplay-Bold'],
      case: 'capitalize',
      letterSpacing: 0.05,
      placement: 'center',
      align: 'center',
      heightPercent: 72,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 36, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 58, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '500',
      fontFamily: 'NotoSerif-Regular',
      fontFamilies: ['NotoSerif-Regular', 'Lora-Regular'],
      case: 'capitalize',
      placement: 'bottom',
      align: 'center',
      heightPercent: 16,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 10, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 15, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['non-fiction', 'general-non-fiction', 'informational'],
    preferredFor: ['non-fiction'],
    exampleBooks: {
      short: 'Sapiens - Yuval Noah Harari (15hr)',
      medium: 'Guns, Germs, and Steel (16hr)',
      long: 'Rise and Fall of Third Reich (57hr)',
    },
  },

  // History (Non-Fiction)
  {
    id: 'history',
    name: 'History',
    description: 'Authoritative serif for historical non-fiction',

    title: {
      orientation: 'vertical-up',
      fontSize: 46,
      weight: '600',
      fontFamily: 'LibreBaskerville-Bold',
      fontFamilies: ['LibreBaskerville-Bold', 'NotoSerif-Bold', 'PlayfairDisplay-Bold'],
      case: 'capitalize',
      letterSpacing: 0.05,
      placement: 'center',
      align: 'center',
      heightPercent: 74,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 35, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 56, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '400',
      fontFamily: 'LibreBaskerville-Regular',
      fontFamilies: ['LibreBaskerville-Regular', 'NotoSerif-Regular'],
      case: 'capitalize',
      placement: 'bottom',
      align: 'center',
      heightPercent: 16,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 10, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 15, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['history', 'historical', 'military-history', 'ancient-history'],
    preferredFor: ['history'],
    exampleBooks: {
      short: '1776 - David McCullough (11hr)',
      medium: 'The Guns of August (17hr)',
      long: 'Decline and Fall of Roman Empire (126hr)',
    },
  },

  // Sports
  {
    id: 'sports',
    name: 'Sports',
    description: 'Bold athletic type for sports books',

    title: {
      orientation: 'vertical-up',
      fontSize: 54,
      weight: '900',
      fontFamily: 'Oswald-Bold',
      fontFamilies: ['Oswald-Bold', 'AlfaSlabOne-Regular', 'GravitasOne-Regular'],
      case: 'uppercase',
      letterSpacing: 0.06,
      placement: 'center',
      align: 'center',
      heightPercent: 72,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 42, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 64, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 14,
      weight: '700',
      fontFamily: 'Oswald-Bold',
      fontFamilies: ['Oswald-Bold', 'BebasNeue-Regular'],
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 16,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 11, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 16, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['sports', 'athletics', 'fitness', 'outdoor'],
    preferredFor: ['sports'],
    exampleBooks: {
      short: 'Moneyball - Michael Lewis (10hr)',
      medium: 'Open - Andre Agassi (18hr)',
      long: 'The Boys in the Boat (11hr)',
    },
  },

  // Travel
  {
    id: 'travel',
    name: 'Travel',
    description: 'Adventurous type for travel narratives',

    title: {
      orientation: 'vertical-up',
      fontSize: 48,
      weight: '600',
      fontFamily: 'Federo-Regular',
      fontFamilies: ['Federo-Regular', 'Oswald-Bold', 'PlayfairDisplay-Bold'],
      case: 'uppercase',
      letterSpacing: 0.08,
      placement: 'center',
      align: 'center',
      heightPercent: 70,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 38, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 58, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '500',
      fontFamily: 'Oswald-Regular',
      fontFamilies: ['Oswald-Regular', 'BebasNeue-Regular'],
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 18,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 10, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 15, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['travel', 'adventure-travel', 'exploration', 'geography'],
    preferredFor: ['travel'],
    exampleBooks: {
      short: 'A Walk in the Woods - Bryson (10hr)',
      medium: 'In Patagonia - Bruce Chatwin (6hr)',
      long: 'The Lost City of Z (10hr)',
    },
  },

  // Cooking / Food
  {
    id: 'cooking',
    name: 'Cooking',
    description: 'Warm inviting type for culinary books',

    title: {
      orientation: 'vertical-up',
      fontSize: 44,
      weight: '600',
      fontFamily: 'PlayfairDisplay-Bold',
      fontFamilies: ['PlayfairDisplay-Bold', 'Lora-Bold', 'LibreBaskerville-Bold'],
      case: 'capitalize',
      letterSpacing: 0.04,
      placement: 'center',
      align: 'center',
      heightPercent: 68,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 34, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 54, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '400',
      fontFamily: 'Lora-Regular',
      fontFamilies: ['Lora-Regular', 'PlayfairDisplay-Regular'],
      case: 'capitalize',
      placement: 'bottom',
      align: 'center',
      heightPercent: 18,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 10, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 15, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['cooking', 'food', 'culinary', 'recipes'],
    preferredFor: ['cooking', 'food'],
    exampleBooks: {
      short: 'Kitchen Confidential - Bourdain (8hr)',
      medium: 'Salt Fat Acid Heat (10hr)',
      long: 'The Food Lab - Kenji López-Alt (32hr)',
    },
  },

  // Health & Wellness
  {
    id: 'health',
    name: 'Health',
    description: 'Clean calming type for health books',

    title: {
      orientation: 'vertical-up',
      fontSize: 46,
      weight: '500',
      fontFamily: 'Lora-Bold',
      fontFamilies: ['Lora-Bold', 'NotoSerif-Bold', 'PlayfairDisplay-Bold'],
      case: 'capitalize',
      letterSpacing: 0.05,
      placement: 'center',
      align: 'center',
      heightPercent: 70,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 36, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 56, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '400',
      fontFamily: 'Lora-Regular',
      fontFamilies: ['Lora-Regular', 'NotoSerif-Regular'],
      case: 'capitalize',
      placement: 'bottom',
      align: 'center',
      heightPercent: 18,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 10, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 15, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['health', 'wellness', 'medical', 'fitness'],
    preferredFor: ['health', 'wellness'],
    exampleBooks: {
      short: 'Why We Sleep - Matthew Walker (13hr)',
      medium: 'The Body Keeps the Score (13hr)',
      long: 'Being Mortal - Atul Gawande (9hr)',
    },
  },

  // Military
  {
    id: 'military',
    name: 'Military',
    description: 'Bold commanding type for military stories',

    title: {
      orientation: 'vertical-up',
      fontSize: 52,
      weight: '900',
      fontFamily: 'Oswald-Bold',
      fontFamilies: ['Oswald-Bold', 'AlfaSlabOne-Regular', 'GravitasOne-Regular'],
      case: 'uppercase',
      letterSpacing: 0.08,
      placement: 'center',
      align: 'center',
      heightPercent: 74,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 40, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 62, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 14,
      weight: '700',
      fontFamily: 'Oswald-Bold',
      fontFamilies: ['Oswald-Bold', 'BebasNeue-Regular'],
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 15,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 11, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 16, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['military', 'war', 'military-fiction', 'military-history'],
    preferredFor: ['military', 'war'],
    exampleBooks: {
      short: 'Lone Survivor - Marcus Luttrell (9hr)',
      medium: 'Band of Brothers - Ambrose (12hr)',
      long: 'The Killer Angels - Michael Shaara (12hr)',
    },
  },

  // Dystopian
  {
    id: 'dystopian',
    name: 'Dystopian',
    description: 'Dark stark type for dystopian fiction',

    title: {
      orientation: 'vertical-up',
      fontSize: 50,
      weight: '700',
      fontFamily: 'Oswald-Bold',
      fontFamilies: ['Oswald-Bold', 'ZenDots-Regular', 'Orbitron-Regular'],
      case: 'uppercase',
      letterSpacing: 0.10,
      placement: 'center',
      align: 'center',
      heightPercent: 74,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 38, letterSpacing: 0.08, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 60, letterSpacing: 0.12, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '600',
      fontFamily: 'Oswald-Regular',
      fontFamilies: ['Oswald-Regular', 'BebasNeue-Regular'],
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 15,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 10, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 15, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['dystopian', 'post-apocalyptic', 'apocalyptic', 'speculative'],
    preferredFor: ['dystopian', 'post-apocalyptic'],
    exampleBooks: {
      short: 'Fahrenheit 451 - Bradbury (5hr)',
      medium: 'The Road - Cormac McCarthy (6hr)',
      long: 'The Stand - Stephen King (47hr)',
    },
  },

  // Urban Fantasy
  {
    id: 'urban-fantasy',
    name: 'Urban Fantasy',
    description: 'Modern magical type for urban fantasy',

    title: {
      orientation: 'vertical-up',
      fontSize: 50,
      weight: '700',
      fontFamily: 'Oswald-Bold',
      fontFamilies: ['Oswald-Bold', 'GravitasOne-Regular', 'AlfaSlabOne-Regular'],
      case: 'uppercase',
      letterSpacing: 0.06,
      placement: 'center',
      align: 'center',
      heightPercent: 72,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 38, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 60, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '600',
      fontFamily: 'Oswald-Regular',
      fontFamilies: ['Oswald-Regular', 'BebasNeue-Regular'],
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 16,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 10, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 15, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['urban-fantasy', 'contemporary-fantasy', 'paranormal'],
    preferredFor: ['urban-fantasy'],
    exampleBooks: {
      short: 'Storm Front - Jim Butcher (8hr)',
      medium: 'Dead Witch Walking (13hr)',
      long: 'American Gods - Neil Gaiman (19hr)',
    },
  },

  // Paranormal Romance
  {
    id: 'paranormal-romance',
    name: 'Paranormal Romance',
    description: 'Dark romantic type for supernatural love stories',

    title: {
      orientation: 'vertical-up',
      fontSize: 46,
      weight: '600',
      fontFamily: 'GrenzeGotisch-Regular',
      fontFamilies: ['GrenzeGotisch-Regular', 'Charm-Regular', 'PlayfairDisplay-Bold'],
      case: 'capitalize',
      letterSpacing: 0.04,
      placement: 'center',
      align: 'center',
      heightPercent: 68,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 36, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 56, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 14,
      weight: '400',
      fontFamily: 'PlayfairDisplay-Regular',
      fontFamilies: ['PlayfairDisplay-Regular', 'Lora-Regular'],
      case: 'capitalize',
      placement: 'bottom',
      align: 'center',
      heightPercent: 18,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 11, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 16, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['paranormal-romance', 'vampire-romance', 'supernatural-romance'],
    preferredFor: ['paranormal-romance'],
    exampleBooks: {
      short: 'Twilight - Stephenie Meyer (12hr)',
      medium: 'A Court of Thorns and Roses (16hr)',
      long: 'Outlander - Diana Gabaldon (32hr)',
    },
  },

  // Poetry
  {
    id: 'poetry',
    name: 'Poetry',
    description: 'Elegant flowing type for poetry collections',

    title: {
      orientation: 'vertical-up',
      fontSize: 40,
      weight: '400',
      fontFamily: 'Charm-Regular',
      fontFamilies: ['Charm-Regular', 'PlayfairDisplay-Regular', 'LibreBaskerville-Regular'],
      case: 'capitalize',
      letterSpacing: 0.04,
      placement: 'center',
      align: 'center',
      heightPercent: 65,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 30, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 48, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 14,
      weight: '400',
      fontFamily: 'PlayfairDisplay-Regular',
      fontFamilies: ['PlayfairDisplay-Regular', 'Lora-Regular'],
      case: 'capitalize',
      placement: 'bottom',
      align: 'center',
      heightPercent: 22,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 11, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 16, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['poetry', 'poems', 'verse'],
    preferredFor: ['poetry'],
    exampleBooks: {
      short: 'Milk and Honey - Rupi Kaur (1hr)',
      medium: 'Leaves of Grass - Whitman (8hr)',
      long: 'The Complete Poems - Emily Dickinson (30hr)',
    },
  },

  // Science
  {
    id: 'science',
    name: 'Science',
    description: 'Clean precise type for science books',

    title: {
      orientation: 'vertical-up',
      fontSize: 46,
      weight: '600',
      fontFamily: 'Orbitron-Regular',
      fontFamilies: ['Orbitron-Regular', 'ZenDots-Regular', 'NotoSerif-Bold'],
      case: 'uppercase',
      letterSpacing: 0.08,
      placement: 'center',
      align: 'center',
      heightPercent: 72,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 36, letterSpacing: 0.06, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 56, letterSpacing: 0.10, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '500',
      fontFamily: 'Oswald-Regular',
      fontFamilies: ['Oswald-Regular', 'BebasNeue-Regular'],
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 16,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 10, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 15, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['science', 'physics', 'biology', 'chemistry', 'astronomy'],
    preferredFor: ['science'],
    exampleBooks: {
      short: 'A Brief History of Time (5hr)',
      medium: 'The Selfish Gene - Dawkins (16hr)',
      long: 'The Elegant Universe (15hr)',
    },
  },

  // LitRPG / GameLit
  {
    id: 'litrpg',
    name: 'LitRPG',
    description: 'Game-inspired type for LitRPG and GameLit',

    title: {
      orientation: 'vertical-up',
      fontSize: 48,
      weight: '700',
      fontFamily: 'Silkscreen-Regular',
      fontFamilies: ['Silkscreen-Regular', 'ZenDots-Regular', 'Orbitron-Regular'],
      case: 'uppercase',
      letterSpacing: 0.06,
      placement: 'center',
      align: 'center',
      heightPercent: 72,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 36, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 58, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '600',
      fontFamily: 'Oswald-Bold',
      fontFamilies: ['Oswald-Bold', 'BebasNeue-Regular'],
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 16,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 10, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 15, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['litrpg', 'gamelit', 'progression-fantasy', 'cultivation'],
    preferredFor: ['litrpg', 'gamelit'],
    exampleBooks: {
      short: 'Dungeon Crawler Carl (12hr)',
      medium: 'Cradle: Unsouled (8hr)',
      long: 'He Who Fights With Monsters (20hr)',
    },
  },

  // Cozy Mystery
  {
    id: 'cozy-mystery',
    name: 'Cozy Mystery',
    description: 'Warm friendly type for cozy mysteries',

    title: {
      orientation: 'vertical-up',
      fontSize: 44,
      weight: '600',
      fontFamily: 'PlayfairDisplay-Bold',
      fontFamilies: ['PlayfairDisplay-Bold', 'Lora-Bold', 'LibreBaskerville-Bold'],
      case: 'capitalize',
      letterSpacing: 0.04,
      placement: 'center',
      align: 'center',
      heightPercent: 70,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 34, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 54, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '400',
      fontFamily: 'Lora-Regular',
      fontFamilies: ['Lora-Regular', 'PlayfairDisplay-Regular'],
      case: 'capitalize',
      placement: 'bottom',
      align: 'center',
      heightPercent: 18,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 10, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 15, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['cozy-mystery', 'cozy', 'amateur-sleuth'],
    preferredFor: ['cozy-mystery'],
    exampleBooks: {
      short: 'The Cat Who Could Read Backwards (5hr)',
      medium: 'Still Life - Louise Penny (10hr)',
      long: 'A is for Alibi - Sue Grafton (8hr)',
    },
  },

  // Espionage / Spy
  {
    id: 'espionage',
    name: 'Espionage',
    description: 'Sleek secretive type for spy thrillers',

    title: {
      orientation: 'vertical-up',
      fontSize: 52,
      weight: '700',
      fontFamily: 'Oswald-Bold',
      fontFamilies: ['Oswald-Bold', 'BebasNeue-Regular', 'GravitasOne-Regular'],
      case: 'uppercase',
      letterSpacing: 0.10,
      placement: 'center',
      align: 'center',
      heightPercent: 74,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 40, letterSpacing: 0.08, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 62, letterSpacing: 0.12, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 14,
      weight: '600',
      fontFamily: 'Oswald-Regular',
      fontFamilies: ['Oswald-Regular', 'BebasNeue-Regular'],
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 15,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 11, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 16, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['espionage', 'spy', 'spy-thriller', 'political-thriller'],
    preferredFor: ['espionage', 'spy'],
    exampleBooks: {
      short: 'The Spy Who Came in from the Cold (7hr)',
      medium: 'Tinker Tailor Soldier Spy (12hr)',
      long: 'The Bourne Identity (14hr)',
    },
  },

  // Contemporary Fiction
  {
    id: 'contemporary-fiction',
    name: 'Contemporary',
    description: 'Modern clean type for contemporary stories',

    title: {
      orientation: 'vertical-up',
      fontSize: 48,
      weight: '600',
      fontFamily: 'Lora-Bold',
      fontFamilies: ['Lora-Bold', 'NotoSerif-Bold', 'PlayfairDisplay-Bold'],
      case: 'capitalize',
      letterSpacing: 0.05,
      placement: 'center',
      align: 'center',
      heightPercent: 72,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 36, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 58, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '400',
      fontFamily: 'Lora-Regular',
      fontFamilies: ['Lora-Regular', 'NotoSerif-Regular'],
      case: 'capitalize',
      placement: 'bottom',
      align: 'center',
      heightPercent: 16,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 10, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 15, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['contemporary-fiction', 'modern-fiction', 'general-fiction'],
    preferredFor: ['contemporary-fiction'],
    exampleBooks: {
      short: 'Normal People - Sally Rooney (7hr)',
      medium: 'A Little Life - Hanya Yanagihara (26hr)',
      long: 'The Goldfinch - Donna Tartt (32hr)',
    },
  },

  // Default Fallback
  {
    id: 'default',
    name: 'Default',
    description: 'Clean versatile type for any genre',

    title: {
      orientation: 'vertical-up',
      fontSize: 48,
      weight: '600',
      fontFamily: 'Oswald-Bold',
      fontFamilies: ['Oswald-Bold', 'Lora-Bold', 'PlayfairDisplay-Bold'],
      case: 'uppercase',
      letterSpacing: 0.05,
      placement: 'center',
      align: 'center',
      heightPercent: 72,
      paddingHorizontal: 4,
      paddingVertical: 8,
      sizes: {
        small: { fontSize: 36, paddingHorizontal: 3, paddingVertical: 5 },
        medium: {},
        large: { fontSize: 58, paddingHorizontal: 5, paddingVertical: 10 },
      },
    },

    author: {
      orientation: 'horizontal',
      fontSize: 13,
      weight: '500',
      fontFamily: 'Oswald-Regular',
      fontFamilies: ['Oswald-Regular', 'Lora-Regular'],
      case: 'uppercase',
      placement: 'bottom',
      align: 'center',
      heightPercent: 16,
      treatment: 'plain',
      paddingHorizontal: 8,
      paddingVertical: 6,
      sizes: {
        small: { orientation: 'vertical-up', fontSize: 10, paddingHorizontal: 4, paddingVertical: 4 },
        medium: {},
        large: { fontSize: 15, paddingHorizontal: 10, paddingVertical: 8 },
      },
    },

    decoration: { element: 'none', lineStyle: 'none' },
    usedFor: ['default', 'unknown', 'uncategorized'],
    preferredFor: ['default'],
    exampleBooks: {
      short: 'Any short audiobook (3-5hr)',
      medium: 'Any medium audiobook (10-15hr)',
      long: 'Any long audiobook (30-50hr)',
    },
  },
];

// =============================================================================
// TEMPLATE UTILITIES
// =============================================================================

/**
 * Get template by ID
 */
export function getTemplate(id: string): SpineTemplate | undefined {
  return SPINE_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates that match a genre
 */
export function getTemplatesForGenre(genre: string): SpineTemplate[] {
  return SPINE_TEMPLATES.filter(t =>
    t.usedFor.includes(genre) || t.preferredFor?.includes(genre)
  );
}

/**
 * Get best template for a genre (prefers "preferredFor" matches)
 */
export function getBestTemplateForGenre(genre: string): SpineTemplate {
  const preferred = SPINE_TEMPLATES.find(t => t.preferredFor?.includes(genre));
  if (preferred) return preferred;

  const usable = SPINE_TEMPLATES.find(t => t.usedFor.includes(genre));
  if (usable) return usable;

  // Fallback to first template
  return SPINE_TEMPLATES[0];
}
