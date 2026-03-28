/**
 * src/features/player/services/audioService.ts
 *
 * Base module for TypeScript and Jest resolution.
 * At runtime, Metro picks the platform-specific file:
 *   - audioService.android.ts (ExoPlayer)
 *   - audioService.ios.ts (AVPlayer)
 *
 * This file exists so that:
 *   1. `tsc --noEmit` can resolve imports of './audioService'
 *   2. Jest (which doesn't use Metro platform resolution) can resolve the module
 *   3. Type re-exports remain available for consumers
 */

import { Platform } from 'react-native';

// Re-export shared types so consumers can import from this file
export type { PlaybackState, AudioTrackInfo, AudioErrorType, AudioError } from './audioServiceTypes';
export type { StatusCallback, ErrorCallback, RemoteCommandCallback } from './audioServiceTypes';

// Platform-specific implementations are in:
//   - audioService.android.ts (ExoPlayer native module)
//   - audioService.ios.ts (AVPlayer native module)
//
// This stub satisfies the type checker. Metro overrides it at build time.
// If this code ever runs, it means platform resolution failed.

const STUB_ERROR = `audioService: platform-specific implementation not loaded (Platform.OS=${Platform.OS})`;

export const audioService = {
  setup: () => { throw new Error(STUB_ERROR); },
  loadAudio: () => { throw new Error(STUB_ERROR); },
  playAudio: () => { throw new Error(STUB_ERROR); },
  pauseAudio: () => { throw new Error(STUB_ERROR); },
  seekTo: () => { throw new Error(STUB_ERROR); },
  setRate: () => { throw new Error(STUB_ERROR); },
  setVolume: () => { throw new Error(STUB_ERROR); },
  unloadAudio: () => { throw new Error(STUB_ERROR); },
  onPlaybackStatus: () => { throw new Error(STUB_ERROR); },
  onError: () => { throw new Error(STUB_ERROR); },
  onRemoteCommand: () => { throw new Error(STUB_ERROR); },
  getPosition: () => { throw new Error(STUB_ERROR); },
  isSetup: () => false,
  getPlayer: () => null,
  setAudioSamplingEnabled: () => {},
  addAudioSampleListener: () => null,
  cleanup: () => Promise.reject(new Error(STUB_ERROR)),
} as any;
