/**
 * src/features/automotive/automotiveService.ts
 *
 * Central service for CarPlay and Android Auto integration.
 * Provides a unified API for automotive platforms.
 *
 * NOTE: CarPlay requires:
 * 1. Apple CarPlay Audio entitlement (com.apple.developer.carplay-audio)
 * 2. react-native-carplay package installed
 * 3. Native iOS scene delegate configuration
 *
 * Android Auto requires:
 * 1. MediaBrowserService implementation in native code
 * 2. automotive_app_desc.xml configuration
 */

import { Platform, NativeModules, NativeEventEmitter, EmitterSubscription } from 'react-native';
import {
  AutomotiveConnectionState,
  AutomotivePlatform,
  AutomotiveNowPlaying,
  AutomotiveAction,
  AutomotiveCallbacks,
  AutomotiveConfig,
  BrowseSection,
  BrowseItem,
  DEFAULT_AUTOMOTIVE_CONFIG,
} from './types';
import { audioLog } from '@/shared/utils/audioDebug';
import { LibraryItem, BookMedia, BookMetadata } from '@/core/types';
import { getErrorMessage } from '@/shared/utils/errorUtils';
import { audioService } from '@/features/player/services/audioService';

// PERF: Pre-import player store to avoid dynamic import latency on first command
// Dynamic imports can take 100-300ms on first invocation
import { usePlayerStore } from '@/features/player/stores/playerStore';
import { useSpeedStore } from '@/features/player/stores/speedStore';

// Extended metadata interface
interface ExtendedBookMetadata extends BookMetadata {
  narratorName?: string;
}

// Helper to get book metadata safely
// Note: Does NOT require audioFiles - works with cache items that only have metadata
function getBookMetadata(item: LibraryItem | null | undefined): ExtendedBookMetadata | null {
  if (!item?.media?.metadata) return null;
  return item.media.metadata as ExtendedBookMetadata;
}

// Helper to get book duration in seconds
function getBookDuration(item: LibraryItem | null | undefined): number {
  if (!item?.media) return 0;
  return (item.media as BookMedia).duration || 0;
}

// Format duration as "Xh Ym" for display
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

// Format time remaining as "Xh Ym left"
function formatTimeRemaining(durationSeconds: number, progress: number): string {
  if (!durationSeconds || durationSeconds <= 0 || progress >= 1) return '';
  const remaining = durationSeconds * (1 - progress);
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m left` : `${hours}h left`;
  }
  return `${minutes}m left`;
}

// Format subtitle with author and time info
// For in-progress: "Author • 45% • 3h 21m left"
// For not started: "Author • 12h 30m"
function formatSubtitle(author: string, durationSeconds: number, progress?: number): string {
  const parts: string[] = [author];

  if (progress !== undefined && progress > 0 && progress < 1) {
    // In-progress: show percentage and time remaining
    parts.push(`${Math.round(progress * 100)}%`);
    const remaining = formatTimeRemaining(durationSeconds, progress);
    if (remaining) {
      parts.push(remaining);
    }
  } else if (progress === undefined || progress === 0) {
    // Not started: show total duration
    const durationStr = formatDuration(durationSeconds);
    if (durationStr) {
      parts.push(durationStr);
    }
  }
  // For finished (progress >= 1), just show author

  return parts.join(' • ');
}

const log = (...args: any[]) => audioLog.audio('[Automotive]', ...args);

/**
 * Automotive service - manages CarPlay and Android Auto connections
 */
class AutomotiveService {
  private config: AutomotiveConfig = DEFAULT_AUTOMOTIVE_CONFIG;
  private connectionState: AutomotiveConnectionState = 'disconnected';
  private connectedPlatform: AutomotivePlatform = 'none';
  private callbacks: AutomotiveCallbacks | null = null;
  private isInitialized = false;

  // CarPlay-specific state (when react-native-carplay is installed)
  private carPlayModule: any = null;
  private continueListeningTemplate: any = null;
  private downloadsTemplate: any = null;
  private libraryCacheUnsubscribe: (() => void) | null = null;

  // Deduplication for playItem to prevent double playback
  private lastPlayedItemId: string | null = null;
  private lastPlayedTime: number = 0;
  private static PLAY_DEBOUNCE_MS = 2000; // Ignore duplicate play requests within 2 seconds

  // Android Auto event subscription
  private androidAutoSubscription: EmitterSubscription | null = null;

  // Player state subscription for Android Auto sync
  private playerStoreUnsubscribe: (() => void) | null = null;

  // Command execution lock to prevent concurrent commands from racing
  private isCommandExecuting: boolean = false;
  private commandQueue: Array<{ command: string; param?: string }> = [];

  // Initialization lock to prevent concurrent init from both Android Auto and main app
  private isInitializing: boolean = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the automotive service
   * Fix: Handle concurrent init calls from both Android Auto and main app
   */
  async init(config?: Partial<AutomotiveConfig>): Promise<void> {
    if (this.isInitialized) {
      log('Already initialized');
      return;
    }

    // Fix: If already initializing, wait for that to complete
    if (this.isInitializing && this.initPromise) {
      log('Init already in progress, waiting...');
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this._doInit(config);

    try {
      await this.initPromise;
    } finally {
      this.isInitializing = false;
      this.initPromise = null;
    }
  }

  private async _doInit(config?: Partial<AutomotiveConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    log('Initializing automotive service...');
    log('Config:', JSON.stringify(this.config, null, 2));

    // Try to load CarPlay module (iOS only)
    if (Platform.OS === 'ios' && this.config.enableCarPlay) {
      await this.initCarPlay();
    }

    // Try to load Android Auto module (Android only)
    if (Platform.OS === 'android' && this.config.enableAndroidAuto) {
      await this.initAndroidAuto();
    }

    this.isInitialized = true;
    log('Automotive service initialized');
  }

  /**
   * Initialize CarPlay integration
   */
  private async initCarPlay(): Promise<void> {
    try {
      // First check if the native module exists before requiring the package
      const { NativeModules } = require('react-native');
      if (!NativeModules.RNCarPlay) {
        log('CarPlay native module not linked - skipping CarPlay init');
        log('To enable CarPlay:');
        log('1. Get CarPlay entitlement from Apple');
        log('2. Install: npm install react-native-carplay');
        log('3. Run pod install and rebuild');
        return;
      }

      // Try to require react-native-carplay
      this.carPlayModule = require('react-native-carplay');
      log('CarPlay module loaded');

      // Set up connection listener
      this.carPlayModule.CarPlay.registerOnConnect(() => {
        log('CarPlay connected');
        this.connectionState = 'connected';
        this.connectedPlatform = 'carplay';
        this.callbacks?.onConnect('carplay');
        this.setupCarPlayTemplates();
      });

      this.carPlayModule.CarPlay.registerOnDisconnect(() => {
        log('CarPlay disconnected');
        this.connectionState = 'disconnected';
        this.connectedPlatform = 'none';
        this.callbacks?.onDisconnect();
      });

      // Subscribe to library cache changes to refresh lists
      this.setupLibraryCacheListener();

    } catch (error) {
      log('CarPlay module not available:', getErrorMessage(error));
      log('To enable CarPlay:');
      log('1. Get CarPlay entitlement from Apple');
      log('2. Install: npm install react-native-carplay');
      log('3. Configure iOS scene delegate');
    }
  }

  /**
   * Set up listener for library cache changes
   */
  private async setupLibraryCacheListener(): Promise<void> {
    try {
      const { useLibraryCache } = await import('@/core/cache/libraryCache');

      // Unsubscribe from previous listener if any
      if (this.libraryCacheUnsubscribe) {
        this.libraryCacheUnsubscribe();
      }

      // Subscribe to changes - track previous items to detect changes
      let prevItems = useLibraryCache.getState().items;
      this.libraryCacheUnsubscribe = useLibraryCache.subscribe((state) => {
        if (state.items !== prevItems) {
          prevItems = state.items;
          log('Library changed, refreshing automotive data');

          // Refresh CarPlay lists when library changes
          if (this.isConnected() && this.connectedPlatform === 'carplay') {
            this.updateCarPlayLists();
          }

          // Refresh Android Auto browse data when library changes
          if (Platform.OS === 'android') {
            this.syncBrowseDataToAndroidAuto();
          }
        }
      });

      // Initial sync for Android Auto
      if (Platform.OS === 'android') {
        // Delay initial sync to ensure library is loaded
        setTimeout(() => this.syncBrowseDataToAndroidAuto(), 1000);
      }

      log('Library cache listener set up');
    } catch (error) {
      log('Failed to set up library cache listener:', error);
    }
  }

  /**
   * Sync browse data to Android Auto native MediaBrowserService.
   * Serializes all browse sections as JSON and writes to file via native module.
   * The native service reads this file in onLoadChildren().
   */
  private async syncBrowseDataToAndroidAuto(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const { AndroidAutoModule } = NativeModules;
      if (!AndroidAutoModule || !AndroidAutoModule.writeBrowseData) {
        log('AndroidAutoModule.writeBrowseData not available');
        return;
      }

      // Check if library data is available
      const { useLibraryCache } = await import('@/core/cache/libraryCache');
      const libraryItems = useLibraryCache.getState().items;
      if (libraryItems.length === 0) {
        log('Library not loaded yet, skipping browse sync');
        return;
      }

      const sections = await this.getBrowseSections();
      log('Syncing browse data to Android Auto:', sections.length, 'sections');

      // Serialize sections to JSON and write to file via native module
      const jsonData = JSON.stringify(sections);
      try {
        await AndroidAutoModule.writeBrowseData(jsonData);
        log(`Browse data written: ${sections.length} sections, ${jsonData.length} chars`);
      } catch (err) {
        log('Failed to write browse data:', err);
      }
    } catch (error) {
      log('Failed to sync browse data to Android Auto:', error);
    }
  }

  /**
   * Initialize Android Auto integration
   */
  private async initAndroidAuto(): Promise<void> {
    log('Initializing Android Auto support...');

    const { AndroidAutoModule } = NativeModules;

    if (!AndroidAutoModule) {
      log('AndroidAutoModule not available - native module not linked');
      this.setupLibraryCacheListener();
      return;
    }

    try {
      // Fix: Remove any existing subscription before adding new one
      // This prevents listener stacking when both Android Auto and main app init simultaneously
      if (this.androidAutoSubscription) {
        log('Removing existing Android Auto subscription before re-init');
        this.androidAutoSubscription.remove();
        this.androidAutoSubscription = null;
      }

      // Set up event listener for commands from native MediaBrowserService
      const eventEmitter = new NativeEventEmitter(AndroidAutoModule);
      this.androidAutoSubscription = eventEmitter.addListener(
        AndroidAutoModule.EVENT_NAME || 'AndroidAutoCommand',
        this.handleAndroidAutoCommand.bind(this)
      );
      log('Android Auto event listener set up');

      // Set up library cache listener
      this.setupLibraryCacheListener();

      // Subscribe to player state changes for MediaSession sync
      await this.setupPlayerStateSync();

      // Sync browse data to native MediaBrowserService
      // Try immediately, then again with delay in case library isn't loaded yet
      this.syncBrowseDataToAndroidAuto();
      setTimeout(() => this.syncBrowseDataToAndroidAuto(), 1000);
      setTimeout(() => this.syncBrowseDataToAndroidAuto(), 3000);

      log('Android Auto initialized successfully');

    } catch (error) {
      log('Error initializing Android Auto:', error);
      this.setupLibraryCacheListener();
    }
  }

  /**
   * Handle commands received from native Android Auto
   * Uses a lock to prevent concurrent commands from racing
   */
  private async handleAndroidAutoCommand(event: { command: string; param?: string }): Promise<void> {
    log('Received Android Auto command:', event);

    // If a command is already executing, queue this one (except for duplicate play/pause)
    if (this.isCommandExecuting) {
      // Don't queue duplicate consecutive commands
      const lastQueued = this.commandQueue[this.commandQueue.length - 1];
      if (lastQueued?.command === event.command) {
        log('Ignoring duplicate queued command:', event.command);
        return;
      }
      log('Command queued (another in progress):', event.command);
      this.commandQueue.push(event);
      return;
    }

    this.isCommandExecuting = true;

    try {
      await this.executeCommand(event);
    } finally {
      this.isCommandExecuting = false;

      // Process any queued commands
      if (this.commandQueue.length > 0) {
        const nextCommand = this.commandQueue.shift();
        if (nextCommand) {
          // PERF: Reduced delay from 50ms to 10ms for faster command processing
          setTimeout(() => this.handleAndroidAutoCommand(nextCommand), 10);
        }
      }
    }
  }

  /**
   * Execute a single Android Auto command
   */
  private async executeCommand(event: { command: string; param?: string }): Promise<void> {
    switch (event.command) {
      case 'playFromMediaId':
        if (event.param) {
          // Check if this is a chapter navigation request
          if (event.param.startsWith('chapter:')) {
            await this.playChapter(event.param);
          } else {
            await this.playItem(event.param);
          }
        }
        break;

      case 'play':
        {
          // PERF: Use pre-imported store (no dynamic import latency)
          const state = usePlayerStore.getState();
          state.play();  // Fire-and-forget for instant response
          log('Play command executed');

          // FIX: Immediate feedback to Android Auto (don't wait for state subscription)
          const { AndroidAutoModule } = NativeModules;
          if (AndroidAutoModule) {
            const position = state.position || 0;
            const speed = state.playbackRate || 1.0;
            try {
              AndroidAutoModule.updatePlaybackState(true, position, speed);
              log('Immediate play state sent to Android Auto');
            } catch (err) {
              log('Failed to send immediate play state:', err);
            }
          }

          // Ensure browse data is synced after play starts (in case it was empty)
          setTimeout(() => this.syncBrowseDataToAndroidAuto(), 500);
        }
        break;

      case 'pause':
        {
          // PERF: Use pre-imported store (no dynamic import latency)
          const state = usePlayerStore.getState();
          state.pause();  // Fire-and-forget for instant response
          log('Pause command executed');

          // FIX: Immediate feedback to Android Auto (don't wait for state subscription)
          const { AndroidAutoModule } = NativeModules;
          if (AndroidAutoModule) {
            const position = state.position || 0;
            const speed = state.playbackRate || 1.0;
            try {
              AndroidAutoModule.updatePlaybackState(false, position, speed);
              log('Immediate pause state sent to Android Auto');
            } catch (err) {
              log('Failed to send immediate pause state:', err);
            }
          }
        }
        break;

      case 'skipNext':
      case 'skipToNext':
        {
          // PERF: Use pre-imported store
          const state = usePlayerStore.getState();
          const wasPlaying = state.isPlaying;
          await state.nextChapter();
          // Ensure playback continues if it was playing
          if (wasPlaying && !audioService.getIsPlaying()) {
            audioService.play();  // Fire-and-forget
          }
          log('Skip next (next chapter) executed');
        }
        break;

      case 'skipPrevious':
      case 'skipToPrevious':
        {
          // PERF: Use pre-imported store
          const state = usePlayerStore.getState();
          const wasPlaying = state.isPlaying;
          await state.prevChapter();
          // Ensure playback continues if it was playing
          if (wasPlaying && !audioService.getIsPlaying()) {
            audioService.play();  // Fire-and-forget
          }
          log('Skip previous (previous chapter) executed');
        }
        break;

      case 'stop':
        // PERF: Use pre-imported store
        usePlayerStore.getState().pause();  // Fire-and-forget for instant response
        log('Stop command executed (paused)');
        break;

      case 'fastForward':
        {
          // PERF: Use pre-imported store
          const state = usePlayerStore.getState();
          const oldPosition = state.position || 0;
          await state.skipForward(30);
          log('Fast forward 30s executed');

          // FIX: Immediate position feedback to Android Auto
          const { AndroidAutoModule } = NativeModules;
          if (AndroidAutoModule) {
            const newPosition = usePlayerStore.getState().position || oldPosition + 30;
            const isPlaying = usePlayerStore.getState().isPlaying;
            const speed = state.playbackRate || 1.0;
            try {
              AndroidAutoModule.updatePlaybackState(isPlaying, newPosition, speed);
              log('Immediate position sent to Android Auto:', newPosition);
            } catch (err) {
              log('Failed to send position update:', err);
            }
          }
        }
        break;

      case 'rewind':
        {
          // PERF: Use pre-imported store
          const state = usePlayerStore.getState();
          const oldPosition = state.position || 0;
          await state.skipBackward(30);
          log('Rewind 30s executed');

          // FIX: Immediate position feedback to Android Auto
          const { AndroidAutoModule } = NativeModules;
          if (AndroidAutoModule) {
            const newPosition = usePlayerStore.getState().position || Math.max(0, oldPosition - 30);
            const isPlaying = usePlayerStore.getState().isPlaying;
            const speed = state.playbackRate || 1.0;
            try {
              AndroidAutoModule.updatePlaybackState(isPlaying, newPosition, speed);
              log('Immediate position sent to Android Auto:', newPosition);
            } catch (err) {
              log('Failed to send position update:', err);
            }
          }
        }
        break;

      case 'seekTo':
        if (event.param) {
          const position = parseInt(event.param, 10);
          if (!isNaN(position)) {
            // PERF: Use pre-imported store
            const state = usePlayerStore.getState();
            const wasPlaying = state.isPlaying;
            await state.seekTo(position / 1000); // Convert ms to seconds
            // Ensure playback continues if it was playing
            if (wasPlaying && !audioService.getIsPlaying()) {
              audioService.play();  // Fire-and-forget
            }
          }
        }
        break;

      case 'search':
      case 'playFromSearch':
        // Note: empty string is valid (resume most recent), so check for undefined
        if (event.param !== undefined) {
          await this.handleSearch(event.param);
        }
        break;

      case 'speedUp':
        await this.handleSpeedChange('up');
        break;

      case 'speedDown':
        await this.handleSpeedChange('down');
        break;

      case 'addBookmark':
        await this.handleAddBookmark();
        break;

      case 'showChapters':
        log('Show chapters requested - not yet implemented');
        break;

      case 'customAction':
        log('Custom action received:', event.param);
        break;

      case 'requestBrowseData':
        // Native service is requesting browse data (likely just started or resumed)
        log('Browse data requested by native service');
        this.syncBrowseDataToAndroidAuto();
        break;

      default:
        log('Unknown Android Auto command:', event.command);
    }
  }

  /**
   * Handle speed change from Android Auto
   */
  private async handleSpeedChange(direction: 'up' | 'down'): Promise<void> {
    try {
      // PERF: Use pre-imported stores
      const state = usePlayerStore.getState();
      const speedState = useSpeedStore.getState();
      const bookId = state.currentBook?.id;
      // Get current speed from bookSpeedMap (per-book) or fall back to globalDefaultRate
      const currentSpeed = (bookId && speedState.bookSpeedMap[bookId]) || speedState.globalDefaultRate || 1.0;

      const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
      const currentIndex = speeds.findIndex(s => Math.abs(s - currentSpeed) < 0.01);

      let newSpeed: number;
      if (direction === 'up') {
        newSpeed = currentIndex < speeds.length - 1 ? speeds[currentIndex + 1] : speeds[speeds.length - 1];
      } else {
        newSpeed = currentIndex > 0 ? speeds[currentIndex - 1] : speeds[0];
      }

      await state.setPlaybackRate(newSpeed);
      log(`Speed changed from ${currentSpeed}x to ${newSpeed}x`);
    } catch (error) {
      log('Failed to change speed:', error);
    }
  }

  /**
   * Handle bookmark creation from Android Auto
   */
  private async handleAddBookmark(): Promise<void> {
    try {
      // PERF: Use pre-imported store
      const state = usePlayerStore.getState();

      if (!state.currentBook) {
        log('No book playing, cannot add bookmark');
        return;
      }

      const position = state.position;
      const bookId = state.currentBook.id;
      const bookTitle = getBookMetadata(state.currentBook)?.title || 'Unknown';

      // Try to add bookmark via the bookmark store/API
      try {
        const { useBookmarkStore } = await import('@/features/bookmarks/stores/bookmarkStore');
        await useBookmarkStore.getState().addBookmark({
          libraryItemId: bookId,
          time: position,
          title: `Bookmark at ${this.formatTime(position)}`,
        });
        log(`Bookmark added at ${position}s for "${bookTitle}"`);
      } catch (bookmarkError) {
        // Fallback: just log that we would add a bookmark
        log(`Would add bookmark at ${position}s for "${bookTitle}" (store not available)`);
      }
    } catch (error) {
      log('Failed to add bookmark:', error);
    }
  }

  /**
   * Format time in HH:MM:SS format
   */
  private formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Handle voice search from Android Auto
   * Searches library for matching book and plays it
   * Empty query = play most recently listened book
   */
  private async handleSearch(query: string): Promise<void> {
    log('Handling search:', query || '(empty - resume recent)');

    try {
      const { useLibraryCache } = await import('@/core/cache/libraryCache');
      // PERF: Use pre-imported player store

      const libraryItems = useLibraryCache.getState().items;
      const queryLower = query.toLowerCase().trim();

      let match: typeof libraryItems[0] | undefined;

      if (!queryLower) {
        // Empty query - find most recently listened book with progress
        match = libraryItems
          .filter(item => {
            const progress = item.userMediaProgress?.progress || 0;
            return progress > 0 && progress < 1;
          })
          .sort((a, b) => {
            const aTime = a.userMediaProgress?.lastUpdate || 0;
            const bTime = b.userMediaProgress?.lastUpdate || 0;
            return bTime - aTime;
          })[0];

        if (!match) {
          // No in-progress books, try most recently added
          match = [...libraryItems].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))[0];
        }

        log('Empty search - resuming:', getBookMetadata(match)?.title);
      } else {
        // Search for matching book by title, author, series, or narrator
        match = libraryItems.find(item => {
          const metadata = getBookMetadata(item);
          const title = (metadata?.title || '').toLowerCase();
          const author = (metadata?.authorName || metadata?.authors?.[0]?.name || '').toLowerCase();
          const series = (metadata?.seriesName || '').toLowerCase();
          const narrator = (metadata?.narratorName || '').toLowerCase();

          return (
            title.includes(queryLower) ||
            author.includes(queryLower) ||
            series.includes(queryLower) ||
            narrator.includes(queryLower)
          );
        });

        // If no exact match, try fuzzy matching on title
        if (!match) {
          match = libraryItems.find(item => {
            const metadata = getBookMetadata(item);
            const title = (metadata?.title || '').toLowerCase();
            // Check if query words appear in title
            const queryWords = queryLower.split(/\s+/);
            return queryWords.every(word => title.includes(word));
          });
        }
      }

      if (match) {
        log('Found match for search:', getBookMetadata(match)?.title);
        await usePlayerStore.getState().loadBook(match, {
          autoPlay: true,
          showPlayer: false,
        });
      } else {
        log('No match found for search query:', query);
        // Could show a toast or notification here
      }
    } catch (error) {
      log('Search failed:', error);
    }
  }

  // Periodic sync interval for Android Auto position updates
  private periodicSyncInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Set up player state synchronization for Android Auto MediaSession
   * This ensures the Now Playing screen shows correct info
   */
  private async setupPlayerStateSync(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      // PERF: Use pre-imported player store
      const { AndroidAutoModule } = NativeModules;

      if (!AndroidAutoModule) {
        log('AndroidAutoModule not available for player sync');
        return;
      }

      // Unsubscribe from previous listener if any
      if (this.playerStoreUnsubscribe) {
        this.playerStoreUnsubscribe();
      }

      // Clear any existing periodic sync
      if (this.periodicSyncInterval) {
        clearInterval(this.periodicSyncInterval);
        this.periodicSyncInterval = null;
      }

      // Track previous values to detect changes
      let prevIsPlaying = false;
      let prevPosition = 0;
      let prevBookId = '';
      let prevChapterTitle: string | null = null;
      let lastSyncTime = 0;

      // Helper to sync playback state to Android Auto
      const syncPlaybackState = (isPlaying: boolean, position: number, speed: number) => {
        try {
          const result = AndroidAutoModule.updatePlaybackState(
            isPlaying,
            position, // seconds - Kotlin converts to ms
            speed
          );
          // Handle both Promise and non-Promise returns
          if (result && typeof result.catch === 'function') {
            result.catch((err: any) => log('Failed to update playback state:', err));
          }
        } catch (err) {
          log('Failed to update playback state:', err);
        }
      };

      // Helper to sync current state to Android Auto
      const syncState = async (state: any) => {
        const isPlaying = state.isPlaying;
        const position = state.position;
        const book = state.currentBook;
        const speed = state.playbackRate || 1.0;
        const duration = state.duration || 0;
        const now = Date.now();

        // FIX: ALWAYS sync on play/pause changes (regardless of position)
        // This ensures Android Auto immediately reflects play/pause state
        if (isPlaying !== prevIsPlaying) {
          log('Play/pause state changed, syncing:', isPlaying ? 'PLAYING' : 'PAUSED');
          prevIsPlaying = isPlaying;
          prevPosition = position;
          lastSyncTime = now;
          syncPlaybackState(isPlaying, position, speed);
        }
        // Also sync on significant position changes (seek, chapter jump)
        else if (Math.abs(position - prevPosition) > 5) {
          prevPosition = position;
          lastSyncTime = now;
          syncPlaybackState(isPlaying, position, speed);
        }
        // FIX: Periodic sync during playback (every 2 seconds)
        // This ensures Android Auto position display stays accurate
        else if (isPlaying && now - lastSyncTime > 2000) {
          lastSyncTime = now;
          prevPosition = position;
          syncPlaybackState(isPlaying, position, speed);
        }

        // Sync metadata when book changes or chapter changes
        const currentChapter = state.currentChapter;
        const chapterTitle = currentChapter?.title || null;

        if (book && (book.id !== prevBookId || chapterTitle !== prevChapterTitle)) {
          prevBookId = book.id;
          prevChapterTitle = chapterTitle;

          const metadata = getBookMetadata(book);
          const title = metadata?.title || 'Unknown Title';
          const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';
          const seriesName = metadata?.seriesName || metadata?.series?.[0]?.name || null;
          const bookProgress = book.userMediaProgress?.progress || 0;

          // Get cover URL - try local first, then server
          const { apiClient } = require('@/core/api');
          const coverUrl = apiClient.getItemCoverUrl(book.id);

          // Use extended metadata if available
          // Note: Kotlin handles seconds-to-ms conversion for duration
          try {
            if (AndroidAutoModule.updateMetadataExtended) {
              const result = AndroidAutoModule.updateMetadataExtended(
                title,
                author,
                duration, // seconds - Kotlin converts to ms
                coverUrl,
                chapterTitle,
                seriesName,
                speed,
                bookProgress
              );
              if (result && typeof result.catch === 'function') {
                result.catch((err: any) => log('Failed to update extended metadata:', err));
              }
            } else {
              // Fallback to basic metadata
              const result = AndroidAutoModule.updateMetadata(
                title,
                author,
                duration, // seconds - Kotlin converts to ms
                coverUrl
              );
              if (result && typeof result.catch === 'function') {
                result.catch((err: any) => log('Failed to update metadata:', err));
              }
            }
          } catch (err) {
            log('Failed to update metadata:', err);
          }

          log('Synced metadata to Android Auto:', { title, author, duration, chapterTitle, seriesName });
        }
      };

      // Immediate sync of current state
      const currentState = usePlayerStore.getState();
      if (currentState.currentBook) {
        log('Syncing initial player state to Android Auto');
        // Force initial sync by resetting prev values
        prevBookId = '';
        prevIsPlaying = !currentState.isPlaying; // Force mismatch
        syncState(currentState);
      }

      // Subscribe to player state changes
      this.playerStoreUnsubscribe = usePlayerStore.subscribe(syncState);

      // FIX: Set up periodic sync interval (every 2 seconds) for position accuracy
      // The subscription only fires on state changes, but position updates continuously
      this.periodicSyncInterval = setInterval(() => {
        const state = usePlayerStore.getState();
        if (state.isPlaying && state.currentBook) {
          syncState(state);
        }
      }, 2000);

      log('Player state sync set up for Android Auto (with 2s periodic sync)');
    } catch (error) {
      log('Failed to set up player state sync:', error);
    }
  }

  /**
   * Set up CarPlay templates when connected
   */
  private async setupCarPlayTemplates(): Promise<void> {
    if (!this.carPlayModule) return;

    const { TabBarTemplate, ListTemplate, NowPlayingTemplate } = this.carPlayModule;

    // Get initial data
    const sections = await this.getBrowseSections();
    const continueSection = sections.find(s => s.id === 'continue-listening');
    const downloadsSection = sections.find(s => s.id === 'downloads');

    log('Setting up CarPlay templates with:', {
      continueItems: continueSection?.items.length || 0,
      downloadItems: downloadsSection?.items.length || 0,
    });

    // Create Continue Listening tab with data
    this.continueListeningTemplate = new ListTemplate({
      title: 'Continue',
      sections: [{
        header: 'In Progress',
        items: (continueSection?.items || []).map(item => ({
          text: item.title,
          detailText: item.subtitle,
          image: item.imageUrl,
          showsDisclosureIndicator: false,
        })),
      }],
      onItemSelect: async ({ index }: { index: number }) => {
        const currentSections = await this.getBrowseSections();
        const section = currentSections.find(s => s.id === 'continue-listening');
        if (section && section.items[index]) {
          await this.playItem(section.items[index].id);
        }
      },
    });

    // Create Downloads tab with data
    this.downloadsTemplate = new ListTemplate({
      title: 'Downloads',
      sections: [{
        header: 'Offline Books',
        items: (downloadsSection?.items || []).map(item => ({
          text: item.title,
          detailText: item.subtitle,
          image: item.imageUrl,
          showsDisclosureIndicator: false,
        })),
      }],
      onItemSelect: async ({ index }: { index: number }) => {
        const currentSections = await this.getBrowseSections();
        const section = currentSections.find(s => s.id === 'downloads');
        if (section && section.items[index]) {
          await this.playItem(section.items[index].id);
        }
      },
    });

    // Create Tab Bar template (root)
    const tabBarTemplate = new TabBarTemplate({
      title: this.config.appName,
      templates: [
        {
          ...this.continueListeningTemplate,
          tabSystemImageName: 'book.fill',
          tabTitle: 'Continue',
        },
        {
          ...this.downloadsTemplate,
          tabSystemImageName: 'arrow.down.circle.fill',
          tabTitle: 'Downloads',
        },
      ],
    });

    // Set root template
    this.carPlayModule.CarPlay.setRootTemplate(tabBarTemplate);
    log('CarPlay templates set up successfully');
  }

  /**
   * Play a specific chapter in the current book
   * @param chapterId Format: "chapter:{bookId}:{chapterIndex}"
   */
  private async playChapter(chapterId: string): Promise<void> {
    log('Playing chapter:', chapterId);

    try {
      const parts = chapterId.split(':');
      if (parts.length !== 3 || parts[0] !== 'chapter') {
        log('Invalid chapter ID format:', chapterId);
        return;
      }

      const bookId = parts[1];
      const chapterIndex = parseInt(parts[2], 10);

      if (isNaN(chapterIndex)) {
        log('Invalid chapter index:', parts[2]);
        return;
      }

      // PERF: Use pre-imported player store
      const state = usePlayerStore.getState();

      // Verify the book is loaded
      if (!state.currentBook || state.currentBook.id !== bookId) {
        log('Chapter book does not match current book, loading book first');
        // Try to load the book first
        const { useLibraryCache } = await import('@/core/cache/libraryCache');
        const book = useLibraryCache.getState().items.find(i => i.id === bookId);
        if (book) {
          await state.loadBook(book, { autoPlay: false, showPlayer: false });
        } else {
          log('Book not found in library:', bookId);
          return;
        }
      }

      // Jump to the chapter
      await usePlayerStore.getState().jumpToChapter(chapterIndex);
      log('Jumped to chapter', chapterIndex);
    } catch (error) {
      log('Failed to play chapter:', error);
    }
  }

  /**
   * Play a library item (with deduplication to prevent double playback)
   */
  private async playItem(itemId: string): Promise<void> {
    const now = Date.now();

    // Deduplication: Skip if same item requested within debounce window
    if (
      this.lastPlayedItemId === itemId &&
      now - this.lastPlayedTime < AutomotiveService.PLAY_DEBOUNCE_MS
    ) {
      log('Ignoring duplicate play request for:', itemId, '(within debounce window)');
      return;
    }

    // Update deduplication tracking
    this.lastPlayedItemId = itemId;
    this.lastPlayedTime = now;

    log('Playing item:', itemId);

    try {
      const { useLibraryCache } = await import('@/core/cache/libraryCache');
      // PERF: Use pre-imported player store

      const item = useLibraryCache.getState().items.find(i => i.id === itemId);
      if (!item) {
        log('Item not found in library cache:', itemId);
        return;
      }

      await usePlayerStore.getState().loadBook(item, {
        autoPlay: true,
        showPlayer: false, // Don't show phone player when in car
      });

      log('Item started playing:', getBookMetadata(item)?.title);

      // FIX: Force immediate sync to Android Auto after playback starts
      // This ensures the correct resume position is sent to MediaSession
      if (Platform.OS === 'android') {
        setTimeout(() => this.forceAndroidAutoSync(), 500);
      }

      // Also notify callbacks if set
      this.callbacks?.onAction({
        type: 'playItem',
        itemId,
      });
    } catch (error) {
      log('Failed to play item:', error);
    }
  }

  /**
   * Force sync current player state to Android Auto
   * Used after playback starts to ensure correct position is shown
   */
  private async forceAndroidAutoSync(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const { AndroidAutoModule } = NativeModules;
      if (!AndroidAutoModule) return;

      const state = usePlayerStore.getState();
      const book = state.currentBook;
      if (!book) return;

      const metadata = getBookMetadata(book);
      const title = metadata?.title || 'Unknown Title';
      const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';
      const duration = state.duration || 0;
      const position = state.position || 0;
      const speed = state.playbackRate || 1.0;
      const isPlaying = state.isPlaying;

      const { apiClient } = require('@/core/api');
      const coverUrl = apiClient.getItemCoverUrl(book.id);

      log('Forcing Android Auto sync:', { title, position, duration, isPlaying });

      // Update metadata
      try {
        AndroidAutoModule.updateMetadata(title, author, duration, coverUrl);
      } catch (err) {
        log('Failed to force metadata sync:', err);
      }

      // Update playback state with current position
      try {
        AndroidAutoModule.updatePlaybackState(isPlaying, position, speed);
      } catch (err) {
        log('Failed to force playback state sync:', err);
      }
    } catch (error) {
      log('Failed to force Android Auto sync:', error);
    }
  }

  /**
   * Update CarPlay list templates with current data
   */
  private async updateCarPlayLists(): Promise<void> {
    if (!this.carPlayModule || this.connectedPlatform !== 'carplay') return;

    try {
      const sections = await this.getBrowseSections();

      // Update Continue Listening template
      const continueSection = sections.find(s => s.id === 'continue-listening');
      if (this.continueListeningTemplate && continueSection) {
        this.continueListeningTemplate.updateSections([{
          header: 'In Progress',
          items: continueSection.items.map(item => ({
            text: item.title,
            detailText: item.subtitle,
            image: item.imageUrl,
            showsDisclosureIndicator: false,
          })),
        }]);
        log('Updated continue listening with', continueSection.items.length, 'items');
      }

      // Update Downloads template
      const downloadsSection = sections.find(s => s.id === 'downloads');
      if (this.downloadsTemplate && downloadsSection) {
        this.downloadsTemplate.updateSections([{
          header: 'Offline Books',
          items: downloadsSection.items.map(item => ({
            text: item.title,
            detailText: item.subtitle,
            image: item.imageUrl,
            showsDisclosureIndicator: false,
          })),
        }]);
        log('Updated downloads with', downloadsSection.items.length, 'items');
      }
    } catch (error) {
      log('Error updating CarPlay lists:', error);
    }
  }

  /**
   * Set callbacks for automotive events
   */
  setCallbacks(callbacks: AutomotiveCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Set only the action handler without overwriting connection callbacks.
   * This allows updating the action handler independently.
   */
  setActionHandler(handler: AutomotiveCallbacks['onAction']): void {
    if (this.callbacks) {
      this.callbacks.onAction = handler;
    } else {
      // If no callbacks set yet, create with defaults
      this.callbacks = {
        onConnect: () => {},
        onDisconnect: () => {},
        onAction: handler,
      };
    }
  }

  /**
   * Update now playing information for automotive displays
   */
  async updateNowPlaying(nowPlaying: AutomotiveNowPlaying): Promise<void> {
    if (this.connectionState !== 'connected') return;

    // CarPlay Now Playing is automatically handled by MPNowPlayingInfoCenter
    // which is already updated by our audioService/expo-media-control
    // So we don't need to do anything extra here for CarPlay

    // For Android Auto, the MediaSession is also already updated
    log('Now Playing updated for automotive');
  }

  /**
   * Helper to create a BrowseItem from a LibraryItem
   */
  private createBrowseItem(
    item: LibraryItem,
    apiClient: any,
    options?: {
      showProgress?: boolean;
      localCoverPath?: string;
      sequence?: number;
    }
  ): BrowseItem {
    const metadata = getBookMetadata(item);
    const duration = getBookDuration(item);
    const progress = item.userMediaProgress?.progress || 0;
    const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';

    return {
      id: item.id,
      title: metadata?.title || 'Unknown Title',
      subtitle: formatSubtitle(author, duration, options?.showProgress ? progress : undefined),
      imageUrl: options?.localCoverPath || apiClient.getItemCoverUrl(item.id),
      isPlayable: true,
      isBrowsable: false,
      progress: options?.showProgress ? progress : undefined,
      durationMs: Math.round(duration * 1000),
      sequence: options?.sequence,
    };
  }

  /**
   * Get browse sections for library display
   * Streamlined for car use - focused on most useful categories
   * Order: [Last Played if available], Continue Listening, Downloads, Library, Recently Added, Series, Authors
   */
  async getBrowseSections(): Promise<BrowseSection[]> {
    const sections: BrowseSection[] = [];

    try {
      const { useLibraryCache } = await import('@/core/cache/libraryCache');
      const { apiClient } = await import('@/core/api');
      // PERF: Use pre-imported player store

      const libraryItems = useLibraryCache.getState().items;
      const playerState = usePlayerStore.getState();

      // =================================================================
      // LAST PLAYED - Show the current/last book for quick resume
      // =================================================================
      if (playerState.currentBook) {
        const lastPlayedItem = this.createBrowseItem(playerState.currentBook, apiClient, { showProgress: true });

        sections.push({
          id: 'last-played',
          title: 'Last Played',
          items: [lastPlayedItem],
        });
      }

      // =================================================================
      // 1. CONTINUE LISTENING - Books with progress (primary action)
      // =================================================================
      const continueItems = libraryItems
        .filter(item => {
          const progress = item.userMediaProgress?.progress || 0;
          return progress > 0 && progress < 1;
        })
        .sort((a, b) => {
          const aTime = a.userMediaProgress?.lastUpdate || 0;
          const bTime = b.userMediaProgress?.lastUpdate || 0;
          return bTime - aTime;
        })
        .slice(0, this.config.maxListItems)
        .map(item => this.createBrowseItem(item, apiClient, { showProgress: true }));

      if (continueItems.length > 0) {
        sections.push({
          id: 'continue-listening',
          title: 'Continue Listening',
          items: continueItems,
        });
      }

      // =================================================================
      // 2. DOWNLOADS - Offline books (critical for car use)
      // =================================================================
      const { downloadManager } = await import('@/core/services/downloadManager');
      const FileSystem = await import('expo-file-system/legacy');
      const allDownloads = await downloadManager.getAllDownloads();
      const completedDownloads = allDownloads.filter(d => d.status === 'complete');

      const downloadedItems: BrowseItem[] = [];
      for (const download of completedDownloads.slice(0, this.config.maxListItems)) {
        const item = libraryItems.find(i => i.id === download.itemId);
        if (item) {
          const localCoverPath = `${FileSystem.documentDirectory}audiobooks/${item.id}/cover.jpg`;
          downloadedItems.push(this.createBrowseItem(item, apiClient, { localCoverPath }));
        }
      }

      if (downloadedItems.length > 0) {
        sections.push({
          id: 'downloads',
          title: 'Downloads',
          items: downloadedItems,
        });
      }

      // =================================================================
      // 3. LIBRARY - All books alphabetically (simplified name)
      // =================================================================
      const libraryBookItems = [...libraryItems]
        .sort((a, b) => {
          const aTitle = getBookMetadata(a)?.title || '';
          const bTitle = getBookMetadata(b)?.title || '';
          return aTitle.localeCompare(bTitle);
        })
        .slice(0, this.config.maxListItems)
        .map(item => this.createBrowseItem(item, apiClient));

      if (libraryBookItems.length > 0) {
        sections.push({
          id: 'library',
          title: 'Library',
          items: libraryBookItems,
        });
      }

      // =================================================================
      // 4. RECENTLY ADDED - New content discovery
      // =================================================================
      const recentlyAddedItems = [...libraryItems]
        .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
        .slice(0, this.config.maxListItems)
        .map(item => this.createBrowseItem(item, apiClient));

      if (recentlyAddedItems.length > 0) {
        sections.push({
          id: 'recently-added',
          title: 'Recently Added',
          items: recentlyAddedItems,
        });
      }

      // =================================================================
      // 5. SERIES - Hierarchical: Series → Books (useful for sequential listening)
      // =================================================================
      const seriesMap = new Map<string, Array<{ item: LibraryItem; sequence: number }>>();
      for (const item of libraryItems) {
        const metadata = getBookMetadata(item);
        // Check for series info in either format
        const seriesName = metadata?.seriesName || metadata?.series?.[0]?.name;
        const seriesSequence = metadata?.series?.[0]?.sequence || 1;

        if (seriesName) {
          const existing = seriesMap.get(seriesName) || [];
          existing.push({ item, sequence: typeof seriesSequence === 'string' ? parseFloat(seriesSequence) : seriesSequence });
          seriesMap.set(seriesName, existing);
        }
      }

      // Sort series by name and create browse items
      const seriesFolders = Array.from(seriesMap.entries())
        .filter(([_, books]) => books.length > 1) // Only show series with multiple books
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, this.config.maxListItems)
        .map(([seriesName, books]): BrowseItem => {
          // Sort books by sequence within series
          const sortedBooks = books.sort((a, b) => a.sequence - b.sequence);

          return {
            id: `series:${seriesName}`,
            title: seriesName,
            subtitle: `${books.length} book${books.length !== 1 ? 's' : ''}`,
            isPlayable: false,
            isBrowsable: true,
            itemCount: books.length,
            children: sortedBooks.map(({ item, sequence }) => {
              const browseItem = this.createBrowseItem(item, apiClient, { sequence });
              // Override subtitle to show sequence
              const metadata = getBookMetadata(item);
              browseItem.subtitle = `Book ${sequence}${metadata?.authorName ? ` • ${metadata.authorName}` : ''}`;
              return browseItem;
            }),
          };
        });

      if (seriesFolders.length > 0) {
        sections.push({
          id: 'series',
          title: 'Series',
          items: seriesFolders,
          isBrowsableSection: true,
        });
      }

      // =================================================================
      // 6. AUTHORS - Hierarchical: Authors → Books (popular browse method)
      // =================================================================
      const authorMap = new Map<string, LibraryItem[]>();
      for (const item of libraryItems) {
        const metadata = getBookMetadata(item);
        const authorName = metadata?.authorName || metadata?.authors?.[0]?.name;
        if (authorName) {
          const existing = authorMap.get(authorName) || [];
          existing.push(item);
          authorMap.set(authorName, existing);
        }
      }

      // Sort authors by name and create browse items
      const authorFolders = Array.from(authorMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, this.config.maxListItems)
        .map(([authorName, books]): BrowseItem => {
          // Sort books by title within author
          const sortedBooks = books.sort((a, b) => {
            const aTitle = getBookMetadata(a)?.title || '';
            const bTitle = getBookMetadata(b)?.title || '';
            return aTitle.localeCompare(bTitle);
          });

          return {
            id: `author:${authorName}`,
            title: authorName,
            subtitle: `${books.length} book${books.length !== 1 ? 's' : ''}`,
            isPlayable: false,
            isBrowsable: true,
            itemCount: books.length,
            children: sortedBooks.map(item => this.createBrowseItem(item, apiClient)),
          };
        });

      if (authorFolders.length > 0) {
        sections.push({
          id: 'authors',
          title: 'Authors',
          items: authorFolders,
          isBrowsableSection: true,
        });
      }

    } catch (error) {
      log('Error getting browse sections:', error);
    }

    return sections;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): AutomotiveConnectionState {
    return this.connectionState;
  }

  /**
   * Get connected platform
   */
  getConnectedPlatform(): AutomotivePlatform {
    return this.connectedPlatform;
  }

  /**
   * Check if connected to any automotive platform
   */
  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AutomotiveConfig>): void {
    this.config = { ...this.config, ...config };
    log('Config updated');
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Unsubscribe from library cache
    if (this.libraryCacheUnsubscribe) {
      this.libraryCacheUnsubscribe();
      this.libraryCacheUnsubscribe = null;
    }

    // Unsubscribe from player state
    if (this.playerStoreUnsubscribe) {
      this.playerStoreUnsubscribe();
      this.playerStoreUnsubscribe = null;
    }

    // Clear periodic sync interval
    if (this.periodicSyncInterval) {
      clearInterval(this.periodicSyncInterval);
      this.periodicSyncInterval = null;
    }

    // Remove Android Auto event subscription
    if (this.androidAutoSubscription) {
      this.androidAutoSubscription.remove();
      this.androidAutoSubscription = null;
    }

    // Remove native module listeners
    if (Platform.OS === 'android') {
      try {
        const { AndroidAutoModule } = NativeModules;
        if (AndroidAutoModule?.removeListeners) {
          AndroidAutoModule.removeListeners(1);
        }
      } catch (error) {
        log('Error removing Android Auto listeners:', error);
      }
    }

    // Clear template references
    this.continueListeningTemplate = null;
    this.downloadsTemplate = null;

    this.connectionState = 'disconnected';
    this.connectedPlatform = 'none';
    this.isInitialized = false;
    log('Automotive service cleaned up');
  }
}

// Export singleton
export const automotiveService = new AutomotiveService();
