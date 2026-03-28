/**
 * src/features/book-detail/index.ts
 *
 * Public API exports for the book-detail feature.
 */

export { SecretLibraryBookDetailScreen } from './screens/SecretLibraryBookDetailScreen';
export { useBookDetails } from './hooks/useBookDetails';

// Re-export star position store (canonical location: @/shared/stores/starPositionStore)
export {
  useStarPositionStore,
  STAR_HIT_RADIUS,
  type StarPosition,
} from './stores/starPositionStore';
