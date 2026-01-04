/**
 * App.tsx
 *
 * Entry point with optimized initialization.
 * Uses AppInitializer for parallel loading and AnimatedSplash for seamless transition.
 */

import React, { useEffect, useState, useCallback } from 'react';
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

export default function App() {
  // Performance monitoring in development
  if (__DEV__) {
    useAppHealthMonitor();
  }

  // Runtime monitoring in development
  useEffect(() => {
    if (__DEV__) {
      startAllMonitoring();

      // Instrumentation check after 10 seconds
      const checkTimer = setTimeout(() => {
        console.log('\n=== INSTRUMENTATION CHECK ===');
        console.log('Memory native:', memoryMonitor.isUsingNative());
        console.log('Memory stats:', memoryMonitor.getStats());
        console.log('FPS contexts:', Object.keys(fpsMonitor.getAllStats()));
        console.log('=============================\n');
      }, 10000);

      return () => {
        clearTimeout(checkTimer);
        stopAllMonitoring();
      };
    }
  }, []);

  const [isInitialized, setIsInitialized] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [initResult, setInitResult] = useState<InitResult | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const result = await appInitializer.initialize();
      if (mounted) {
        setInitResult(result);
        setIsInitialized(true);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Called when animated splash animation completes
  const onSplashReady = useCallback(async () => {
    // Hide native splash after animated splash is visible
    await appInitializer.hideSplash();
    setShowSplash(false);
  }, []);

  // Show nothing while initializing (native splash still visible)
  if (!isInitialized || !initResult) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider
            initialSession={{
              user: initResult.user,
              serverUrl: initResult.serverUrl,
            }}
          >
            <AppNavigator />
            {showSplash && <AnimatedSplash onReady={onSplashReady} />}
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
