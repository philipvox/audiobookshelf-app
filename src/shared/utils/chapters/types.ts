/**
 * src/shared/utils/chapters/types.ts
 *
 * Shared types for chapter and progress utility functions.
 * These are generic audiobook types used across features.
 */

export interface AudioTrackInfo {
  url: string;
  title: string;
  startOffset: number; // Global start position of this track
  duration: number;
}

export interface Chapter {
  id: number;
  start: number;
  end: number;
  title: string;
}
