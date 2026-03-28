/**
 * src/features/browse/components/SeriesCard.tsx
 *
 * Re-export from shared location for backwards compatibility.
 * The actual component now lives at src/shared/components/BrowseSeriesCard.tsx
 */

export {
  SeriesCard,
  SERIES_DOT_COLORS,
  getBookDotColor,
  getSeriesColorDots,
} from '@/shared/components/BrowseSeriesCard';

export type {
  SeriesCardProps,
  SeriesCardVariant,
  SeriesCardLayout,
} from '@/shared/components/BrowseSeriesCard';
