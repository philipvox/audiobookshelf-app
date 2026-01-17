/**
 * App.tsx
 *
 * Entry point with optimized initialization.
 * Uses AppInitializer for parallel loading and AnimatedSplash for seamless transition.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, NativeModules } from 'react-native';
import { AuthProvider } from './src/core/auth';
import { AppNavigator } from './src/navigation/AppNavigator';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { queryClient } from './src/core/queryClient';
import { appInitializer, InitResult } from './src/core/services/appInitializer';
import { AnimatedSplash } from './src/shared/components/AnimatedSplash';
import { useAppHealthMonitor } from './src/utils/perfDebug';
import { startAllMonitoring, stopAllMonitoring, fpsMonitor, memoryMonitor } from './src/utils/runtimeMonitor';
import { useLibraryCache } from './src/core/cache';
import { useSpineCacheStore, selectIsPopulated } from './src/features/home/stores/spineCache';
import { useAppReadyStore, setAppBootComplete } from './src/core/stores/appReadyStore';

// Reset boot flag immediately on bundle load (before any components render)
setAppBootComplete(false);
import * as SplashScreen from 'expo-splash-screen';

// IMMEDIATELY hide native splash when JS bundle loads
// AnimatedSplash will already be rendering, so transition is seamless
SplashScreen.hideAsync().catch(() => {});

// Global error handler to catch silent crashes in release builds
if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    // Log to native Android logcat (works in release builds)
    if (NativeModules.ExceptionsManager) {
      NativeModules.ExceptionsManager.reportException({ message: `[GLOBAL ERROR] ${error?.message || error}`, stack: error?.stack, isFatal });
    }
    // Call original handler
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

// Note: Native splash is hidden immediately at module load (line 24-26)
// No failsafe timer needed - AnimatedSplash handles the loading UI

export default function App() {
  // Performance monitoring in development
  // DISABLED: Causes excessive logging and potential memory leaks
  // if (__DEV__) {
  //   useAppHealthMonitor();
  // }

  // Runtime monitoring in development
  // DISABLED: Causes excessive logging - enable only when debugging specific issues
  // useEffect(() => {
  //   if (__DEV__) {
  //     startAllMonitoring();
  //
  //     // Instrumentation check after 10 seconds
  //     const checkTimer = setTimeout(() => {
  //       console.log('\n=== INSTRUMENTATION CHECK ===');
  //       console.log('Memory native:', memoryMonitor.isUsingNative());
  //       console.log('Memory stats:', memoryMonitor.getStats());
  //       console.log('FPS contexts:', Object.keys(fpsMonitor.getAllStats()));
  //       console.log('=============================\n');
  //     }, 10000);
  //
  //     return () => {
  //       clearTimeout(checkTimer);
  //       stopAllMonitoring();
  //     };
  //   }
  // }, []);

  const [isInitialized, setIsInitialized] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [initResult, setInitResult] = useState<InitResult | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Check if library and spine caches are ready
  const isLibraryCacheLoaded = useLibraryCache((s) => s.isLoaded);
  const isLibraryCacheLoading = useLibraryCache((s) => s.isLoading);
  const lastRefreshed = useLibraryCache((s) => s.lastRefreshed);
  const refreshCache = useLibraryCache((s) => s.refreshCache);
  const isSpineCachePopulated = useSpineCacheStore(selectIsPopulated);

  // Track if initial refresh has completed (prevents library flash on first load)
  const [isInitialRefreshComplete, setIsInitialRefreshComplete] = useState(false);
  const hasTriggeredRefresh = React.useRef(false);
  const setBootComplete = useAppReadyStore((s) => s.setBootComplete);

  // Trigger initial refresh after cache is loaded (prevents library flash)
  // This ensures fresh data is fetched before splash dismisses
  useEffect(() => {
    // Wait for initResult to be set before making any decisions
    if (!initResult) return;

    if (isLibraryCacheLoaded && !hasTriggeredRefresh.current && initResult.user) {
      hasTriggeredRefresh.current = true;
      console.log('[App] Triggering initial library refresh...');
      refreshCache().then(() => {
        console.log('[App] Initial library refresh complete, setting boot=true');
        setIsInitialRefreshComplete(true);
        setBootComplete(true); // Signal to components that boot is complete
      }).catch(() => {
        // Even on error, mark as complete so app doesn't hang
        console.log('[App] Refresh error, setting boot=true');
        setIsInitialRefreshComplete(true);
        setBootComplete(true);
      });
    } else if (!initResult.user) {
      // Not logged in - no refresh needed
      console.log('[App] No user, setting boot=true');
      setIsInitialRefreshComplete(true);
      setBootComplete(true);
    }
  }, [isLibraryCacheLoaded, initResult, refreshCache, setBootComplete]);

  // All conditions for splash to dismiss:
  // 1. Fonts loaded (for spine rendering)
  // 2. Library cache loaded (book data)
  // 3. Spine cache populated (dimensions, colors, typography)
  // 4. Initial refresh complete (prevents library flash)
  const isCacheReady = fontsLoaded && isLibraryCacheLoaded && isSpineCachePopulated && isInitialRefreshComplete;

  // Calculate loading progress (0 to 1) and status text
  // 0.0 - 0.2: Initializing (fonts, auth, etc.)
  // 0.2 - 0.4: Loading library cache
  // 0.4 - 0.6: Populating spine cache
  // 0.6 - 1.0: Initial refresh
  const loadingProgress = !isInitialized ? 0 :
    !fontsLoaded ? 0.1 :
    !isLibraryCacheLoaded && !isLibraryCacheLoading ? 0.2 :
    !isLibraryCacheLoaded && isLibraryCacheLoading ? 0.35 :
    isLibraryCacheLoaded && !isSpineCachePopulated ? 0.5 :
    isSpineCachePopulated && !isInitialRefreshComplete ? 0.75 :
    isCacheReady ? 1 : 0.5;

  // Status text based on loading phase
  const loadingStatusText = !isInitialized ? 'initializing...' :
    !fontsLoaded ? 'loading fonts...' :
    !isLibraryCacheLoaded && !isLibraryCacheLoading ? 'restoring session...' :
    !isLibraryCacheLoaded && isLibraryCacheLoading ? 'loading library...' :
    isLibraryCacheLoaded && !isSpineCachePopulated ? 'preparing bookshelf...' :
    isSpineCachePopulated && !isInitialRefreshComplete ? 'syncing library...' :
    isCacheReady ? 'ready' : 'loading...';

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const result = await appInitializer.initialize();
        if (mounted) {
          setInitResult(result);
          setFontsLoaded(result.fontsLoaded);
          setIsInitialized(true);
        }
      } catch (error) {
        // Error during initialization - app may not load correctly
        console.warn('[App] Initialization error:', error);
        // Still set initialized so app doesn't hang
        if (mounted) {
          setIsInitialized(true);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Called when animated splash animation completes
  const onSplashReady = useCallback(() => {
    // Just hide the AnimatedSplash overlay
    setShowSplash(false);
  }, []);

  // Determine if data is ready for splash to dismiss
  // - Not logged in: ready immediately (no caches to load)
  // - Logged in: wait for fonts + library + spine caches
  const isDataReady = !initResult?.user || isCacheReady;

  // Single consistent component tree - AnimatedSplash is ALWAYS rendered on top
  // This prevents the logo from disappearing during transitions
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
      <SafeAreaProvider style={{ backgroundColor: '#000' }}>
        <QueryClientProvider client={queryClient}>
          {/* Only render AuthProvider/AppNavigator after initialization */}
          {isInitialized && initResult ? (
            <AuthProvider
              initialSession={{
                user: initResult.user,
                serverUrl: initResult.serverUrl,
              }}
            >
              <AppNavigator />
            </AuthProvider>
          ) : (
            // Empty placeholder during init - splash covers this
            <View style={{ flex: 1, backgroundColor: '#000' }} />
          )}
        </QueryClientProvider>
      </SafeAreaProvider>

      {/* AnimatedSplash is ALWAYS at the top level, never unmounts until ready */}
      {showSplash && (
        <AnimatedSplash
          onReady={onSplashReady}
          isDataReady={isInitialized && isDataReady}
          progress={loadingProgress}
          statusText={loadingStatusText}
        />
      )}
    </GestureHandlerRootView>
  );
}
