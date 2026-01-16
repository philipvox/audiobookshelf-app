/**
 * src/features/home/utils/spine/featureFlags.ts
 *
 * Feature flags for spine system rollout.
 * Allows instant rollback to old system if issues arise.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// FEATURE FLAG CONFIGURATION
// =============================================================================

/**
 * Master feature flag for new spine system.
 * Set to false to instantly rollback to old system.
 *
 * RE-ENABLED (2026-01-13):
 * - Composition profiles ported from old system ✅
 * - generateSpineComposition() now uses new composition/generator.ts ✅
 * - All genre profiles have titleOrientations, authorOrientations arrays ✅
 * - Vertical title rotation should now work correctly ✅
 */
let USE_NEW_SPINE_SYSTEM = true;

/**
 * Individual feature flags for granular control.
 */
const SPINE_FEATURE_FLAGS = {
  /** Use new dimension calculations */
  newDimensions: true,
  /** Use new genre matching */
  newGenreMatching: true,
  /** Use new typography system */
  newTypography: true,
  /** Use lazy color extraction */
  lazyColors: true,
  /** Use new scaling system */
  newScaling: true,
};

// =============================================================================
// FLAG MANAGEMENT
// =============================================================================

/**
 * Check if new spine system is enabled.
 */
export function useNewSpineSystem(): boolean {
  return USE_NEW_SPINE_SYSTEM;
}

/**
 * Check specific feature flag.
 */
export function isSpineFeatureEnabled(feature: keyof typeof SPINE_FEATURE_FLAGS): boolean {
  if (!USE_NEW_SPINE_SYSTEM) return false;
  return SPINE_FEATURE_FLAGS[feature];
}

/**
 * Disable new spine system (emergency rollback).
 * Call this from dev tools or error boundary.
 */
export function disableNewSpineSystem(): void {
  console.warn('[SpineSystem] Rolling back to old system');
  USE_NEW_SPINE_SYSTEM = false;
  AsyncStorage.setItem('spine:useNewSystem', 'false');
}

/**
 * Re-enable new spine system.
 */
export function enableNewSpineSystem(): void {
  console.log('[SpineSystem] Enabling new system');
  USE_NEW_SPINE_SYSTEM = true;
  AsyncStorage.setItem('spine:useNewSystem', 'true');
}

/**
 * Disable specific feature.
 */
export function disableSpineFeature(feature: keyof typeof SPINE_FEATURE_FLAGS): void {
  console.warn(`[SpineSystem] Disabling feature: ${feature}`);
  SPINE_FEATURE_FLAGS[feature] = false;
}

/**
 * Load flag state from storage on app startup.
 */
export async function loadSpineFeatureFlags(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem('spine:useNewSystem');
    if (stored !== null) {
      USE_NEW_SPINE_SYSTEM = stored === 'true';
      console.log('[SpineSystem] Loaded flag:', USE_NEW_SPINE_SYSTEM ? 'NEW' : 'OLD');
    }
  } catch (error) {
    console.error('[SpineSystem] Failed to load flags:', error);
  }
}

/**
 * Get all feature flag states (for debugging).
 */
export function getSpineFeatureFlags() {
  return {
    masterEnabled: USE_NEW_SPINE_SYSTEM,
    features: { ...SPINE_FEATURE_FLAGS },
  };
}

// =============================================================================
// DEVELOPMENT HELPERS
// =============================================================================

if (__DEV__) {
  // Expose to global for easy testing in dev tools
  (global as any).__spineSystem = {
    enable: enableNewSpineSystem,
    disable: disableNewSpineSystem,
    getFlags: getSpineFeatureFlags,
    disableFeature: disableSpineFeature,
  };

  console.log('[SpineSystem] Dev helpers available:');
  console.log('  __spineSystem.enable()  - Enable new system');
  console.log('  __spineSystem.disable() - Rollback to old system');
  console.log('  __spineSystem.getFlags() - Check current flags');
}
