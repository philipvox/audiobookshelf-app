/**
 * src/features/player/services/sessionService.ts
 * 
 * ABS Playback Session API
 * Proper way to stream audio with server-managed sessions
 */

import { apiClient } from '@/core/api';

export interface AudioTrack {
  index: number;
  startOffset: number;
  duration: number;
  title: string;
  contentUrl: string;
  mimeType: string;
}

export interface Chapter {
  id: number;
  start: number;
  end: number;
  title: string;
}

export interface PlaybackSession {
  id: string;
  libraryItemId: string;
  episodeId?: string;
  mediaType: string;
  duration: number;
  currentTime: number;
  audioTracks: AudioTrack[];
  chapters: Chapter[];
  coverPath?: string;
  mediaMetadata?: {
    title?: string;
    authorName?: string;
    narratorName?: string;
  };
}

class SessionService {
  private currentSession: PlaybackSession | null = null;

  /**
   * Start a new playback session
   * Returns stream URL, chapters, and session ID
   */
  async startSession(libraryItemId: string): Promise<PlaybackSession> {
    console.log('[Session] Starting session for:', libraryItemId);
    const startTime = Date.now();

    try {
      // POST to create session
      const session = await apiClient.post<PlaybackSession>(
        `/api/session/${libraryItemId}`,
        {
          deviceInfo: {
            clientName: 'AudiobookShelf Mobile',
            clientVersion: '1.0.0',
          },
          forceDirectPlay: true, // Don't transcode
          forceTranscode: false,
          supportedMimeTypes: [
            'audio/mpeg',
            'audio/mp4',
            'audio/m4b',
            'audio/m4a',
            'audio/flac',
            'audio/ogg',
            'audio/webm',
          ],
        }
      );

      this.currentSession = session;
      
      const elapsed = Date.now() - startTime;
      console.log('[Session] ✓ Session started in', elapsed, 'ms');
      console.log('[Session] Duration:', session.duration);
      console.log('[Session] Tracks:', session.audioTracks?.length);
      console.log('[Session] Chapters:', session.chapters?.length);
      console.log('[Session] Start time:', session.currentTime);

      return session;
    } catch (error: any) {
      console.error('[Session] ❌ Failed to start session:', error.message);
      throw error;
    }
  }

  /**
   * Sync current playback position with server
   */
  async syncProgress(currentTime: number, duration?: number): Promise<void> {
    if (!this.currentSession) {
      console.warn('[Session] No active session to sync');
      return;
    }

    try {
      await apiClient.post(`/api/session/${this.currentSession.id}/sync`, {
        currentTime,
        duration: duration || this.currentSession.duration,
        timeListened: 0, // Could track actual listen time
      });
    } catch (error) {
      console.warn('[Session] Sync failed:', error);
    }
  }

  /**
   * Close the current session
   */
  async closeSession(currentTime?: number): Promise<void> {
    if (!this.currentSession) return;

    try {
      await apiClient.post(`/api/session/${this.currentSession.id}/close`, {
        currentTime: currentTime || 0,
      });
      console.log('[Session] Session closed');
    } catch (error) {
      console.warn('[Session] Failed to close session:', error);
    }

    this.currentSession = null;
  }

  /**
   * Get the stream URL for the current session
   */
  getStreamUrl(): string | null {
    if (!this.currentSession?.audioTracks?.length) return null;
    
    const baseUrl = apiClient.getBaseURL();
    const track = this.currentSession.audioTracks[0];
    
    // contentUrl is relative, needs base URL
    return `${baseUrl}${track.contentUrl}`;
  }

  /**
   * Get chapters from current session
   */
  getChapters(): Chapter[] {
    return this.currentSession?.chapters || [];
  }

  /**
   * Get current session
   */
  getSession(): PlaybackSession | null {
    return this.currentSession;
  }

  /**
   * Get session start time (where to resume)
   */
  getStartTime(): number {
    return this.currentSession?.currentTime || 0;
  }
}

export const sessionService = new SessionService();