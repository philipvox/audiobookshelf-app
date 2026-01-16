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

// Note: Native splash is hidden immediately in App.tsx when JS loads
// AnimatedSplash component handles the loading UI from that point

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

      // Load progress store (unified progress source of truth)
      this.loadProgressStore(),

      // FAST: Sync recent progress (just top 5 recently played books)
      // This ensures player can resume immediately without loading delay
      this.syncRecentProgress(),

      // Pre-initialize audio system so playback starts instantly
      this.preInitAudio(),
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
      // Core fonts (always required)
      await Font.loadAsync({
        // Existing pixel font
        PixelOperator: require('@/assets/fonts/PixelOperator.ttf'),

        // Base typography fonts
        'BebasNeue-Regular': require('@/assets/fonts/BebasNeue-Regular.ttf'),
        'Oswald-Regular': require('@/assets/fonts/Oswald-Regular.ttf'),
        'Oswald-Bold': require('@/assets/fonts/Oswald-Bold.ttf'),
        'Lora-Regular': require('@/assets/fonts/Lora-Regular.ttf'),
        'Lora-Bold': require('@/assets/fonts/Lora-Bold.ttf'),
        'PlayfairDisplay-Regular': require('@/assets/fonts/PlayfairDisplay-Regular.ttf'),
        'PlayfairDisplay-Bold': require('@/assets/fonts/PlayfairDisplay-Bold.ttf'),
      });

      // Genre-specific fonts (optional - load if available)
      try {
        await Font.loadAsync({
          // Fantasy (Tolkien, Earthsea)
          'MacondoSwashCaps-Regular': require('@/assets/fonts/MacondoSwashCaps-Regular.ttf'),
          'UncialAntiqua-Regular': require('@/assets/fonts/UncialAntiqua-Regular.ttf'),
          // European Classics (Grenze Gotisch)
          'GrenzeGotisch-Regular': require('@/assets/fonts/GrenzeGotisch-Regular.ttf'),
          // Romance (Pride and Prejudice)
          'FleurDeLeah-Regular': require('@/assets/fonts/FleurDeLeah-Regular.ttf'),
          // Elegant script (romance/poetry replacement)
          'Charm-Regular': require('@/assets/fonts/Charm-Regular.ttf'),
          // Sci-Fi
          'Orbitron-Regular': require('@/assets/fonts/Orbitron-Regular.ttf'),
          // Tech/Computer
          'Silkscreen-Regular': require('@/assets/fonts/Silkscreen-Regular.ttf'),
          // Western/Crime/Deco
          'Notable-Regular': require('@/assets/fonts/Notable-Regular.ttf'),
          'Federo-Regular': require('@/assets/fonts/Federo-Regular.ttf'),
          // NEW FONTS (2026-01-14) - Additional variety
          'GravitasOne-Regular': require('@/assets/fonts/GravitasOne-Regular.ttf'),
          'NotoSerif-Regular': require('@/assets/fonts/NotoSerif-Regular.ttf'),
          'NotoSerif-Bold': require('@/assets/fonts/NotoSerif-Bold.ttf'),
          'LibreBaskerville-Regular': require('@/assets/fonts/LibreBaskerville-Regular.ttf'),
          'LibreBaskerville-Bold': require('@/assets/fonts/LibreBaskerville-Bold.ttf'),
          'AlfaSlabOne-Regular': require('@/assets/fonts/AlfaSlabOne-Regular.ttf'),
          'AlmendraSC-Regular': require('@/assets/fonts/AlmendraSC-Regular.ttf'),
          'ZenDots-Regular': require('@/assets/fonts/ZenDots-Regular.ttf'),
          'Eater-Regular': require('@/assets/fonts/Eater-Regular.ttf'),
          'RubikBeastly-Regular': require('@/assets/fonts/RubikBeastly-Regular.ttf'),
          'Barriecito-Regular': require('@/assets/fonts/Barriecito-Regular.ttf'),
          // Decorative drop cap font (woodcut initials)
          // Note: Font name must match internal TTF name exactly for Android
          'TypographerWoodcutInitialsOne': require('@/assets/fonts/TypographerWoodcut01.ttf'),
        });
        log.info('All genre-specific fonts loaded');
      } catch {
        log.debug('Genre-specific fonts not available (optional)');
      }

      log.info('Custom fonts loaded');
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

  /**
   * Load progress store from SQLite and set up subscribers.
   * This is the unified source of truth for all progress data.
   */
  private async loadProgressStore(): Promise<void> {
    try {
      const { useProgressStore, setupProgressSubscribers } = await import('@/core/stores/progressStore');

      // Load all progress from SQLite into memory
      await useProgressStore.getState().loadFromDatabase();

      // Set up subscribers (spineCache, etc.) after initial load
      setupProgressSubscribers();

      log.debug('Progress store loaded and subscribers set up');
    } catch (err) {
      log.warn('Progress store initialization failed:', err);
    }
  }

  /**
   * Sync recent progress from server (fast - just 5 books).
   * Runs during initialization so player can resume immediately.
   */
  private async syncRecentProgress(): Promise<void> {
    try {
      const { finishedBooksSync } = await import('@/core/services/finishedBooksSync');
      const synced = await finishedBooksSync.importRecentProgress();
      if (synced > 0) {
        log.info(`Quick sync: ${synced} recent books synced`);
      }
    } catch (err) {
      log.warn('Recent progress sync failed:', err);
    }
  }

  /**
   * Pre-initialize audio system during app startup.
   * This eliminates the audio setup delay when user hits play.
   */
  private async preInitAudio(): Promise<void> {
    try {
      const { audioService } = await import('@/features/player/services/audioService');
      const { playbackCache } = await import('@/core/services/playbackCache');

      await audioService.ensureSetup();
      playbackCache.setAudioInitialized(true);

      log.info('Audio system pre-initialized');
    } catch (err) {
      log.warn('Audio pre-init failed:', err);
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
          type MarkedBookEntry = { bookId: string; markedAt: number; source: string; synced: boolean };
          const markedBooksMap = new Map<string, MarkedBookEntry>(legacyMarkedBooks);
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
   * Sync finished books with server and pre-fetch sessions.
   * Note: Recent progress sync happens during initialization (syncRecentProgress).
   * This runs full sync in background after app is ready.
   */
  async syncFinishedBooks(): Promise<void> {
    try {
      const { finishedBooksSync } = await import('@/core/services/finishedBooksSync');

      // Preload most recent book into player store (shows correct progress on UI)
      await finishedBooksSync.preloadMostRecentBook();

      // Pre-fetch sessions for top 5 recently played books (instant playback)
      const prefetched = await finishedBooksSync.prefetchSessions();
      if (prefetched > 0) {
        log.info(`Pre-fetched ${prefetched} sessions for instant playback`);
      }

      // Full sync in background (all library items - slower)
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
