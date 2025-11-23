/**
 * src/core/types/library.ts
 * 
 * TypeScript interfaces for library-related models.
 */

import { BookMedia, PodcastMedia } from './media';
import { LibraryFile } from './files';

/**
 * Library structure containing audiobooks/podcasts
 */
export interface Library {
  id: string;
  name: string;
  folders: LibraryFolder[];
  displayOrder: number;
  icon: string;
  mediaType: 'book' | 'podcast';
  provider: string;
  settings: LibrarySettings;
  createdAt: number;
  lastUpdate: number;
}

/**
 * Folder within a library
 */
export interface LibraryFolder {
  id: string;
  fullPath: string;
  libraryId: string;
  addedAt: number;
}

/**
 * Library settings and preferences
 */
export interface LibrarySettings {
  coverAspectRatio: number;
  disableWatcher: boolean;
  skipMatchingMediaWithAsin: boolean;
  skipMatchingMediaWithIsbn: boolean;
  autoScanCronExpression?: string;
}

/**
 * Library item (book or podcast)
 */
export interface LibraryItem {
  id: string;
  ino: string;
  libraryId: string;
  folderId: string;
  path: string;
  relPath: string;
  isFile: boolean;
  mtimeMs: number;
  ctimeMs: number;
  birthtimeMs: number;
  addedAt: number;
  updatedAt: number;
  lastScan?: number;
  scanVersion?: string;
  isMissing: boolean;
  isInvalid: boolean;
  mediaType: 'book' | 'podcast';
  media: BookMedia | PodcastMedia;
  libraryFiles: LibraryFile[];
}

/**
 * Collection of library items
 */
export interface Collection {
  id: string;
  libraryId: string;
  userId: string;
  name: string;
  description?: string;
  books: LibraryItem[];
  lastUpdate: number;
  createdAt: number;
}

/**
 * User-created playlist
 */
export interface Playlist {
  id: string;
  libraryId: string;
  userId: string;
  name: string;
  description?: string;
  coverPath?: string;
  items: PlaylistItem[];
  lastUpdate: number;
  createdAt: number;
}

/**
 * Item within a playlist
 */
export interface PlaylistItem {
  libraryItemId: string;
  episodeId?: string;
  libraryItem?: LibraryItem;
}
