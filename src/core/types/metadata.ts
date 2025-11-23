/**
 * src/core/types/metadata.ts
 * 
 * TypeScript interfaces for metadata models (authors, series, narrators).
 */

import { LibraryItem } from './library';

/**
 * Author information
 */
export interface Author {
  id: string;
  asin?: string;
  name: string;
  description?: string;
  imagePath?: string;
  addedAt: number;
  updatedAt: number;
}

/**
 * Series information
 */
export interface Series {
  id: string;
  name: string;
  description?: string;
  addedAt: number;
  updatedAt: number;
  books?: LibraryItem[];
}
