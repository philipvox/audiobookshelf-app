/**
 * src/features/player/services/audioService.ts
 * 
 * Audio playback service using expo-audio
 * Exposes player instance for waveform visualization
 */

import { 
  AudioPlayer, 
  createAudioPlayer, 
  setAudioModeAsync,
} from 'expo-audio';

interface PlaybackStatus {
  isPlaying: boolean;
  position: number;
  duration: number;
  isBuffering: boolean;
}

type StatusCallback = (status: PlaybackStatus) => void;

class AudioService {
  private player: AudioPlayer | null = null;
  private statusCallback: StatusCallback | null = null;
  private statusSubscription: { remove: () => void } | null = null;
  private isLoaded = false;
  private currentUrl: string | null = null;
  private pendingPlaybackRate = 1.0;

  constructor() {
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
    } catch (error) {
      console.error('[AudioService] Failed to configure audio mode:', error);
    }
  }

  /**
   * Get the player instance for waveform visualization
   */
  getPlayer(): AudioPlayer | null {
    return this.player;
  }

  /**
   * Load audio from URL or local file path
   */
  async loadAudio(url: string, startPosition: number = 0): Promise<void> {
    console.log('[AudioService] Loading:', url.substring(0, 80) + '...');

    try {
      await this.unloadAudio();

      // Create player with source
      this.player = createAudioPlayer({ uri: url });
      this.currentUrl = url;

      // Wait for load via status
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Load timeout')), 30000);
        
        this.statusSubscription = this.player!.addListener('playbackStatusUpdate', (status) => {
          if (status.isLoaded && !this.isLoaded) {
            this.isLoaded = true;
            clearTimeout(timeout);
            
            // Seek to start position
            if (startPosition > 0) {
              this.player?.seekTo(startPosition);
            }
            
            // Apply pending rate
            if (this.pendingPlaybackRate !== 1.0) {
              this.player?.setPlaybackRate(this.pendingPlaybackRate);
            }
            
            resolve();
          }
          
          // Forward status updates
          if (this.isLoaded && this.statusCallback) {
            this.statusCallback({
              isPlaying: status.playing,
              position: status.currentTime,
              duration: status.duration,
              isBuffering: status.isBuffering,
            });
          }
        });
      });

      console.log('[AudioService] Loaded, duration:', this.player?.duration);
    } catch (error) {
      console.error('[AudioService] Load failed:', error);
      this.isLoaded = false;
      throw error;
    }
  }

  setStatusUpdateCallback(callback: StatusCallback): void {
    this.statusCallback = callback;
  }

  async play(): Promise<void> {
    if (!this.player || !this.isLoaded) {
      throw new Error('No audio loaded');
    }
    this.player.play();
  }

  async pause(): Promise<void> {
    this.player?.pause();
  }

  async seekTo(positionSeconds: number): Promise<void> {
    this.player?.seekTo(positionSeconds);
  }

  async setPlaybackRate(rate: number): Promise<void> {
    this.pendingPlaybackRate = rate;
    if (this.player && this.isLoaded) {
      this.player.setPlaybackRate(rate);
    }
  }

  async getPosition(): Promise<number> {
    return this.player?.currentTime ?? 0;
  }

  async getDuration(): Promise<number> {
    return this.player?.duration ?? 0;
  }

  getIsLoaded(): boolean {
    return this.isLoaded && this.player !== null;
  }

  getCurrentUrl(): string | null {
    return this.currentUrl;
  }

  async unloadAudio(): Promise<void> {
    if (this.statusSubscription) {
      this.statusSubscription.remove();
      this.statusSubscription = null;
    }
    if (this.player) {
      try {
        this.player.pause();
        this.player.release();
      } catch {}
      this.player = null;
    }
    this.isLoaded = false;
    this.currentUrl = null;
  }
}

export const audioService = new AudioService();
