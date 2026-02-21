/**
 * src/features/automotive/androidAutoBridge.ts
 *
 * Bridge for Android Auto MediaSession integration.
 *
 * SIMPLIFIED: Only playback controls and metadata - no browsing.
 * Provides play/pause, seek, skip, and now-playing info.
 */

import { Platform, NativeModules } from 'react-native';
import { audioLog } from '@/shared/utils/audioDebug';

const log = (...args: any[]) => audioLog.audio('[AndroidAutoBridge]', ...args);

const { AndroidAutoModule } = NativeModules;

/**
 * Update playback state in native MediaSession
 */
export function updatePlaybackState(
  isPlaying: boolean,
  position: number,
  speed: number
): void {
  if (Platform.OS !== 'android') return;

  try {
    AndroidAutoModule?.updatePlaybackState?.(isPlaying, position, speed);
  } catch (error) {
    log('Failed to update playback state:', error);
  }
}

/**
 * Update metadata in native MediaSession (title, author, cover art)
 */
export function updateMetadata(
  title: string,
  author: string,
  duration: number,
  artworkUrl?: string | null
): void {
  if (Platform.OS !== 'android') return;

  try {
    AndroidAutoModule?.updateMetadata?.(title, author, duration, artworkUrl || null);
  } catch (error) {
    log('Failed to update metadata:', error);
  }
}

/**
 * Write browse data JSON to file for native MediaBrowserService to read.
 * The native module writes the file and notifies the service to reload.
 */
export async function writeBrowseData(jsonData: string): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    if (AndroidAutoModule?.writeBrowseData) {
      return await AndroidAutoModule.writeBrowseData(jsonData);
    }
    return false;
  } catch (error) {
    log('Failed to write browse data:', error);
    return false;
  }
}

/**
 * Check if Android Auto service is active
 */
export async function isAndroidAutoConnected(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    if (AndroidAutoModule?.isConnected) {
      return await AndroidAutoModule.isConnected();
    }
    return false;
  } catch (error) {
    log('Failed to check Android Auto connection:', error);
    return false;
  }
}
