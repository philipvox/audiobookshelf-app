/**
 * src/features/home/utils/spine/composition/index.ts
 *
 * Composition system exports.
 */

// Types
export * from './types';

// Profiles
export { GENRE_COMPOSITION_PROFILES, getCompositionProfile } from './profiles';

// Generator
export {
  generateComposition,
  isVerticalTitle,
  isVerticalAuthor,
  getTitleRotation,
  getAuthorRotation,
} from './generator';
