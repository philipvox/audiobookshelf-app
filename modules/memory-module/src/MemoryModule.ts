import { requireNativeModule } from 'expo-modules-core';

// Types
export interface MemoryInfo {
  /** Memory used by the app in megabytes */
  usedMb: number;
  /** Total device memory in megabytes */
  totalMb: number;
  /** Percentage of total memory used by app */
  usedPercent: number;
  /** Platform identifier */
  platform: 'ios' | 'android';
  // iOS only
  /** Virtual memory size (iOS only) */
  virtualMb?: number;
  // Android only
  /** Available memory (Android only) */
  availableMb?: number;
  /** Whether device is in low memory state (Android only) */
  lowMemory?: boolean;
  /** Low memory threshold in MB (Android only) */
  threshold?: number;
}

interface MemoryModuleInterface {
  getMemoryInfo(): Promise<MemoryInfo>;
  getMemoryUsageMb(): number;
}

// Load the native module
const NativeMemoryModule = requireNativeModule<MemoryModuleInterface>('MemoryModule');

/**
 * Get detailed memory information from native APIs.
 * This provides accurate memory data unlike JS-based approaches.
 *
 * @returns Promise<MemoryInfo> Memory usage details
 *
 * @example
 * ```ts
 * const info = await getMemoryInfo();
 * console.log(`Using ${info.usedMb.toFixed(1)}MB (${info.usedPercent.toFixed(1)}%)`);
 * ```
 */
export async function getMemoryInfo(): Promise<MemoryInfo> {
  try {
    return await NativeMemoryModule.getMemoryInfo();
  } catch (error) {
    console.warn('[MemoryModule] Failed to get memory info:', error);
    // Return fallback values
    return {
      usedMb: -1,
      totalMb: -1,
      usedPercent: -1,
      platform: 'ios', // Will be overwritten if native call succeeds
    };
  }
}

/**
 * Get current memory usage in MB (synchronous).
 * Faster than getMemoryInfo() but provides less detail.
 *
 * @returns Memory usage in MB, or -1 if unavailable
 *
 * @example
 * ```ts
 * const usageMb = getMemoryUsageMb();
 * if (usageMb > 500) {
 *   console.warn('High memory usage:', usageMb);
 * }
 * ```
 */
export function getMemoryUsageMb(): number {
  try {
    return NativeMemoryModule.getMemoryUsageMb();
  } catch (error) {
    console.warn('[MemoryModule] Failed to get memory usage:', error);
    return -1;
  }
}

export default {
  getMemoryInfo,
  getMemoryUsageMb,
};
