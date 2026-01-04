/**
 * Analytics module exports.
 */

export {
  analyticsService,
  type AnalyticsEvent,
  type EventCategory,
  type SessionInfo,
  type PerformanceMetric,
} from './analyticsService';

export {
  useAnalytics,
  useScreenAnalytics,
  useTimingAnalytics,
  usePlaybackSessionAnalytics,
  useColdStartAnalytics,
} from './useAnalytics';
