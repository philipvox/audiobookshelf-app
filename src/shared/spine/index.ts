/**
 * src/shared/spine/index.ts
 *
 * Shared spine system re-exports.
 *
 * The spine rendering system lives in features/home/ but is used across
 * many features (series, author, narrator, book-detail, browse, library, player).
 * This module provides a stable shared import path so other features don't
 * directly import from @/features/home/.
 *
 * To move actual code here in the future, refactor features/home/utils/spine/
 * to decouple from home-specific internals.
 */

// Store
export { useSpineCacheStore, selectIsPopulated } from '@/features/home/stores/spineCache';

// Components
export { BookSpineVertical } from '@/features/home/components/BookSpineVertical';
export type { BookSpineVerticalData } from '@/features/home/components/BookSpineVertical';
export { ShelfRow } from './ShelfRow';

// Hooks
export { useBookRowLayout } from '@/features/home/hooks/useBookRowLayout';

// Utilities
export {
  hashString,
  SPINE_COLOR_PALETTE,
  getTypographyForGenres,
  getSeriesStyle,
} from '@/features/home/utils/spine/adapter';
