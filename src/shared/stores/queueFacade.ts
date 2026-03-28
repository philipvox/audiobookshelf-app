/**
 * src/shared/stores/queueFacade.ts
 *
 * Re-exports from the queue feature for cross-feature consumption.
 * Other features should import queue stores from here instead of
 * directly from @/features/queue/stores/*.
 */

export {
  useQueueStore,
  useQueue,
  getUpNextQueue,
  getPlayedQueue,
  useIsInQueue,
} from '@/features/queue/stores/queueStore';

export type { QueueBook, QueueBookMeta } from '@/features/queue/stores/queueStore';

// Components
export { QueuePanel } from '@/features/queue/components/QueuePanel';
