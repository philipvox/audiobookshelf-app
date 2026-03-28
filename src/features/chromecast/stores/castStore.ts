/**
 * Zustand store for Chromecast state.
 *
 * Manages device discovery, session lifecycle, and remote playback state.
 * Integrates with playerStore — when casting, playback commands route
 * through castService instead of local audio.
 */

import { create } from 'zustand';
import { Alert } from 'react-native';
import { castService, CastDevice, MediaStatus } from '../services/castService';
import { logger } from '@/shared/utils/logger';
import { BookMetadata } from '@/core/types';

// Lazy imports to break circular dependencies (castStore ↔ player, core services)
// Typed getters instead of raw require() for compile-time safety
type PlayerStoreModule = typeof import('@/features/player/stores/playerStore');
type SeekingStoreModule = typeof import('@/features/player/stores/seekingStore');
type AudioServiceModule = typeof import('@/features/player/services/audioService');
type ApiClientModule = typeof import('@/core/api');
type BackgroundSyncModule = typeof import('@/features/player/services/backgroundSyncService');

let _playerStore: PlayerStoreModule | null = null;
let _seekingStore: SeekingStoreModule | null = null;
let _audioService: AudioServiceModule | null = null;
let _apiClient: ApiClientModule | null = null;
let _bgSync: BackgroundSyncModule | null = null;

function getPlayerStore() {
  if (!_playerStore) _playerStore = require('@/features/player/stores/playerStore') as PlayerStoreModule;
  return _playerStore.usePlayerStore;
}
function getSeekingStore() {
  if (!_seekingStore) _seekingStore = require('@/features/player/stores/seekingStore') as SeekingStoreModule;
  return _seekingStore.useSeekingStore;
}
function getAudioService() {
  if (!_audioService) _audioService = require('@/features/player/services/audioService') as AudioServiceModule;
  return _audioService.audioService;
}
function getApiClient() {
  if (!_apiClient) _apiClient = require('@/core/api') as ApiClientModule;
  return _apiClient.apiClient;
}
function getBgSyncService() {
  if (!_bgSync) _bgSync = require('@/features/player/services/backgroundSyncService') as BackgroundSyncModule;
  return _bgSync.backgroundSyncService;
}

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
  // Track last progress save time to avoid saving every 1s poll
  let lastProgressSaveTime = 0;
  const CAST_PROGRESS_SAVE_INTERVAL = 10_000; // Save every 10 seconds

  /**
   * Build a proper streaming URL for the Cast device.
   * Uses /api/items/{id}/file/{ino} — the actual audio file endpoint,
   * NOT /api/items/{id}/play (which is POST-only and returns JSON).
   */
  const buildCastStreamUrl = (book: any, baseUrl: string, token: string): { url: string; contentType: string } => {
    const audioFiles = Array.isArray(book.media?.audioFiles) ? book.media.audioFiles : [];
    if (audioFiles.length === 0) {
      throw new Error('Book has no audio files');
    }

    // Use the first audio file's INO for the file URL
    const audioFile = audioFiles[0];
    if (!audioFile || typeof audioFile !== 'object') {
      throw new Error('Invalid audio file entry');
    }
    const ino = audioFile.ino;
    const mimeType = audioFile.mimeType || 'audio/mp4';

    if (!ino) {
      throw new Error('Audio file has no inode number');
    }

    // NOTE: Auth token in URL query parameter is a known limitation of the Chromecast Cast SDK.
    // The SDK requires media URLs to be fully self-authenticating (no custom headers supported),
    // so the token must be embedded in the URL. This means the token may appear in proxy logs
    // and Cast device network history. This is an accepted tradeoff for Chromecast support —
    // there is no alternative mechanism in the Cast SDK for authenticated streaming.
    const url = `${baseUrl}/api/items/${book.id}/file/${ino}?token=${encodeURIComponent(token)}`;
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
            const playerState = getPlayerStore().getState();
            const apiClient = getApiClient();

            // Load if a book is loaded (playing or paused — user can resume on cast)
            if (playerState.currentBook) {
              const book = playerState.currentBook;
              const baseUrl = apiClient.getBaseURL().replace(/\/+$/, '');
              const token = apiClient.getAuthToken();

              if (!token) {
                logger.warn('[Cast] No auth token, cannot load media on cast device');
                return;
              }

              const metadata = book.media?.metadata as BookMetadata | undefined;
              const title = metadata?.title || 'Audiobook';
              const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';
              const rawCoverUrl = apiClient.getItemCoverUrl(book.id);
              // Token in cover URL is also required by Cast SDK (see buildCastStreamUrl comment)
              const coverUrl = token ? `${rawCoverUrl}${rawCoverUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : rawCoverUrl;

              // Build proper streaming URL from audio file INO
              const { url: streamUrl, contentType } = buildCastStreamUrl(book, baseUrl, token);

              logger.info('[Cast] Loading current book onto cast device at position:', playerState.position);
              get().loadMedia(streamUrl, title, author, coverUrl, playerState.position, contentType).then((success) => {
                if (success) {
                  // Pause local audio — cast device handles playback
                  getAudioService().pause().catch((e: unknown) => logger.warn('[Cast] Failed to pause local audio on session start', e));
                  logger.info('[Cast] Current book loaded on cast device, local audio paused');
                }
              }).catch((e: unknown) => logger.error('[Cast] Failed to load media on session start:', e));
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
            const playerState = getPlayerStore().getState();
            if (playerState.currentBook && lastPosition > 0) {
              logger.info('[Cast] Resuming local playback at position:', lastPosition);
              getAudioService().seekTo(lastPosition).then(() => {
                getAudioService().play().catch((e: unknown) => logger.warn('[Cast] Failed to play after session end', e));
                getPlayerStore().setState({ position: lastPosition, isPlaying: true });
              }).catch((e: unknown) => logger.warn('[Cast] Failed to seek after session end', e));
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
            const playerState = getPlayerStore().getState();
            const seekingState = getSeekingStore().getState();

            if (playerState.currentBook && !seekingState.isSeeking) {
              getPlayerStore().setState({
                position: data.position,
                isPlaying: data.isPlaying,
              });

              // Periodically save progress to SQLite so it's not lost if app crashes
              const now = Date.now();
              if (data.isPlaying && now - lastProgressSaveTime > CAST_PROGRESS_SAVE_INTERVAL) {
                lastProgressSaveTime = now;
                try {
                  getBgSyncService().saveProgressLocal(
                    playerState.currentBook.id,
                    data.position,
                    data.duration || playerState.duration
                  );
                } catch {
                  // backgroundSyncService not available
                }
              }
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
            const playerState = getPlayerStore().getState();
            if (playerState.currentBook) {
              getPlayerStore().setState({
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
      castService.startDiscovery().catch((e) => logger.warn('[Cast] Failed to start discovery', e));

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
      if (!castService.isAvailable) {
        logger.warn('[Cast] showPicker called but native CastModule is not available');
        const diag = await castService.diagnose();
        logger.warn('[Cast] Diagnostics:', JSON.stringify(diag));
        Alert.alert(
          'Chromecast Unavailable',
          `The native Cast module is not loaded.\n\nPlatform: ${diag.platform || 'unknown'}\nDetails: ${diag.error || 'Module is null'}`,
        );
        return;
      }

      // Auto-initialize if not done yet
      if (!initialized) {
        get().initialize();
      }
      try {
        await castService.showCastPicker();
      } catch (err: any) {
        logger.error('[Cast] showPicker failed:', err);
        // Fetch diagnostics to give the user actionable info
        try {
          const diag = await castService.diagnose();
          logger.error('[Cast] Diagnostics:', JSON.stringify(diag));
          const details: string[] = [];
          if (!diag.playServicesAvailable) details.push(`Google Play Services: ${diag.playServicesMessage || 'unavailable'}`);
          if (diag.initError) details.push(`Init error: ${diag.initError}`);
          if (!diag.castContextAvailable) details.push('Cast SDK context not initialized');
          if (!diag.activityAvailable) details.push('No activity available');
          if (!diag.routeSelectorAvailable) details.push('No route selector (no Cast devices can be found)');
          Alert.alert(
            'Cast Error',
            details.length > 0
              ? `Could not open Cast picker:\n\n${details.join('\n')}`
              : `Failed to open Cast picker: ${err?.message || 'Unknown error'}`,
          );
        } catch {
          Alert.alert('Cast Error', `Failed to open Cast picker: ${err?.message || 'Unknown error'}`);
        }
      }
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
          const playerState = getPlayerStore().getState();
          if (playerState.currentBook && lastPosition > 0) {
            logger.info('[Cast] Disconnect: resuming local playback at position:', lastPosition);
            getAudioService().seekTo(lastPosition).then(() => {
              getAudioService().play().catch((e: unknown) => logger.warn('[Cast] Failed to play after disconnect', e));
              getPlayerStore().setState({ position: lastPosition, isPlaying: true });
            }).catch((e: unknown) => logger.warn('[Cast] Failed to seek after disconnect', e));
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
