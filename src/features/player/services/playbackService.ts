/**
 * src/features/player/services/playbackService.ts
 *
 * Playback service for expo-audio
 * Note: expo-audio handles lock screen controls automatically when
 * setActiveForLockScreen(true) is called on the player.
 * This file is kept for compatibility but the functionality is now
 * handled directly in audioService.ts.
 */

/**
 * PlaybackService - legacy placeholder
 * With expo-audio, remote control events are handled automatically.
 * The audioService.ts now manages lock screen metadata via
 * player.updateLockScreenMetadata() and player.setActiveForLockScreen(true).
 */
export async function PlaybackService(): Promise<void> {
  // No-op for expo-audio - lock screen controls are automatic
  // This function is kept for compatibility with existing imports
}
