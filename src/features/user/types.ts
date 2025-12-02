/**
 * src/features/user/types.ts
 *
 * Type definitions for user library features.
 */

import { LibraryItem } from '@/core/types';

// =============================================================================
// FAVORITES
// =============================================================================

export interface FavoriteItem {
  itemId: string;
  addedAt: string;
  item?: LibraryItem;
}

// =============================================================================
// COLLECTIONS
// =============================================================================

export interface Collection {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionWithItems extends Collection {
  items: CollectionItem[];
}

export interface CollectionItem {
  itemId: string;
  order: number;
  addedAt: string;
  item?: LibraryItem;
}

// =============================================================================
// HISTORY & PROGRESS
// =============================================================================

export interface ListeningHistory {
  itemId: string;
  lastPlayedAt: string;
  totalListenTime: number;
  item?: LibraryItem;
}

export interface ItemProgress {
  itemId: string;
  currentTime: number;
  duration: number;
  progress: number;
  isFinished: boolean;
  lastUpdate: string;
  currentChapter?: number;
}

// =============================================================================
// CONTINUE LISTENING
// =============================================================================

export interface ContinueListeningItem {
  itemId: string;
  currentTime: number;
  duration: number;
  progress: number;
  lastPlayedAt: string;
  item: LibraryItem;
}
