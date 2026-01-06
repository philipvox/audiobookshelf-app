/**
 * src/core/services/appInitializer.ts
 *
 * Central initialization orchestrator for app startup.
 * Runs all critical initialization tasks in parallel to minimize launch time.
 * Controls native splash screen visibility.
 */

import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { User } from '@/core/types';
import { createLogger } from '@/shared/utils/logger';

const log = createLogger('AppInit');

// Prevent native splash auto-hide - we control when it hides
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already called or not available
});

export interface InitResult {
  user: User | null;
  serverUrl: string | null;
  fontsLoaded: boolean;
}

class AppInitializer {
  private initPromise: Promise<InitResult> | null = null;
  private isReady = false;

  /**
   * Initialize all critical resources in parallel.
   * Returns when app is ready to render content.
   */
  async initialize(): Promise<InitResult> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<InitResult> {
    const startTime = Date.now();
    log.info('Starting parallel initialization...');

    // Import auth service lazily to avoid circular dependencies
    const { authService } = await import('@/core/auth/authService');

    // PARALLEL: Run all initialization tasks concurrently
    const [fontResult, authResult] = await Promise.all([
      // Font loading
      this.loadFonts(),

      // Session restoration (optimized parallel reads)
      this.restoreSession(authService),

      // Hydrate completion store from SQLite
      this.hydrateCompletionStore(),

      // Run user_books migration (merges legacy tables, runs once)
      this.migrateUserBooks(),
    ]);

    const result: InitResult = {
      user: authResult?.user || null,
      serverUrl: authResult?.serverUrl || null,
      fontsLoaded: fontResult,
    };

    const elapsed = Date.now() - startTime;
    log.info(`Ready in ${elapsed}ms`, {
      fontsLoaded: result.fontsLoaded,
      hasUser: !!result.user,
    });

    this.isReady = true;

    // Initialize event listeners and lifecycle handlers
    // These don't block startup but need to be ready ASAP
    this.initEventSystem();

    // Initialize automotive (CarPlay/Android Auto) in background
    // Don't await - this doesn't need to block app startup
    this.initAutomotive();

    // Connect WebSocket if user is authenticated
    // Don't await - this runs in background
    if (result.user) {
      this.connectWebSocket();
      // Sync finished books with server
      this.syncFinishedBooks();
    }

    return result;
  }

  private async loadFonts(): Promise<boolean> {
    try {
      await Font.loadAsync({
        PixelOperator: require('@/assets/fonts/PixelOperator.ttf'),
      });
      return true;
    } catch (err) {
      log.warn('Font loading failed:', err);
      return false;
    }
  }

  private async restoreSession(authService: any): Promise<{
    user: User | null;
    serverUrl: string | null;
  }> {
    try {
      // Use optimized parallel session restore if available, otherwise fallback
      if (authService.restoreSessionOptimized) {
        return await authService.restoreSessionOptimized();
      }
      return await authService.restoreSession();
    } catch (err) {
      log.warn('Session restoration failed:', err);
      return { user: null, serverUrl: null };
    }
  }

  private async hydrateCompletionStore(): Promise<void> {
    try {
      const { useCompletionStore } = await import('@/features/completion');
      await useCompletionStore.getState().hydrate();
      log.debug('Completion store hydrated');
    } catch (err) {
      log.warn('Completion store hydration failed:', err);
    }
  }

  private async migrateUserBooks(): Promise<void> {
    try {
      const { sqliteCache } = await import('@/core/services/sqliteCache');
      const result = await sqliteCache.migrateToUserBooks();
      if (result.migrated > 0) {
        log.info(`Migrated ${result.migrated} records to user_books`);
      }

      // One-time migration from galleryStore.markedBooks to user_books
      await this.migrateGalleryStoreToUserBooks();
    } catch (err) {
      log.warn('user_books migration failed:', err);
    }
  }

  /**
   * Migrate galleryStore.markedBooks to user_books (one-time migration)
   * NOTE: markedBooks was removed from galleryStore in v0.6.23.
   * This migration only runs if there's legacy data in AsyncStorage.
   */
  private async migrateGalleryStoreToUserBooks(): Promise<void> {
    try {
      const { sqliteCache } = await import('@/core/services/sqliteCache');

      // Check if migration already completed
      const migrationKey = 'gallery_to_user_books_v1';
      const migrationDone = await sqliteCache.getSyncMetadata(migrationKey);
      if (migrationDone === 'done') {
        return; // Already migrated
      }

      // Try to read legacy markedBooks from AsyncStorage directly
      // (galleryStore no longer has markedBooks property)
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const storedData = await AsyncStorage.getItem('reading-history-gallery-storage');

      if (storedData) {
        const parsed = JSON.parse(storedData);
        const legacyMarkedBooks = parsed?.state?.markedBooks;

        if (Array.isArray(legacyMarkedBooks) && legacyMarkedBooks.length > 0) {
          // Convert array format back to Map for migration
          const markedBooksMap = new Map(legacyMarkedBooks);
          log.info(`Migrating ${markedBooksMap.size} books from legacy galleryStore...`);
          const result = await sqliteCache.migrateGalleryStoreToUserBooks(markedBooksMap);
          log.info(`Gallery migration: ${result.migrated} migrated, ${result.skipped} skipped`);
        }
      }

      // Mark migration as complete
      await sqliteCache.setSyncMetadata(migrationKey, 'done');
    } catch (err) {
      log.warn('galleryStore migration failed:', err);
    }
  }

  private async initAutomotive(): Promise<void> {
    try {
      const { automotiveService } = await import('@/features/automotive');
      await automotiveService.init({
        appName: 'Secret Library',
        enableCarPlay: true,
        enableAndroidAuto: true,
      });
      log.debug('Automotive service initialized');
    } catch (err) {
      log.warn('Automotive initialization failed:', err);
    }
  }

  private async initEventSystem(): Promise<void> {
    try {
      // Initialize app-wide event listeners (analytics, monitoring)
      const { initializeEventListeners } = await import('@/core/events');
      initializeEventListeners();

      // Initialize app state listener (foreground/background detection, refetch)
      const { initializeAppStateListener } = await import('@/core/lifecycle');
      initializeAppStateListener();

      log.debug('Event system initialized');
    } catch (err) {
      log.warn('Event system initialization failed:', err);
    }
  }

  /**
   * Connect WebSocket for real-time sync.
   * Call this after user is authenticated.
   */
  async connectWebSocket(): Promise<void> {
    try {
      const { websocketService } = await import('@/core/services/websocketService');
      await websocketService.connect();
      log.debug('WebSocket connected');
    } catch (err) {
      log.warn('WebSocket connection failed:', err);
    }
  }

  /**
   * Sync finished books with server.
   * Imports from server first, then syncs local changes.
   * Runs in background - doesn't block startup.
   */
  async syncFinishedBooks(): Promise<void> {
    try {
      const { finishedBooksSync } = await import('@/core/services/finishedBooksSync');
      const result = await finishedBooksSync.fullSync();
      if (result.imported > 0 || result.synced > 0) {
        log.info(`Finished books sync: ${result.imported} imported, ${result.synced} synced`);
      }
    } catch (err) {
      log.warn('Finished books sync failed:', err);
    }
  }

  /**
   * Disconnect WebSocket (e.g., on logout).
   */
  async disconnectWebSocket(): Promise<void> {
    try {
      const { websocketService } = await import('@/core/services/websocketService');
      websocketService.disconnect('manual');
      log.debug('WebSocket disconnected');
    } catch (err) {
      log.warn('WebSocket disconnect failed:', err);
    }
  }

  /**
   * Hide native splash screen.
   * Call this after animated splash is ready to take over.
   */
  async hideSplash(): Promise<void> {
    try {
      await SplashScreen.hideAsync();
    } catch (err) {
      // Already hidden or not available
    }
  }

  getIsReady(): boolean {
    return this.isReady;
  }
}

export const appInitializer = new AppInitializer();
