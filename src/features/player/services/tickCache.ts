/**
 * src/features/player/services/tickCache.ts
 *
 * Re-export shim for backward compatibility.
 * Canonical location: @/shared/utils/tickCache
 */

export {
  getCachedTicks,
  cacheTicks,
  generateAndCacheTicks,
  clearCachedTicks,
  clearAllTickCaches,
  preWarmTickCache,
} from '@/shared/utils/tickCache';

export type { TimelineTick, ChapterInput } from '@/shared/utils/tickCache';
