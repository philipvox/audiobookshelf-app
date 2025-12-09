/**
 * src/features/player/services/remoteCommandService.ts
 *
 * Centralized service for handling remote control commands from:
 * - Lock screen controls (iOS/Android)
 * - Control Center (iOS)
 * - Notification shade (Android)
 * - Headphone buttons (wired/Bluetooth)
 * - Car steering wheel controls
 * - CarPlay / Android Auto
 *
 * This service provides a unified interface for all external playback commands,
 * ensuring consistent behavior regardless of the source.
 */

import { audioLog } from '@/shared/utils/audioDebug';

const log = (...args: any[]) => audioLog.audio('[RemoteCommand]', ...args);

/**
 * Remote command types that can be received
 */
export type RemoteCommand =
  | 'play'
  | 'pause'
  | 'toggle'
  | 'stop'
  | 'skipForward'
  | 'skipBackward'
  | 'nextTrack'      // Maps to next chapter for audiobooks
  | 'previousTrack'  // Maps to previous chapter for audiobooks
  | 'seekTo'
  | 'setSpeed';

/**
 * Command handler function type
 */
export type CommandHandler = (data?: { position?: number; speed?: number }) => Promise<void>;

/**
 * Remote command configuration
 */
export interface RemoteCommandConfig {
  /** Skip forward interval in seconds (default: 30) */
  skipForwardSeconds: number;
  /** Skip backward interval in seconds (default: 30) */
  skipBackwardSeconds: number;
  /** Available playback speeds */
  availableSpeeds: number[];
  /** Whether next/prev should navigate chapters or skip time */
  trackNavigationMode: 'chapter' | 'skip';
  /** Seconds threshold for "restart chapter" vs "previous chapter" */
  previousThreshold: number;
}

const DEFAULT_CONFIG: RemoteCommandConfig = {
  skipForwardSeconds: 30,
  skipBackwardSeconds: 30,
  availableSpeeds: [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0],
  trackNavigationMode: 'chapter',
  previousThreshold: 3,
};

/**
 * Remote command service - bridges external controls with player store
 */
class RemoteCommandService {
  private config: RemoteCommandConfig = DEFAULT_CONFIG;
  private handlers: Map<RemoteCommand, CommandHandler> = new Map();
  private isInitialized = false;

  /**
   * Initialize the service with command handlers
   * Call this once at app startup
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      log('Already initialized');
      return;
    }

    log('Initializing remote command service...');

    // Set up handlers that bridge to player store
    // These are set up lazily to avoid circular dependencies
    this.setupDefaultHandlers();

    this.isInitialized = true;
    log('Remote command service initialized');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RemoteCommandConfig>): void {
    this.config = { ...this.config, ...config };
    log('Config updated:', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): RemoteCommandConfig {
    return { ...this.config };
  }

  /**
   * Register a handler for a specific command
   */
  registerHandler(command: RemoteCommand, handler: CommandHandler): void {
    this.handlers.set(command, handler);
    log(`Handler registered for: ${command}`);
  }

  /**
   * Handle a remote command
   */
  async handleCommand(command: RemoteCommand, data?: { position?: number; speed?: number }): Promise<void> {
    log(`Handling command: ${command}`, data ? JSON.stringify(data) : '');

    const handler = this.handlers.get(command);
    if (!handler) {
      log(`No handler for command: ${command}`);
      return;
    }

    try {
      await handler(data);
    } catch (error) {
      audioLog.error(`[RemoteCommand] Error handling ${command}:`, error);
    }
  }

  /**
   * Set up default handlers that use playerStore
   */
  private setupDefaultHandlers(): void {
    // Play
    this.registerHandler('play', async () => {
      const { usePlayerStore } = await import('../stores/playerStore');
      await usePlayerStore.getState().play();
    });

    // Pause
    this.registerHandler('pause', async () => {
      const { usePlayerStore } = await import('../stores/playerStore');
      await usePlayerStore.getState().pause();
    });

    // Toggle play/pause
    this.registerHandler('toggle', async () => {
      const { usePlayerStore } = await import('../stores/playerStore');
      const store = usePlayerStore.getState();
      if (store.isPlaying) {
        await store.pause();
      } else {
        await store.play();
      }
    });

    // Stop
    this.registerHandler('stop', async () => {
      const { usePlayerStore } = await import('../stores/playerStore');
      await usePlayerStore.getState().pause();
    });

    // Skip forward
    this.registerHandler('skipForward', async () => {
      const { usePlayerStore } = await import('../stores/playerStore');
      await usePlayerStore.getState().skipForward(this.config.skipForwardSeconds);
    });

    // Skip backward
    this.registerHandler('skipBackward', async () => {
      const { usePlayerStore } = await import('../stores/playerStore');
      await usePlayerStore.getState().skipBackward(this.config.skipBackwardSeconds);
    });

    // Next track (chapter)
    this.registerHandler('nextTrack', async () => {
      const { usePlayerStore } = await import('../stores/playerStore');
      const store = usePlayerStore.getState();

      if (this.config.trackNavigationMode === 'chapter') {
        await store.nextChapter();
      } else {
        await store.skipForward(this.config.skipForwardSeconds);
      }
    });

    // Previous track (chapter)
    this.registerHandler('previousTrack', async () => {
      const { usePlayerStore } = await import('../stores/playerStore');
      const store = usePlayerStore.getState();

      if (this.config.trackNavigationMode === 'chapter') {
        await store.prevChapter();
      } else {
        await store.skipBackward(this.config.skipBackwardSeconds);
      }
    });

    // Seek to position
    this.registerHandler('seekTo', async (data) => {
      if (data?.position === undefined) return;
      const { usePlayerStore } = await import('../stores/playerStore');
      await usePlayerStore.getState().seekTo(data.position);
    });

    // Set playback speed
    this.registerHandler('setSpeed', async (data) => {
      if (data?.speed === undefined) return;
      const { usePlayerStore } = await import('../stores/playerStore');
      await usePlayerStore.getState().setPlaybackRate(data.speed);
    });
  }

  /**
   * Cycle through playback speeds
   * Useful for single-button speed toggle
   */
  async cycleSpeed(): Promise<number> {
    const { usePlayerStore } = await import('../stores/playerStore');
    const store = usePlayerStore.getState();
    const currentSpeed = store.playbackRate;

    // Find current speed index
    const currentIndex = this.config.availableSpeeds.findIndex(
      (s) => Math.abs(s - currentSpeed) < 0.01
    );

    // Get next speed (wrap around)
    const nextIndex = (currentIndex + 1) % this.config.availableSpeeds.length;
    const nextSpeed = this.config.availableSpeeds[nextIndex];

    await store.setPlaybackRate(nextSpeed);
    return nextSpeed;
  }
}

// Export singleton
export const remoteCommandService = new RemoteCommandService();
