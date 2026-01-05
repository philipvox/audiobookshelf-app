/**
 * src/features/library/types.ts
 *
 * Shared types for the Library feature.
 */

import { LibraryItem } from '@/core/types';
import { type LucideIcon } from 'lucide-react-native';

// ============================================================================
// TAB TYPES
// ============================================================================

/** Available tab identifiers */
export type TabType = 'all' | 'downloaded' | 'in-progress' | 'not-started' | 'completed' | 'favorites';

/** Tab configuration */
export interface TabConfig {
  id: TabType;
  label: string;
  Icon: LucideIcon;
}

/** Tab labels for display */
export const TAB_LABELS: Record<TabType, string> = {
  'all': 'All',
  'downloaded': 'Downloaded',
  'in-progress': 'In Progress',
  'not-started': 'Not Started',
  'completed': 'Finished',
  'favorites': 'Favorites',
};

/** Ordered tabs for display */
export const TAB_ORDER: TabType[] = ['all', 'downloaded', 'in-progress', 'completed', 'favorites'];

// ============================================================================
// BOOK TYPES
// ============================================================================

/** Enriched book with metadata for display */
export interface EnrichedBook {
  id: string;
  item: LibraryItem;
  title: string;
  author: string;
  seriesName: string;
  sequence?: number;
  progress: number;
  duration: number;
  totalBytes: number;
  lastPlayedAt?: number;
  addedAt?: number;
  isDownloaded?: boolean;
}

/** Series group with aggregated data */
export interface SeriesGroup {
  name: string;
  books: EnrichedBook[];
  totalBooks: number;
  downloadedCount: number;
  completedCount: number;
  inProgressCount: number;
}

/** Fanned series card data */
export interface FannedSeriesCardData {
  name: string;
  books: Array<{ id: string }>;
  bookCount?: number;
}

// ============================================================================
// PROPS TYPES
// ============================================================================

/** Common props for all tab components */
export interface LibraryTabProps {
  onBookPress: (bookId: string) => void;
  onSeriesPress: (seriesName: string) => void;
  onAuthorPress?: (authorName: string) => void;
  onNarratorPress?: (narratorName: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  searchQuery?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Extract metadata safely from LibraryItem */
export function getMetadata(item: LibraryItem): any {
  return (item.media?.metadata as any) || {};
}

/** Get progress from item */
export function getProgress(item: LibraryItem): number {
  const userProgress = (item as any).userMediaProgress;
  return userProgress?.progress || 0;
}

/** Get duration from item */
export function getDuration(item: LibraryItem): number {
  const media = item.media as any;
  return media?.duration || 0;
}

/** Format time remaining */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

/** Format duration */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/** Extract series metadata from series name string */
export function extractSeriesMetadata(seriesName: string): { cleanName: string; sequence?: number } {
  if (!seriesName) return { cleanName: '' };
  const match = seriesName.match(/^(.+?)\s*#([\d.]+)$/);
  if (match) {
    return {
      cleanName: match[1].trim(),
      sequence: parseFloat(match[2]),
    };
  }
  return { cleanName: seriesName };
}
