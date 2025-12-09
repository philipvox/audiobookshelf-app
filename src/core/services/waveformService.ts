/**
 * src/core/services/waveformService.ts
 *
 * Service for pre-computing and storing audio waveforms.
 * Uses react-native-audio-analyzer to extract amplitude data from downloaded audio files.
 *
 * Note: The react-native-audio-analyzer library requires NitroModules which needs a native build.
 * This service gracefully handles the case where the native module is not available.
 */

import * as FileSystem from 'expo-file-system/legacy';

// Lazy import to avoid crashing if native module isn't available
let computeAmplitude: ((filePath: string, sampleCount: number) => number[]) | null = null;
let isNativeModuleAvailable = false;

// Try to load the native module
try {
  const audioAnalyzer = require('react-native-audio-analyzer');
  computeAmplitude = audioAnalyzer.computeAmplitude;
  isNativeModuleAvailable = true;
} catch (e) {
  console.log('[WaveformService] Native audio analyzer not available - waveform extraction disabled');
  console.log('[WaveformService] To enable: run expo prebuild && pod install');
}

// =============================================================================
// LOGGING
// =============================================================================

const LOG_PREFIX = '[WaveformService]';

function log(...args: any[]) {
  console.log(LOG_PREFIX, ...args);
}

function logError(...args: any[]) {
  console.error(LOG_PREFIX, '[ERROR]', ...args);
}

// =============================================================================
// TYPES
// =============================================================================

export interface WaveformData {
  itemId: string;
  totalSamples: number;
  duration: number; // Total duration in seconds
  samples: number[]; // Normalized amplitude values (0-1)
  chapters?: ChapterWaveform[];
  createdAt: number;
}

export interface ChapterWaveform {
  title: string;
  startTime: number;
  endTime: number;
  startSample: number;
  endSample: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const WAVEFORM_CONFIG = {
  // Total samples to extract per book (scales with duration)
  SAMPLES_PER_MINUTE: 100, // ~1.6 samples per second
  MIN_SAMPLES: 500,
  MAX_SAMPLES: 10000,

  // Storage
  WAVEFORM_DIR: `${FileSystem.documentDirectory}waveforms/`,
  FILE_EXTENSION: '.waveform.json',
};

// =============================================================================
// WAVEFORM SERVICE
// =============================================================================

class WaveformService {
  private cache: Map<string, WaveformData> = new Map();
  private isInitialized = false;

  /**
   * Initialize the waveform service
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    log('Initializing waveform service...');

    // Ensure waveform directory exists
    const dirInfo = await FileSystem.getInfoAsync(WAVEFORM_CONFIG.WAVEFORM_DIR);
    if (!dirInfo.exists) {
      log('Creating waveform directory...');
      await FileSystem.makeDirectoryAsync(WAVEFORM_CONFIG.WAVEFORM_DIR, { intermediates: true });
    }

    this.isInitialized = true;
    log('Waveform service initialized');
  }

  /**
   * Calculate optimal sample count based on duration
   */
  private calculateSampleCount(durationMinutes: number): number {
    const samples = Math.round(durationMinutes * WAVEFORM_CONFIG.SAMPLES_PER_MINUTE);
    return Math.max(
      WAVEFORM_CONFIG.MIN_SAMPLES,
      Math.min(WAVEFORM_CONFIG.MAX_SAMPLES, samples)
    );
  }

  /**
   * Get the storage path for a waveform
   */
  private getWaveformPath(itemId: string): string {
    return `${WAVEFORM_CONFIG.WAVEFORM_DIR}${itemId}${WAVEFORM_CONFIG.FILE_EXTENSION}`;
  }

  /**
   * Check if waveform exists for an item
   */
  async hasWaveform(itemId: string): Promise<boolean> {
    // Check cache first
    if (this.cache.has(itemId)) return true;

    // Check file system
    const path = this.getWaveformPath(itemId);
    const info = await FileSystem.getInfoAsync(path);
    return info.exists;
  }

  /**
   * Get waveform data for an item
   */
  async getWaveform(itemId: string): Promise<WaveformData | null> {
    // Check cache first
    const cached = this.cache.get(itemId);
    if (cached) return cached;

    // Load from file
    try {
      const path = this.getWaveformPath(itemId);
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) return null;

      const content = await FileSystem.readAsStringAsync(path);
      const data = JSON.parse(content) as WaveformData;

      // Cache it
      this.cache.set(itemId, data);
      return data;
    } catch (err) {
      logError(`Failed to load waveform for ${itemId}:`, err);
      return null;
    }
  }

  /**
   * Get waveform samples for a specific time range (e.g., a chapter)
   */
  async getWaveformRange(
    itemId: string,
    startTime: number,
    endTime: number,
    sampleCount: number
  ): Promise<number[] | null> {
    const waveform = await this.getWaveform(itemId);
    if (!waveform) return null;

    const { samples, duration } = waveform;
    const totalSamples = samples.length;

    // Calculate sample indices for the time range
    const startIdx = Math.floor((startTime / duration) * totalSamples);
    const endIdx = Math.ceil((endTime / duration) * totalSamples);

    // Extract the range
    const rangeData = samples.slice(startIdx, endIdx);

    // Resample to desired count
    if (rangeData.length === sampleCount) {
      return rangeData;
    }

    // Resample using linear interpolation
    const result: number[] = [];
    for (let i = 0; i < sampleCount; i++) {
      const srcIndex = (i / sampleCount) * rangeData.length;
      const lowIdx = Math.floor(srcIndex);
      const highIdx = Math.min(lowIdx + 1, rangeData.length - 1);
      const frac = srcIndex - lowIdx;
      result.push(rangeData[lowIdx] * (1 - frac) + rangeData[highIdx] * frac);
    }

    return result;
  }

  /**
   * Check if waveform extraction is available (native module present)
   */
  isExtractionAvailable(): boolean {
    return isNativeModuleAvailable && computeAmplitude !== null;
  }

  /**
   * Extract and store waveform from downloaded audio files
   */
  async extractWaveform(
    itemId: string,
    audioFilePaths: string[],
    durationSeconds: number,
    chapters?: Array<{ title: string; start: number; end?: number }>
  ): Promise<WaveformData | null> {
    // Check if native module is available
    if (!isNativeModuleAvailable || !computeAmplitude) {
      log(`Skipping waveform extraction - native module not available`);
      log(`To enable: run 'npx expo prebuild' and rebuild the app`);
      return null;
    }

    await this.init();

    log(`Extracting waveform for ${itemId}...`);
    log(`Audio files: ${audioFilePaths.length}, Duration: ${(durationSeconds / 60).toFixed(1)} min`);

    try {
      const durationMinutes = durationSeconds / 60;
      const targetSamples = this.calculateSampleCount(durationMinutes);
      const samplesPerFile = Math.ceil(targetSamples / audioFilePaths.length);

      log(`Target samples: ${targetSamples}, per file: ${samplesPerFile}`);

      // Extract amplitude from each file
      const allSamples: number[] = [];
      const fileDurations: number[] = [];

      for (let i = 0; i < audioFilePaths.length; i++) {
        const filePath = audioFilePaths[i];
        log(`Processing file ${i + 1}/${audioFilePaths.length}: ${filePath}`);

        try {
          // Verify file exists
          const info = await FileSystem.getInfoAsync(filePath);
          if (!info.exists) {
            logError(`File not found: ${filePath}`);
            continue;
          }

          // Extract amplitude data
          const amplitudes = computeAmplitude!(filePath, samplesPerFile);

          // Normalize to 0-1 range
          const maxAmplitude = Math.max(...amplitudes, 0.001);
          const normalized = amplitudes.map(a => Math.min(1, a / maxAmplitude));

          allSamples.push(...normalized);

          // Estimate file duration based on proportion
          const fileDuration = (durationSeconds / audioFilePaths.length);
          fileDurations.push(fileDuration);

          log(`File ${i + 1}: ${amplitudes.length} samples extracted`);
        } catch (fileErr) {
          logError(`Failed to process file ${filePath}:`, fileErr);
          // Fill with zeros if extraction fails
          allSamples.push(...new Array(samplesPerFile).fill(0));
        }
      }

      // Create chapter mappings if provided
      const chapterWaveforms: ChapterWaveform[] | undefined = chapters?.map(chapter => {
        const endTime = chapter.end ?? durationSeconds;
        const startSample = Math.floor((chapter.start / durationSeconds) * allSamples.length);
        const endSample = Math.ceil((endTime / durationSeconds) * allSamples.length);

        return {
          title: chapter.title,
          startTime: chapter.start,
          endTime,
          startSample,
          endSample,
        };
      });

      // Create waveform data
      const waveformData: WaveformData = {
        itemId,
        totalSamples: allSamples.length,
        duration: durationSeconds,
        samples: allSamples,
        chapters: chapterWaveforms,
        createdAt: Date.now(),
      };

      // Save to file
      const path = this.getWaveformPath(itemId);
      await FileSystem.writeAsStringAsync(path, JSON.stringify(waveformData));

      // Cache it
      this.cache.set(itemId, waveformData);

      log(`Waveform saved: ${allSamples.length} samples, ${(JSON.stringify(waveformData).length / 1024).toFixed(1)} KB`);

      return waveformData;
    } catch (err) {
      logError(`Failed to extract waveform for ${itemId}:`, err);
      return null;
    }
  }

  /**
   * Delete waveform data for an item
   */
  async deleteWaveform(itemId: string): Promise<void> {
    // Remove from cache
    this.cache.delete(itemId);

    // Delete file
    try {
      const path = this.getWaveformPath(itemId);
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        await FileSystem.deleteAsync(path);
        log(`Deleted waveform for ${itemId}`);
      }
    } catch (err) {
      logError(`Failed to delete waveform for ${itemId}:`, err);
    }
  }

  /**
   * Clear all cached waveforms
   */
  clearCache(): void {
    this.cache.clear();
    log('Waveform cache cleared');
  }

  /**
   * Get total storage used by waveforms
   */
  async getTotalStorageSize(): Promise<number> {
    try {
      const files = await FileSystem.readDirectoryAsync(WAVEFORM_CONFIG.WAVEFORM_DIR);
      let totalSize = 0;

      for (const file of files) {
        if (file.endsWith(WAVEFORM_CONFIG.FILE_EXTENSION)) {
          const info = await FileSystem.getInfoAsync(
            `${WAVEFORM_CONFIG.WAVEFORM_DIR}${file}`
          );
          if (info.exists && 'size' in info) {
            totalSize += info.size || 0;
          }
        }
      }

      return totalSize;
    } catch (err) {
      logError('Failed to calculate storage size:', err);
      return 0;
    }
  }
}

// Singleton instance
export const waveformService = new WaveformService();
