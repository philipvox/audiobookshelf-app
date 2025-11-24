/**
 * src/features/narrators/index.ts
 *
 * Public API exports for the narrators feature.
 */

export { NarratorDetailScreen } from './screens/NarratorDetailScreen';
export { NarratorCard } from './components/NarratorCard';
export { useNarrators } from './hooks/useNarrators';
export { narratorAdapter } from './services/narratorAdapter';
export type { NarratorInfo } from './services/narratorAdapter';