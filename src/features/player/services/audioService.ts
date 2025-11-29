/**
 * src/features/player/services/audioService.ts
 * 
 * Streamlined audio service with comprehensive logging
 * Uses expo-audio for playback
 */

import { Platform } from 'react-native';
import { 
  AudioPlayer, 
  createAudioPlayer, 
  setAudioModeAsync,
} from 'expo-audio';

export interface PlaybackState {
  isPlaying: boolean;
  position: number;
  duration: number;
  isBuffering: boolean;
}

type StatusCallback = (status: PlaybackState) => void;

// Simple logger - set to false for production
const DEBUG = true;
const log = (msg: string, ...args: any[]) => {
  if (DEBUG) console.log(`[Audio] ${msg}`, ...args);
};
const logError = (msg: string, ...args: any[]) => {
  console.error(`[Audio] ❌ ${msg}`, ...args);
};

class AudioService {
  private player: AudioPlayer | null = null;
  private statusCallback: StatusCallback | null = null;
  private subscription: { remove: () => void } | null = null;
  private loadId = 0;
  private currentUrl: string | null = null;
  private pendingRate = 1.0;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
        interruptionModeAndroid: 'doNotMix',
      });
      log('Audio mode configured');
    } catch (e) {
      logError('Failed to configure audio mode:', e);
    }
  }

  getPlayer(): AudioPlayer | null {
    return this.player;
  }

  getPlayerId(): number {
    return this.loadId;
  }

  getIsLoaded(): boolean {
    return this.player !== null;
  }

  getCurrentUrl(): string | null {
    return this.currentUrl;
  }

  setStatusUpdateCallback(callback: StatusCallback): void {
    this.statusCallback = callback;
  }

  async loadAudio(url: string, startPosition: number = 0): Promise<void> {
    const thisLoadId = ++this.loadId;
    const shortUrl = url.length > 60 ? url.substring(0, 60) + '...' : url;
    
    log(`[${thisLoadId}] Loading: ${shortUrl}`);
    log(`[${thisLoadId}] Start position: ${startPosition}s`);

    // Cleanup previous
    await this.release();

    // Cancelled?
    if (thisLoadId !== this.loadId) {
      log(`[${thisLoadId}] Cancelled - newer load started`);
      return;
    }

    try {
      // Create player
      const startTime = Date.now();
      this.player = createAudioPlayer({ uri: url });
      this.currentUrl = url;

      // Wait for loaded state
      let resolved = false;
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Load timeout after 30s`));
        }, 30000);

        this.subscription = this.player!.addListener('playbackStatusUpdate', (status) => {
          // Cancelled?
          if (thisLoadId !== this.loadId) {
            clearTimeout(timeout);
            return;
          }

          // Only handle initial load once
          if (status.isLoaded && !resolved) {
            resolved = true;
            clearTimeout(timeout);
            const elapsed = Date.now() - startTime;
            log(`[${thisLoadId}] ✓ Loaded in ${elapsed}ms, duration: ${status.duration?.toFixed(1)}s`);

            // Seek if needed
            if (startPosition > 0) {
              log(`[${thisLoadId}] Seeking to ${startPosition}s`);
              this.player?.seekTo(startPosition);
            }

            // Apply pending playback rate
            if (this.pendingRate !== 1.0) {
              this.applyRate(this.pendingRate);
            }

            resolve();
          }

          // Forward status updates (after load)
          if (resolved && this.statusCallback && thisLoadId === this.loadId) {
            this.statusCallback({
              isPlaying: status.playing,
              position: status.currentTime,
              duration: status.duration,
              isBuffering: status.isBuffering,
            });
          }
        });
      });

    } catch (e: any) {
      logError(`[${thisLoadId}] Load failed:`, e.message);
      if (thisLoadId === this.loadId) {
        await this.release();
      }
      throw e;
    }
  }

  private applyRate(rate: number) {
    if (!this.player) return;
    try {
      if (Platform.OS === 'android') {
        (this.player as any).shouldCorrectPitch = true;
      }
      this.player.setPlaybackRate(rate, Platform.OS === 'ios' ? 'high' : undefined);
      log(`Rate set to ${rate}x`);
    } catch (e) {
      logError('Failed to set rate:', e);
    }
  }

  async play(): Promise<void> {
    if (!this.player) {
      throw new Error('No audio loaded');
    }
    log('▶ Play');
    this.player.play();
  }

  async pause(): Promise<void> {
    if (!this.player) return;
    log('⏸ Pause');
    this.player.pause();
  }

  async seekTo(position: number): Promise<void> {
    if (!this.player) return;
    log(`⏩ Seek to ${position.toFixed(1)}s`);
    this.player.seekTo(position);
  }

  async setPlaybackRate(rate: number): Promise<void> {
    this.pendingRate = rate;
    if (this.player) {
      this.applyRate(rate);
    }
  }

  async getPosition(): Promise<number> {
    return this.player?.currentTime ?? 0;
  }

  async getDuration(): Promise<number> {
    return this.player?.duration ?? 0;
  }

  private async release(): Promise<void> {
    if (this.subscription) {
      try { this.subscription.remove(); } catch {}
      this.subscription = null;
    }

    if (this.player) {
      const p = this.player;
      this.player = null;
      this.currentUrl = null;

      try { p.pause(); } catch {}
      
      // Brief delay for callbacks to clear
      await new Promise(r => setTimeout(r, 30));
      
      try { p.release(); } catch {}
      log('Released previous player');
    }
  }

  async unloadAudio(): Promise<void> {
    this.loadId++;
    await this.release();
  }
}

export const audioService = new AudioService();