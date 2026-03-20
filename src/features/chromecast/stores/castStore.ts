/**
 * Zustand store for Chromecast state.
 *
 * Manages device discovery, session lifecycle, and remote playback state.
 * Integrates with playerStore — when casting, playback commands route
 * through castService instead of local audio.
 */

import { create } from 'zustand';
import { castService, CastDevice, MediaStatus } from '../services/castService';
import { logger } from '@/shared/utils/logger';

interface CastState {
  /** Whether the Cast SDK is available on this device */
  isAvailable: boolean;
  /** Whether currently connected to a Cast device */
  isConnected: boolean;
  /** Name of the connected Cast device */
  deviceName: string | null;
  /** Session ID of the active Cast session */
  sessionId: string | null;
  /** Current playback position on the Cast device (seconds) */
  position: number;
  /** Total duration of media on Cast device (seconds) */
  duration: number;
  /** Whether Cast device is currently playing */
  isPlaying: boolean;
  /** Available Cast devices */
  devices: CastDevice[];

  // Actions
  initialize: () => void;
  cleanup: () => void;
  showPicker: () => Promise<void>;
  loadMedia: (url: string, title: string, author: string, coverUrl: string, position: number, contentType?: string) => Promise<boolean>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  stop: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export const useCastStore = create<CastState>((set, get) => {
  const unsubscribes: (() => void)[] = [];
  let initialized = false;
  // Flag to prevent onSessionEnded from racing with disconnect()
  let isDisconnecting = false;

  /**
   * Build a proper streaming URL for the Cast device.
   * Uses /api/items/{id}/file/{ino} — the actual audio file endpoint,
   * NOT /api/items/{id}/play (which is POST-only and returns JSON).
   */
  const buildCastStreamUrl = (book: any, baseUrl: string, token: string): { url: string; contentType: string } => {
    const audioFiles = book.media?.audioFiles || [];
    if (audioFiles.length === 0) {
      throw new Error('Book has no audio files');
    }

    // Use the first audio file's INO for the file URL
    const audioFile = audioFiles[0];
    const ino = audioFile.ino;
    const mimeType = audioFile.mimeType || 'audio/mp4';

    if (!ino) {
      throw new Error('Audio file has no inode number');
    }

    const url = `${baseUrl}/api/items/${book.id}/file/${ino}?token=${token}`;
    return { url, contentType: mimeType };
  };

  return {
    isAvailable: castService.isAvailable,
    isConnected: false,
    deviceName: null,
    sessionId: null,
    position: 0,
    duration: 0,
    isPlaying: false,
    devices: [],

    initialize: () => {
      if (!castService.isAvailable) return;

      // Prevent double initialization
      if (initialized) {
        logger.info('[Cast] Store already initialized, skipping');
        return;
      }
      initialized = true;

      castService.initialize();

      // Listen for session events
      unsubscribes.push(
        castService.on('onSessionStarted', (data) => {
          // Skip if we're in the middle of a manual disconnect
          if (isDisconnecting) return;

          logger.info('[Cast] Session started:', data.deviceName);
          set({
            isConnected: true,
            deviceName: data.deviceName,
            sessionId: data.sessionId,
          });

          // Load current book onto cast device if one is loaded
          try {
            const { usePlayerStore } = require('@/features/player/stores/playerStore');
            const { apiClient } = require('@/core/api');
            const playerState = usePlayerStore.getState();

            // Load if a book is loaded (playing or paused — user can resume on cast)
            if (playerState.currentBook) {
              const book = playerState.currentBook;
              const baseUrl = apiClient.getBaseURL().replace(/\/+$/, '');
              const token = apiClient.getAuthToken();

              if (!token) {
                logger.warn('[Cast] No auth token, cannot load media on cast device');
                return;
              }

              const metadata = book.media?.metadata as any;
              const title = metadata?.title || 'Audiobook';
              const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';
              const coverUrl = `${apiClient.getItemCoverUrl(book.id)}${token ? `&token=${token}` : ''}`;

              // Build proper streaming URL from audio file INO
              const { url: streamUrl, contentType } = buildCastStreamUrl(book, baseUrl, token);

              logger.info('[Cast] Loading current book onto cast device at position:', playerState.position);
              get().loadMedia(streamUrl, title, author, coverUrl, playerState.position, contentType).then((success) => {
                if (success) {
                  // Pause local audio — cast device handles playback
                  const { audioService } = require('@/features/player/services/audioService');
                  audioService.pause().catch(() => {});
                  logger.info('[Cast] Current book loaded on cast device, local audio paused');
                }
              });
            }
          } catch (err) {
            logger.error('[Cast] Failed to load current book on session start:', err);
          }
        })
      );

      unsubscribes.push(
        castService.on('onSessionEnded', () => {
          // Skip if disconnect() is handling this
          if (isDisconnecting) return;

          logger.info('[Cast] Session ended');
          // Capture last position before clearing state
          const lastPosition = get().position;

          set({
            isConnected: false,
            deviceName: null,
            sessionId: null,
            isPlaying: false,
            position: 0,
            duration: 0,
          });

          // Resume local playback from cast device's last position
          try {
            const { usePlayerStore } = require('@/features/player/stores/playerStore');
            const { audioService } = require('@/features/player/services/audioService');
            const playerState = usePlayerStore.getState();
            if (playerState.currentBook && lastPosition > 0) {
              logger.info('[Cast] Resuming local playback at position:', lastPosition);
              audioService.seekTo(lastPosition).then(() => {
                audioService.play().catch(() => {});
                usePlayerStore.setState({ position: lastPosition, isPlaying: true });
              }).catch(() => {});
            }
          } catch (err) {
            logger.error('[Cast] Failed to resume local playback:', err);
          }
        })
      );

      unsubscribes.push(
        castService.on('onSessionStartFailed', (data) => {
          logger.error('[Cast] Session start failed:', data.error);
        })
      );

      unsubscribes.push(
        castService.on('onMediaStatusUpdate', (data: MediaStatus) => {
          set({
            position: data.position,
            duration: data.duration,
            isPlaying: data.isPlaying,
          });

          // Sync cast position to player store so UI (timeline, progress) stays in sync
          // Respects the seeking guard to prevent jitter during scrubbing
          try {
            const { usePlayerStore } = require('@/features/player/stores/playerStore');
            const { useSeekingStore } = require('@/features/player/stores/seekingStore');
            const playerState = usePlayerStore.getState();
            const seekingState = useSeekingStore.getState();

            if (playerState.currentBook && !seekingState.isSeeking) {
              usePlayerStore.setState({
                position: data.position,
                isPlaying: data.isPlaying,
              });
            }
          } catch {
            // Player store not available yet — skip sync
          }
        })
      );

      // Handle media playback finished on cast device
      unsubscribes.push(
        castService.on('onMediaFinished', (data) => {
          logger.info('[Cast] Media finished on cast device at position:', data.position);
          set({ isPlaying: false });

          // Sync final position and mark finished
          try {
            const { usePlayerStore } = require('@/features/player/stores/playerStore');
            const playerState = usePlayerStore.getState();
            if (playerState.currentBook) {
              usePlayerStore.setState({
                position: data.position || data.duration,
                isPlaying: false,
              });
            }
          } catch {
            // Player store not available
          }
        })
      );

      // Handle media errors on cast device
      unsubscribes.push(
        castService.on('onMediaError', (data) => {
          logger.error('[Cast] Media error:', data.error);
        })
      );

      // Start discovery
      castService.startDiscovery().catch(() => {});

      // Check initial connection state
      castService.isConnected().then((connected) => {
        if (connected) {
          set({ isConnected: true });
        }
      });
    },

    cleanup: () => {
      for (const unsub of unsubscribes) {
        unsub();
      }
      unsubscribes.length = 0;
      initialized = false;
      isDisconnecting = false;
      castService.destroy();
      // Reset state to prevent stale values if re-initialized
      set({
        isConnected: false,
        deviceName: null,
        sessionId: null,
        position: 0,
        duration: 0,
        isPlaying: false,
      });
    },

    showPicker: async () => {
      await castService.showCastPicker();
    },

    loadMedia: async (url, title, author, coverUrl, position, contentType) => {
      try {
        return await castService.loadMedia({
          url,
          title,
          author,
          coverUrl,
          position,
          contentType: contentType || 'audio/mp4',
        });
      } catch (err) {
        logger.error('[Cast] Failed to load media:', err);
        return false;
      }
    },

    play: async () => {
      try {
        await castService.play();
        set({ isPlaying: true });
      } catch (err) {
        logger.error('[Cast] Failed to play:', err);
      }
    },

    pause: async () => {
      try {
        await castService.pause();
        set({ isPlaying: false });
      } catch (err) {
        logger.error('[Cast] Failed to pause:', err);
      }
    },

    seek: async (position) => {
      try {
        await castService.seek(position);
        set({ position });
      } catch (err) {
        logger.error('[Cast] Failed to seek:', err);
      }
    },

    stop: async () => {
      try {
        await castService.stop();
        set({ isPlaying: false });
      } catch (err) {
        logger.error('[Cast] Failed to stop:', err);
      }
    },

    disconnect: async () => {
      try {
        // Set flag so onSessionEnded handler doesn't race with us
        isDisconnecting = true;

        // Capture last position before disconnecting
        const lastPosition = get().position;
        await castService.disconnect();
        set({
          isConnected: false,
          deviceName: null,
          sessionId: null,
          isPlaying: false,
          position: 0,
          duration: 0,
        });

        // Resume local playback from cast device's last position
        try {
          const { usePlayerStore } = require('@/features/player/stores/playerStore');
          const { audioService } = require('@/features/player/services/audioService');
          const playerState = usePlayerStore.getState();
          if (playerState.currentBook && lastPosition > 0) {
            logger.info('[Cast] Disconnect: resuming local playback at position:', lastPosition);
            audioService.seekTo(lastPosition).then(() => {
              audioService.play().catch(() => {});
              usePlayerStore.setState({ position: lastPosition, isPlaying: true });
            }).catch(() => {});
          }
        } catch (err) {
          logger.error('[Cast] Failed to resume local playback after disconnect:', err);
        }

        isDisconnecting = false;
      } catch (err) {
        isDisconnecting = false;
        logger.error('[Cast] Failed to disconnect:', err);
      }
    },
  };
});
