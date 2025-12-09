/**
 * src/features/player/services/nowPlayingService.ts
 *
 * Service for managing Now Playing metadata across platforms.
 * Updates lock screen, Control Center, and notification shade with:
 * - Book title and author
 * - Chapter information
 * - Cover art
 * - Playback progress and duration
 * - Playback rate
 */

import { Platform } from 'react-native';
import { audioLog } from '@/shared/utils/audioDebug';

const log = (...args: any[]) => audioLog.audio('[NowPlaying]', ...args);

// Try to import expo-media-control
let MediaControl: any = null;
let PlaybackState: any = null;

try {
  const mediaControlModule = require('expo-media-control');
  MediaControl = mediaControlModule.MediaControl;
  PlaybackState = mediaControlModule.PlaybackState;
} catch (e) {
  console.warn('[NowPlayingService] expo-media-control not available');
}

/**
 * Now Playing metadata
 */
export interface NowPlayingMetadata {
  /** Book title */
  title: string;
  /** Author name */
  artist: string;
  /** Series name or book title (displayed as album) */
  album?: string;
  /** Chapter title (can be prepended to title) */
  chapterTitle?: string;
  /** Chapter number (1-indexed) */
  chapterNumber?: number;
  /** Total chapters */
  totalChapters?: number;
  /** Cover art URL or local path */
  artwork?: string;
  /** Total duration in seconds */
  duration: number;
  /** Current position in seconds */
  position: number;
  /** Playback rate (1.0 = normal) */
  playbackRate?: number;
}

/**
 * Title format options
 */
export type TitleFormat = 'book' | 'chapter' | 'both';

/**
 * Configuration for Now Playing display
 */
export interface NowPlayingConfig {
  /** How to format the title */
  titleFormat: TitleFormat;
  /** Whether to show chapter progress in subtitle */
  showChapterProgress: boolean;
  /** Whether to include playback speed in display */
  showPlaybackSpeed: boolean;
}

const DEFAULT_CONFIG: NowPlayingConfig = {
  titleFormat: 'chapter',
  showChapterProgress: true,
  showPlaybackSpeed: false,
};

/**
 * Now Playing service - manages lock screen metadata
 */
class NowPlayingService {
  private config: NowPlayingConfig = DEFAULT_CONFIG;
  private currentMetadata: NowPlayingMetadata | null = null;
  private isEnabled = false;
  private updateThrottleMs = 1000; // Minimum time between metadata updates
  private lastUpdateTime = 0;
  private pendingUpdate: NodeJS.Timeout | null = null;

  /**
   * Initialize the service
   */
  async init(): Promise<void> {
    if (!MediaControl) {
      log('Media control not available - skipping init');
      return;
    }

    log('Initializing Now Playing service...');
    this.isEnabled = true;
    log('Now Playing service initialized');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NowPlayingConfig>): void {
    this.config = { ...this.config, ...config };
    log('Config updated:', this.config);

    // Re-apply current metadata with new config
    if (this.currentMetadata) {
      this.updateMetadata(this.currentMetadata);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): NowPlayingConfig {
    return { ...this.config };
  }

  /**
   * Update Now Playing metadata
   */
  async updateMetadata(metadata: NowPlayingMetadata): Promise<void> {
    if (!this.isEnabled || !MediaControl) {
      return;
    }

    this.currentMetadata = metadata;

    // Throttle updates
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;

    if (timeSinceLastUpdate < this.updateThrottleMs) {
      // Schedule delayed update
      if (this.pendingUpdate) {
        clearTimeout(this.pendingUpdate);
      }
      this.pendingUpdate = setTimeout(() => {
        this.doUpdateMetadata(metadata);
      }, this.updateThrottleMs - timeSinceLastUpdate);
      return;
    }

    await this.doUpdateMetadata(metadata);
  }

  /**
   * Actually perform the metadata update
   */
  private async doUpdateMetadata(metadata: NowPlayingMetadata): Promise<void> {
    if (!MediaControl) return;

    this.lastUpdateTime = Date.now();
    this.pendingUpdate = null;

    try {
      const formattedTitle = this.formatTitle(metadata);
      const formattedArtist = this.formatArtist(metadata);

      await MediaControl.updateMetadata({
        title: formattedTitle,
        artist: formattedArtist,
        album: metadata.album || metadata.title,
        duration: metadata.duration,
        artwork: metadata.artwork ? { uri: metadata.artwork } : undefined,
      });

      log(`Metadata updated: "${formattedTitle}" - ${formattedArtist}`);
    } catch (error: any) {
      audioLog.warn('[NowPlaying] Failed to update metadata:', error.message);
    }
  }

  /**
   * Update playback state (playing/paused)
   */
  async updatePlaybackState(isPlaying: boolean, position?: number): Promise<void> {
    if (!this.isEnabled || !MediaControl || !PlaybackState) {
      return;
    }

    try {
      const state = isPlaying ? PlaybackState.PLAYING : PlaybackState.PAUSED;
      await MediaControl.updatePlaybackState(state, position);
    } catch (error: any) {
      audioLog.warn('[NowPlaying] Failed to update playback state:', error.message);
    }
  }

  /**
   * Update position only (for progress updates)
   */
  async updatePosition(position: number): Promise<void> {
    if (!this.isEnabled || !MediaControl || !this.currentMetadata) {
      return;
    }

    // Only update position, don't change metadata
    this.currentMetadata.position = position;
  }

  /**
   * Clear Now Playing info
   */
  async clear(): Promise<void> {
    if (!this.isEnabled || !MediaControl || !PlaybackState) {
      return;
    }

    try {
      await MediaControl.updatePlaybackState(PlaybackState.STOPPED);
      this.currentMetadata = null;
      log('Now Playing cleared');
    } catch (error: any) {
      audioLog.warn('[NowPlaying] Failed to clear:', error.message);
    }
  }

  /**
   * Format the title based on configuration
   */
  private formatTitle(metadata: NowPlayingMetadata): string {
    const { titleFormat } = this.config;

    switch (titleFormat) {
      case 'book':
        return metadata.title;

      case 'chapter':
        if (metadata.chapterTitle) {
          return metadata.chapterTitle;
        }
        if (metadata.chapterNumber && metadata.totalChapters) {
          return `Chapter ${metadata.chapterNumber}`;
        }
        return metadata.title;

      case 'both':
        if (metadata.chapterTitle) {
          // Truncate if too long
          const chapterPart = metadata.chapterTitle.length > 30
            ? metadata.chapterTitle.substring(0, 27) + '...'
            : metadata.chapterTitle;
          return `${chapterPart}`;
        }
        if (metadata.chapterNumber && metadata.totalChapters) {
          return `Ch ${metadata.chapterNumber}: ${metadata.title}`;
        }
        return metadata.title;

      default:
        return metadata.title;
    }
  }

  /**
   * Format the artist/subtitle based on configuration
   */
  private formatArtist(metadata: NowPlayingMetadata): string {
    let artist = metadata.artist;

    // Add chapter progress if enabled
    if (this.config.showChapterProgress && metadata.chapterNumber && metadata.totalChapters) {
      artist = `${artist} • Ch ${metadata.chapterNumber}/${metadata.totalChapters}`;
    }

    // Add playback speed if enabled and not 1x
    if (this.config.showPlaybackSpeed && metadata.playbackRate && metadata.playbackRate !== 1.0) {
      artist = `${artist} • ${metadata.playbackRate}x`;
    }

    return artist;
  }

  /**
   * Create metadata from player state
   * Helper method to convert player store state to NowPlayingMetadata
   */
  createMetadataFromPlayerState(state: {
    book: {
      id: string;
      title: string;
      author: string;
      series?: string;
      coverUrl?: string;
    };
    chapter?: {
      title: string;
      index: number;
      total: number;
    };
    position: number;
    duration: number;
    playbackRate: number;
  }): NowPlayingMetadata {
    return {
      title: state.book.title,
      artist: state.book.author,
      album: state.book.series || state.book.title,
      chapterTitle: state.chapter?.title,
      chapterNumber: state.chapter ? state.chapter.index + 1 : undefined,
      totalChapters: state.chapter?.total,
      artwork: state.book.coverUrl,
      duration: state.duration,
      position: state.position,
      playbackRate: state.playbackRate,
    };
  }
}

// Export singleton
export const nowPlayingService = new NowPlayingService();
