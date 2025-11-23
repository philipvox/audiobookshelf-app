/**
 * src/core/types/files.ts
 * 
 * TypeScript interfaces for file-related models (audio, ebook, library files).
 */

/**
 * Audio file information
 */
export interface AudioFile {
  index: number;
  ino: string;
  metadata: AudioMetadata;
  addedAt: number;
  updatedAt: number;
  trackNumFromMeta?: number;
  discNumFromMeta?: number;
  trackNumFromFilename?: number;
  discNumFromFilename?: number;
  manuallyVerified: boolean;
  invalid: boolean;
  exclude: boolean;
  error?: string;
  format: string;
  duration: number;
  bitRate: number;
  language?: string;
  codec: string;
  timeBase: string;
  channels: number;
  channelLayout: string;
  chapters: AudioFileChapter[];
  embeddedCoverArt?: string;
  metaTags: AudioMetaTags;
  mimeType: string;
}

/**
 * Audio file metadata
 */
export interface AudioMetadata {
  filename: string;
  ext: string;
  path: string;
  relPath: string;
  size: number;
  mtimeMs: number;
  ctimeMs: number;
  birthtimeMs: number;
}

/**
 * Audio file chapter
 */
export interface AudioFileChapter {
  id: number;
  start: number;
  end: number;
  title: string;
}

/**
 * Audio file meta tags
 */
export interface AudioMetaTags {
  tagAlbum?: string;
  tagArtist?: string;
  tagGenre?: string;
  tagTitle?: string;
  tagSeries?: string;
  tagSeriesPart?: string;
  tagTrack?: string;
  tagDisc?: string;
  tagSubtitle?: string;
  tagAlbumArtist?: string;
  tagDate?: string;
  tagComposer?: string;
  tagPublisher?: string;
  tagComment?: string;
  tagDescription?: string;
  tagEncoder?: string;
  tagEncodedBy?: string;
  tagIsbn?: string;
  tagLanguage?: string;
  tagASIN?: string;
  tagOverdriveMediaMarker?: string;
}

/**
 * Ebook file information
 */
export interface EbookFile {
  ino: string;
  metadata: AudioMetadata;
  ebookFormat: string;
  addedAt: number;
  updatedAt: number;
}

/**
 * Library file
 */
export interface LibraryFile {
  ino: string;
  metadata: AudioMetadata;
  addedAt: number;
  updatedAt: number;
  fileType: string;
}
