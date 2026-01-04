/**
 * src/core/lifecycle/appStateListener.ts
 *
 * App state listener for foreground/background transitions.
 * Handles:
 * - Emitting app lifecycle events
 * - Triggering query refetch when returning from background
 * - Processing pending syncs on foreground return
 */

import { AppState, AppStateStatus } from 'react-native';
import { eventBus } from '@/core/events';
import { queryClient, queryKeys } from '@/core/queryClient';
import { backgroundSyncService } from '@/features/player/services/backgroundSyncService';

// Minimum time in background before triggering refetch (5 seconds)
const MIN_BACKGROUND_TIME = 5000;

// Track background timing
let backgroundedAt: number | null = null;
let currentState: AppStateStatus = AppState.currentState;
let subscription: any = null;

/**
 * Initialize the app state listener.
 * Call once at app startup.
 * Returns cleanup function.
 */
export function initializeAppStateListener(): () => void {
  if (subscription) {
    console.warn('[AppStateListener] Already initialized');
    return () => {};
  }

  subscription = AppState.addEventListener('change', handleAppStateChange);
  console.log('[AppStateListener] Initialized');

  return () => {
    if (subscription) {
      subscription.remove();
      subscription = null;
    }
    console.log('[AppStateListener] Cleaned up');
  };
}

/**
 * Handle app state changes
 */
function handleAppStateChange(nextState: AppStateStatus): void {
  const previousState = currentState;
  currentState = nextState;

  // App going to background
  if (nextState === 'background' || nextState === 'inactive') {
    if (!backgroundedAt) {
      backgroundedAt = Date.now();
      console.log('[AppStateListener] App backgrounded');
      eventBus.emit('app:background', {});
    }
    return;
  }

  // App returning to foreground
  if (nextState === 'active' && previousState !== 'active') {
    const timeInBackground = backgroundedAt ? Date.now() - backgroundedAt : 0;
    backgroundedAt = null;

    console.log(`[AppStateListener] App foregrounded (was background for ${timeInBackground}ms)`);
    eventBus.emit('app:foreground', {});

    // Only refetch if we were in background long enough
    if (timeInBackground >= MIN_BACKGROUND_TIME) {
      handleForegroundReturn(timeInBackground);
    }
  }
}

/**
 * Handle foreground return - refetch stale data and process pending syncs
 */
async function handleForegroundReturn(timeInBackground: number): Promise<void> {
  console.log(`[AppStateListener] Refreshing data after ${Math.round(timeInBackground / 1000)}s in background`);

  try {
    // Process any pending syncs first (they may have failed while backgrounded)
    await backgroundSyncService.syncUnsyncedFromStorage();

    // Invalidate queries that might be stale
    // These will refetch on next access or if components are mounted
    const invalidations = [
      // Always refresh progress - most likely to have changed on other devices
      queryClient.invalidateQueries({ queryKey: queryKeys.user.progressAll() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.user.inProgress() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.user.continueListening() }),
    ];

    // If backgrounded for more than 1 minute, also refresh library data
    if (timeInBackground > 60000) {
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: queryKeys.library.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.series.all })
      );
    }

    await Promise.allSettled(invalidations);
    console.log('[AppStateListener] Data refresh complete');
  } catch (error) {
    console.warn('[AppStateListener] Error refreshing data:', error);
  }
}

/**
 * Get current app state
 */
export function getCurrentAppState(): AppStateStatus {
  return currentState;
}

/**
 * Check if app is currently in foreground
 */
export function isAppForeground(): boolean {
  return currentState === 'active';
}
