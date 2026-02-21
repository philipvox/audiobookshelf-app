/**
 * src/features/recommendations/utils/publicationEra.ts
 *
 * Publication Era System for the Enhanced Recommendation System v2.0.
 * Classifies books by publication period to enable era-based filtering:
 * - Classic: Pre-1970 (timeless works, literary canon)
 * - Modern Classic: 1970-1999 (established modern works)
 * - Contemporary: 2000-2015 (recent but established)
 * - Recent: 2016-present (new releases)
 */

import { LibraryItem, BookMetadata } from '@/core/types';
import { ERA_WEIGHTS } from './scoreWeights';

// ============================================================================
// TYPES
// ============================================================================

export type PublicationEra = 'classic' | 'modern-classic' | 'contemporary' | 'recent';

export interface EraConfig {
  id: PublicationEra;
  label: string;
  description: string;
  /** Start year (inclusive) */
  startYear: number | null;
  /** End year (inclusive) */
  endYear: number | null;
}

export interface EraPreference {
  /** Preferred eras (if empty, all eras are acceptable) */
  preferred: PublicationEra[];
  /** Excluded eras (never recommend) */
  excluded: PublicationEra[];
  /** Whether to strictly enforce era preferences */
  strict: boolean;
}

// ============================================================================
// ERA CONFIGURATION
// ============================================================================

export const ERAS: EraConfig[] = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Pre-1970 timeless works',
    startYear: null,
    endYear: 1969,
  },
  {
    id: 'modern-classic',
    label: 'Modern Classic',
    description: '1970-1999 established works',
    startYear: 1970,
    endYear: 1999,
  },
  {
    id: 'contemporary',
    label: 'Contemporary',
    description: '2000-2015 recent classics',
    startYear: 2000,
    endYear: 2015,
  },
  {
    id: 'recent',
    label: 'Recent',
    description: '2016-present new releases',
    startYear: 2016,
    endYear: null,
  },
];

/**
 * Era boundaries for quick lookup
 */
const ERA_BOUNDARIES = {
  classic: { max: 1969 },
  'modern-classic': { min: 1970, max: 1999 },
  contemporary: { min: 2000, max: 2015 },
  recent: { min: 2016 },
} as const;

// ============================================================================
// ERA CLASSIFICATION
// ============================================================================

/**
 * Classify a publication year into an era.
 * Returns null if year is unknown.
 */
export function classifyYear(year: number | null | undefined): PublicationEra | null {
  if (year === null || year === undefined) return null;

  if (year <= ERA_BOUNDARIES.classic.max) return 'classic';
  if (year >= ERA_BOUNDARIES['modern-classic'].min && year <= ERA_BOUNDARIES['modern-classic'].max) {
    return 'modern-classic';
  }
  if (year >= ERA_BOUNDARIES.contemporary.min && year <= ERA_BOUNDARIES.contemporary.max) {
    return 'contemporary';
  }
  if (year >= ERA_BOUNDARIES.recent.min) return 'recent';

  return null;
}

/**
 * Get publication year from a library item.
 * Tries multiple metadata fields.
 */
export function getPublicationYear(item: LibraryItem): number | null {
  const metadata = item.media?.metadata as BookMetadata | undefined;
  if (!metadata) return null;

  // Try publishedYear first (most reliable)
  if (metadata.publishedYear && typeof metadata.publishedYear === 'number') {
    return metadata.publishedYear;
  }

  // Try parsing from publishedDate string
  if (metadata.publishedDate) {
    const dateStr = String(metadata.publishedDate);
    // Try to extract year from various formats
    const yearMatch = dateStr.match(/\b(1[89]\d{2}|20[0-2]\d)\b/);
    if (yearMatch) {
      return parseInt(yearMatch[1], 10);
    }
  }

  return null;
}

/**
 * Get publication era for a library item.
 */
export function getPublicationEra(item: LibraryItem): PublicationEra | null {
  const year = getPublicationYear(item);
  return classifyYear(year);
}

/**
 * Get era from BookDNA tag if present.
 * DNA tags override metadata for manually curated accuracy.
 */
export function getEraFromDNA(tags: string[] | undefined): PublicationEra | null {
  if (!tags || tags.length === 0) return null;

  const eraTag = tags.find(t => t.toLowerCase().startsWith('dna:pub-era:'));
  if (!eraTag) return null;

  const parts = eraTag.split(':');
  const era = parts[2]?.toLowerCase() as PublicationEra;

  // Validate it's a known era
  if (['classic', 'modern-classic', 'contemporary', 'recent'].includes(era)) {
    return era;
  }

  return null;
}

// ============================================================================
// ERA FILTERING
// ============================================================================

/**
 * Check if a book matches era preferences.
 */
export function matchesEraPreference(
  era: PublicationEra | null,
  preference: EraPreference
): { matches: boolean; score: number } {
  // If no era detected and not strict, allow it
  if (era === null) {
    return { matches: !preference.strict, score: 0 };
  }

  // Check exclusions first
  if (preference.excluded.includes(era)) {
    return { matches: false, score: 0 };
  }

  // No preference = all eras acceptable
  if (preference.preferred.length === 0) {
    return { matches: true, score: 0 };
  }

  // Check if era is preferred
  if (preference.preferred.includes(era)) {
    return { matches: true, score: ERA_WEIGHTS.preferredEraBonus };
  }

  // Era not preferred but not excluded
  if (preference.strict) {
    return { matches: false, score: 0 };
  }

  // Non-strict mode: allow but with penalty
  return { matches: true, score: -5 };
}

/**
 * Filter items by era preference.
 */
export function filterByEra(
  items: LibraryItem[],
  preference: EraPreference
): LibraryItem[] {
  if (preference.preferred.length === 0 && preference.excluded.length === 0) {
    return items;
  }

  return items.filter(item => {
    const era = getPublicationEra(item);
    return matchesEraPreference(era, preference).matches;
  });
}

// ============================================================================
// ERA DISTRIBUTION
// ============================================================================

/**
 * Get era distribution for a set of items.
 */
export function getEraDistribution(items: LibraryItem[]): Record<PublicationEra | 'unknown', number> {
  const distribution: Record<PublicationEra | 'unknown', number> = {
    classic: 0,
    'modern-classic': 0,
    contemporary: 0,
    recent: 0,
    unknown: 0,
  };

  for (const item of items) {
    const era = getPublicationEra(item);
    if (era) {
      distribution[era]++;
    } else {
      distribution.unknown++;
    }
  }

  return distribution;
}

/**
 * Get era percentages for a set of items.
 */
export function getEraPercentages(items: LibraryItem[]): Record<PublicationEra | 'unknown', number> {
  const dist = getEraDistribution(items);
  const total = items.length || 1;

  return {
    classic: Math.round((dist.classic / total) * 100),
    'modern-classic': Math.round((dist['modern-classic'] / total) * 100),
    contemporary: Math.round((dist.contemporary / total) * 100),
    recent: Math.round((dist.recent / total) * 100),
    unknown: Math.round((dist.unknown / total) * 100),
  };
}

// ============================================================================
// ERA-BASED SCORING
// ============================================================================

/**
 * Calculate era score for a book based on user preferences.
 */
export function calculateEraScore(
  item: LibraryItem,
  preference: EraPreference | null
): number {
  if (!preference || preference.preferred.length === 0) {
    return 0;
  }

  const era = getPublicationEra(item);
  if (!era) return 0;

  const result = matchesEraPreference(era, preference);
  return result.score;
}

// ============================================================================
// ERA LABEL HELPERS
// ============================================================================

/**
 * Get human-readable label for an era.
 */
export function getEraLabel(era: PublicationEra | null): string {
  if (!era) return 'Unknown';

  const config = ERAS.find(e => e.id === era);
  return config?.label || era;
}

/**
 * Get era description for display.
 */
export function getEraDescription(era: PublicationEra | null): string {
  if (!era) return 'Publication date unknown';

  const config = ERAS.find(e => e.id === era);
  return config?.description || era;
}

/**
 * Get year range string for an era.
 */
export function getEraYearRange(era: PublicationEra): string {
  switch (era) {
    case 'classic':
      return 'Before 1970';
    case 'modern-classic':
      return '1970-1999';
    case 'contemporary':
      return '2000-2015';
    case 'recent':
      return '2016-present';
    default:
      return '';
  }
}
