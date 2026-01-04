/**
 * src/features/player/utils/types.ts
 *
 * Shared types for player utility functions.
 * These are duplicated from playerStore/audioService to avoid circular dependencies.
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
