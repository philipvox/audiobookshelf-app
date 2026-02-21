/**
 * src/features/recommendations/utils/index.ts
 *
 * Exports for Enhanced Recommendation System v2.0 utilities.
 */

// Score weights and configuration
export {
  SLOT_CONFIG,
  TOTAL_SLOTS,
  AFFINITY_WEIGHTS,
  MOOD_WEIGHTS,
  DNA_WEIGHTS,
  COMPARABLE_WEIGHTS,
  TEMPORAL_DECAY,
  MISMATCH_PENALTIES,
  ABANDONMENT_PENALTIES,
  ERA_WEIGHTS,
  LENGTH_WEIGHTS,
  DIVERSITY,
  CONFIDENCE_THRESHOLDS,
  getTemporalDecay,
  calculateMetadataRichness,
  getConfidenceLevel,
} from './scoreWeights';
export type { SlotType } from './scoreWeights';

// Publication era system
export {
  ERAS,
  classifyYear,
  getPublicationYear,
  getPublicationEra,
  getEraFromDNA,
  matchesEraPreference,
  filterByEra,
  getEraDistribution,
  getEraPercentages,
  calculateEraScore,
  getEraLabel,
  getEraDescription,
  getEraYearRange,
} from './publicationEra';
export type { PublicationEra, EraConfig, EraPreference } from './publicationEra';

// Comparable books engine
export {
  prepareSourceBook,
  prepareCandidate,
  calculateSimilarity,
  findComparableBooks,
  findBooksLikeThis,
  findBooksComparableToThis,
  buildSimilarityChain,
} from './comparableBooksEngine';
export type {
  ComparableResult,
  SimilarityType,
  ComparableSourceBook,
  ComparableCandidate,
  ComparableEngineOptions,
} from './comparableBooksEngine';

// Comprehensive scoring
export {
  calculateComprehensiveScore,
  scoreItems,
  scoreAndRank,
  applyDiversityConstraints,
} from './comprehensiveScoring';
export type {
  AffinityData,
  ScoringContext,
  ScoreBreakdown,
  ComprehensiveScore,
  RecommendationCategory,
  ScoredItem,
} from './comprehensiveScoring';
