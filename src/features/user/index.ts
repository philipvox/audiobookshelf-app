/**
 * src/features/user/index.ts
 *
 * User library features: favorites, collections, history, progress.
 */

// Types
export * from './types';

// Hooks - Favorites
export {
  useFavorites,
  useIsFavorite,
  useToggleFavorite,
  useAddFavorite,
  useRemoveFavorite,
  useFavoritesCount,
} from './hooks/useFavorites';

// Hooks - Collections
export {
  useCreateCollection,
  useAddToCollection,
  useRemoveFromCollection,
  useDeleteCollection,
  useUpdateCollection,
} from './hooks/useCollectionMutations';

// Components
export { FavoriteButton } from './components/FavoriteButton';
export { AddToCollectionButton } from './components/AddToCollectionButton';
