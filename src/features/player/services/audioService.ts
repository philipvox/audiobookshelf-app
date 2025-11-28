/**
 * src/features/player/services/audioService.ts
 * 
 * Audio playback service using expo-audio.
 * Works on both iOS and Android.
 */

import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

export interface PlaybackState {
  isPlaying: boolean;
  position: number;
  duration: number;
  isBuffering: boolean;
}

type StatusCallback = (state: PlaybackState) => void;

class AudioService {
  private player: AudioPlayer | null = null;
  private statusCallback: StatusCallback | null = null;
  private isLoaded: boolean = false;
  private currentUrl: string | null = null;
  private statusSubscription: { remove: () => void } | null = null;
  private pendingPlaybackRate: number = 1.0;
  private loadPromiseResolve: (() => void) | null = null;

  constructor() {
    // Configure audio mode for playback
    this.configureAudioMode();
  }

  private async configureAudioMode(): Promise<void> {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
        interruptionModeAndroid: 'doNotMix',
      });
      console.log('[AudioService] Audio mode configured');
    } catch (error) {
      console.error('[AudioService] Failed to configure audio mode:', error);
    }
  }

  /**
   * Load audio from URL or local file path
   */
  async loadAudio(url: string, startPosition: number = 0): Promise<void> {
    console.log('[AudioService] Loading audio:', url.substring(0, 100) + '...');
    console.log('[AudioService] Start position:', startPosition);

    try {
      // Unload any existing audio first
      await this.unloadAudio();

      // Create audio source object
      const source = { uri: url };

      // Create load promise that will be resolved by status callback
      const loadPromise = new Promise<void>((resolve, reject) => {
        this.loadPromiseResolve = resolve;
        
        // Timeout after 30 seconds
        setTimeout(() => {
          if (!this.isLoaded) {
            this.loadPromiseResolve = null;
            reject(new Error('Audio load timeout after 30s'));
          }
        }, 30000);
      });

      // Create new player with the source and options
      console.log('[AudioService] Creating player...');
      this.player = createAudioPlayer(source, {
        updateInterval: 500,
      });
      this.currentUrl = url;

      // Set up status listener BEFORE waiting
      this.statusSubscription = this.player.addListener('playbackStatusUpdate', (status) => {
        // Check if audio is now loaded
        if (status.isLoaded && !this.isLoaded) {
          console.log('[AudioService] Audio loaded via status update, duration:', status.duration);
          this.isLoaded = true;
          
          // Resolve the load promise
          if (this.loadPromiseResolve) {
            this.loadPromiseResolve();
            this.loadPromiseResolve = null;
          }
          
          // Seek to start position after load (with small delay for Android)
          if (startPosition > 0 && this.player) {
            setTimeout(() => {
              if (this.player) {
                console.log('[AudioService] Seeking to start position:', startPosition);
                this.player.seekTo(startPosition);
              }
            }, 100);
          }
          
          // Apply pending playback rate
          if (this.pendingPlaybackRate !== 1.0 && this.player) {
            setTimeout(() => {
              if (this.player) {
                this.player.setPlaybackRate(this.pendingPlaybackRate);
              }
            }, 150);
          }
        }
        
        // Notify callback if loaded
        if (this.statusCallback && this.isLoaded) {
          this.statusCallback({
            isPlaying: status.playing,
            position: status.currentTime,
            duration: status.duration,
            isBuffering: status.isBuffering,
          });
        }
      });

      // Wait for load to complete
      await loadPromise;

      console.log('[AudioService] Audio ready');

    } catch (error) {
      console.error('[AudioService] Failed to load audio:', error);
      this.isLoaded = false;
      this.loadPromiseResolve = null;
      throw error;
    }
  }

  /**
   * Set callback for status updates
   */
  setStatusUpdateCallback(callback: StatusCallback): void {
    this.statusCallback = callback;
  }

  /**
   * Play audio
   */
  async play(): Promise<void> {
    if (!this.player) {
      throw new Error('No audio player');
    }

    // Wait for loaded if not yet
    if (!this.isLoaded) {
      console.log('[AudioService] Waiting for audio to load before playing...');
      let attempts = 0;
      while (!this.isLoaded && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (!this.isLoaded) {
        throw new Error('Audio not loaded after waiting');
      }
    }

    console.log('[AudioService] Playing...');
    try {
      this.player.play();
    } catch (e) {
      console.error('[AudioService] Play error:', e);
      throw e;
    }
  }

  /**
   * Pause audio
   */
  async pause(): Promise<void> {
    if (!this.player) {
      console.log('[AudioService] No player to pause');
      return;
    }

    console.log('[AudioService] Pausing...');
    try {
      this.player.pause();
    } catch (e) {
      console.error('[AudioService] Pause error:', e);
    }
  }

  /**
   * Seek to position in seconds
   */
  async seekTo(position: number): Promise<void> {
    if (!this.player) {
      console.log('[AudioService] No player to seek');
      return;
    }

    console.log('[AudioService] Seeking to:', position);
    try {
      this.player.seekTo(position);
    } catch (e) {
      console.error('[AudioService] Seek error:', e);
    }
  }

  /**
   * Set playback rate
   */
  async setPlaybackRate(rate: number): Promise<void> {
    this.pendingPlaybackRate = rate;
    
    if (!this.player) {
      console.log('[AudioService] No player, storing rate for later:', rate);
      return;
    }

    console.log('[AudioService] Setting playback rate:', rate);
    try {
      this.player.setPlaybackRate(rate);
    } catch (e) {
      console.error('[AudioService] Set playback rate error:', e);
    }
  }

  /**
   * Get current position
   */
  getCurrentPosition(): number {
    return this.player?.currentTime ?? 0;
  }

  /**
   * Get duration
   */
  getDuration(): number {
    return this.player?.duration ?? 0;
  }

  /**
   * Check if audio is loaded
   */
  getIsLoaded(): boolean {
    // Must have both isLoaded flag AND a valid player
    return this.isLoaded && this.player !== null;
  }

  /**
   * Check if audio is playing
   */
  getIsPlaying(): boolean {
    return this.player?.playing ?? false;
  }

  /**
   * Unload audio and clean up
   */
  async unloadAudio(): Promise<void> {
    console.log('[AudioService] Unloading audio...');

    // Clear load promise
    this.loadPromiseResolve = null;

    // Remove status subscription
    if (this.statusSubscription) {
      try {
        this.statusSubscription.remove();
      } catch (e) {
        console.log('[AudioService] Error removing subscription:', e);
      }
      this.statusSubscription = null;
    }

    // Release the player
    if (this.player) {
      try {
        this.player.pause();
      } catch (e) {
        // Ignore pause errors
      }
      try {
        this.player.release();
      } catch (e) {
        console.log('[AudioService] Error releasing player:', e);
      }
      this.player = null;
    }

    this.isLoaded = false;
    this.currentUrl = null;
  }
}

// Export singleton instance
export const audioService = new AudioService();