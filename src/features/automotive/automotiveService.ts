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

  /**
   * Initialize the automotive service
   */
  async init(config?: Partial<AutomotiveConfig>): Promise<void> {
    if (this.isInitialized) {
      log('Already initialized');
      return;
    }

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

    } catch (error: any) {
      log('CarPlay module not available:', error.message);
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

          // Sync Android Auto browse data
          if (Platform.OS === 'android') {
            this.syncAndroidAutoBrowseData();
          }
        }
      });
      log('Library cache listener set up');
    } catch (error) {
      log('Failed to set up library cache listener:', error);
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
      // Still set up library cache listener so JSON file gets written
      this.setupLibraryCacheListener();
      await this.syncAndroidAutoBrowseData();
      return;
    }

    try {
      // Start listening for commands from native MediaPlaybackService
      await AndroidAutoModule.startListening();
      log('Started listening for Android Auto commands');

      // Set up event listener for commands from native
      const eventEmitter = new NativeEventEmitter(AndroidAutoModule);
      this.androidAutoSubscription = eventEmitter.addListener(
        'onAndroidAutoCommand',
        this.handleAndroidAutoCommand.bind(this)
      );
      log('Android Auto event listener set up');

      // Set up library cache listener for browse data updates
      this.setupLibraryCacheListener();

      // Initial sync of browse data to JSON file
      await this.syncAndroidAutoBrowseData();

      // Subscribe to player state changes for MediaSession sync
      await this.setupPlayerStateSync();

      log('Android Auto initialized successfully');

    } catch (error) {
      log('Error initializing Android Auto:', error);
      // Still try to sync browse data even if event listener fails
      this.setupLibraryCacheListener();
      await this.syncAndroidAutoBrowseData();
    }
  }

  /**
   * Handle commands received from native Android Auto
   */
  private async handleAndroidAutoCommand(event: { command: string; param?: string }): Promise<void> {
    log('Received Android Auto command:', event);

    switch (event.command) {
      case 'playFromMediaId':
        if (event.param) {
          await this.playItem(event.param);
        }
        break;

      case 'play':
        {
          const { usePlayerStore } = await import('@/features/player/stores/playerStore');
          await usePlayerStore.getState().play();
          log('Play command executed');
        }
        break;

      case 'pause':
        {
          const { usePlayerStore } = await import('@/features/player/stores/playerStore');
          await usePlayerStore.getState().pause();
          log('Pause command executed');
        }
        break;

      case 'skipNext':
        {
          const { usePlayerStore } = await import('@/features/player/stores/playerStore');
          await usePlayerStore.getState().nextChapter();
          log('Skip next (next chapter) executed');
        }
        break;

      case 'skipPrevious':
        {
          const { usePlayerStore } = await import('@/features/player/stores/playerStore');
          await usePlayerStore.getState().prevChapter();
          log('Skip previous (previous chapter) executed');
        }
        break;

      case 'fastForward':
        {
          const { usePlayerStore } = await import('@/features/player/stores/playerStore');
          const state = usePlayerStore.getState();
          await state.seekTo(state.position + 30); // Skip forward 30 seconds
          log('Fast forward 30s executed');
        }
        break;

      case 'rewind':
        {
          const { usePlayerStore } = await import('@/features/player/stores/playerStore');
          const state = usePlayerStore.getState();
          await state.seekTo(Math.max(0, state.position - 30)); // Rewind 30 seconds
          log('Rewind 30s executed');
        }
        break;

      case 'seekTo':
        if (event.param) {
          const position = parseInt(event.param, 10);
          if (!isNaN(position)) {
            const { usePlayerStore } = await import('@/features/player/stores/playerStore');
            await usePlayerStore.getState().seekTo(position / 1000); // Convert ms to seconds
          }
        }
        break;

      case 'search':
        if (event.param) {
          await this.handleSearch(event.param);
        }
        break;

      default:
        log('Unknown Android Auto command:', event.command);
    }
  }

  /**
   * Handle voice search from Android Auto
   * Searches library for matching book and plays it
   */
  private async handleSearch(query: string): Promise<void> {
    log('Handling search:', query);

    try {
      const { useLibraryCache } = await import('@/core/cache/libraryCache');
      const { usePlayerStore } = await import('@/features/player/stores/playerStore');

      const libraryItems = useLibraryCache.getState().items;
      const queryLower = query.toLowerCase().trim();

      // Search for matching book by title or author
      const match = libraryItems.find(item => {
        const metadata = item.media?.metadata as any;
        const title = (metadata?.title || '').toLowerCase();
        const author = (metadata?.authorName || metadata?.authors?.[0]?.name || '').toLowerCase();
        const series = (metadata?.seriesName || '').toLowerCase();

        return (
          title.includes(queryLower) ||
          author.includes(queryLower) ||
          series.includes(queryLower)
        );
      });

      if (match) {
        log('Found match for search:', match.media?.metadata?.title);
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

  /**
   * Set up player state synchronization for Android Auto MediaSession
   * This ensures the Now Playing screen shows correct info
   */
  private async setupPlayerStateSync(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const { usePlayerStore } = await import('@/features/player/stores/playerStore');
      const { AndroidAutoModule } = NativeModules;

      if (!AndroidAutoModule) {
        log('AndroidAutoModule not available for player sync');
        return;
      }

      // Unsubscribe from previous listener if any
      if (this.playerStoreUnsubscribe) {
        this.playerStoreUnsubscribe();
      }

      // Track previous values to detect changes
      let prevIsPlaying = false;
      let prevPosition = 0;
      let prevBookId = '';

      // Helper to sync current state to Android Auto
      const syncState = (state: any) => {
        const isPlaying = state.isPlaying;
        const position = state.position;
        const book = state.currentBook;
        const speed = state.playbackRate || 1.0;
        const duration = state.duration || 0;

        // Always sync playback state on play/pause changes or significant position changes
        if (isPlaying !== prevIsPlaying || Math.abs(position - prevPosition) > 5) {
          prevIsPlaying = isPlaying;
          prevPosition = position;

          // Convert to milliseconds for native
          AndroidAutoModule.updatePlaybackState(
            isPlaying,
            position * 1000, // Convert to ms
            speed
          ).catch((err: any) => log('Failed to update playback state:', err));
        }

        // Sync metadata when book changes
        if (book && book.id !== prevBookId) {
          prevBookId = book.id;
          const metadata = book.media?.metadata as any;
          const title = metadata?.title || 'Unknown Title';
          const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';

          // Get cover URL - try local first, then server
          const { apiClient } = require('@/core/api');
          const coverUrl = apiClient.getItemCoverUrl(book.id);

          AndroidAutoModule.updateMetadata(
            title,
            author,
            duration * 1000, // Convert to ms
            coverUrl
          ).catch((err: any) => log('Failed to update metadata:', err));

          log('Synced metadata to Android Auto:', { title, author, duration });
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

      log('Player state sync set up for Android Auto');
    } catch (error) {
      log('Failed to set up player state sync:', error);
    }
  }

  /**
   * Sync browse data to native Android for Android Auto
   */
  private async syncAndroidAutoBrowseData(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const { updateAndroidAutoBrowseData } = await import('./androidAutoBridge');
      const sections = await this.getBrowseSections();
      await updateAndroidAutoBrowseData(sections);
      log('Android Auto browse data synced');
    } catch (error) {
      log('Failed to sync Android Auto browse data:', error);
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
      const { usePlayerStore } = await import('@/features/player/stores/playerStore');

      const item = useLibraryCache.getState().items.find(i => i.id === itemId);
      if (!item) {
        log('Item not found in library cache:', itemId);
        return;
      }

      await usePlayerStore.getState().loadBook(item, {
        autoPlay: true,
        showPlayer: false, // Don't show phone player when in car
      });

      log('Item started playing:', item.media?.metadata?.title);

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
   * Get browse sections for library display
   */
  async getBrowseSections(): Promise<BrowseSection[]> {
    const sections: BrowseSection[] = [];

    try {
      // Get continue listening items
      const { useLibraryCache } = await import('@/core/cache/libraryCache');
      const { apiClient } = await import('@/core/api');

      const libraryItems = useLibraryCache.getState().items;

      // Filter for items with progress
      const continueItems = libraryItems
        .filter(item => {
          const progress = (item as any).userMediaProgress?.progress || 0;
          return progress > 0 && progress < 1;
        })
        .sort((a, b) => {
          const aTime = (a as any).userMediaProgress?.lastUpdate || 0;
          const bTime = (b as any).userMediaProgress?.lastUpdate || 0;
          return bTime - aTime;
        })
        .slice(0, this.config.maxListItems)
        .map((item): BrowseItem => {
          const metadata = item.media?.metadata as any;
          return {
            id: item.id,
            title: metadata?.title || 'Unknown Title',
            subtitle: metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author',
            imageUrl: apiClient.getItemCoverUrl(item.id),
            isPlayable: true,
            isBrowsable: false,
            progress: (item as any).userMediaProgress?.progress || 0,
          };
        });

      if (continueItems.length > 0) {
        sections.push({
          id: 'continue-listening',
          title: 'Continue Listening',
          items: continueItems,
        });
      }

      // Get downloaded items
      const { downloadManager } = await import('@/core/services/downloadManager');
      const FileSystem = await import('expo-file-system/legacy');
      const allDownloads = await downloadManager.getAllDownloads();
      const completedDownloads = allDownloads.filter(d => d.status === 'complete');

      // Cross-reference with library items to get metadata
      const downloadedItems: BrowseItem[] = [];
      for (const download of completedDownloads.slice(0, this.config.maxListItems)) {
        const item = libraryItems.find(i => i.id === download.itemId);
        if (item) {
          const metadata = item.media?.metadata as any;
          // Use local cover path for downloaded items (works better with Android Auto)
          const localCoverPath = `${FileSystem.documentDirectory}audiobooks/${item.id}/cover.jpg`;
          downloadedItems.push({
            id: item.id,
            title: metadata?.title || 'Unknown Title',
            subtitle: metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author',
            imageUrl: localCoverPath, // Local file URI for downloaded items
            isPlayable: true,
            isBrowsable: false,
          });
        }
      }

      if (downloadedItems.length > 0) {
        sections.push({
          id: 'downloads',
          title: 'Downloads',
          items: downloadedItems,
        });
      }

      // Recently Added section - books sorted by addedAt
      const recentlyAddedItems = [...libraryItems]
        .sort((a, b) => {
          const aAdded = (a as any).addedAt || 0;
          const bAdded = (b as any).addedAt || 0;
          return bAdded - aAdded;
        })
        .slice(0, this.config.maxListItems)
        .map((item): BrowseItem => {
          const metadata = item.media?.metadata as any;
          return {
            id: item.id,
            title: metadata?.title || 'Unknown Title',
            subtitle: metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author',
            imageUrl: apiClient.getItemCoverUrl(item.id),
            isPlayable: true,
            isBrowsable: false,
          };
        });

      if (recentlyAddedItems.length > 0) {
        sections.push({
          id: 'recently-added',
          title: 'Recently Added',
          items: recentlyAddedItems,
        });
      }

      // Library section - all books alphabetically
      const libraryBookItems = [...libraryItems]
        .sort((a, b) => {
          const aTitle = (a.media?.metadata as any)?.title || '';
          const bTitle = (b.media?.metadata as any)?.title || '';
          return aTitle.localeCompare(bTitle);
        })
        .slice(0, this.config.maxListItems)
        .map((item): BrowseItem => {
          const metadata = item.media?.metadata as any;
          return {
            id: item.id,
            title: metadata?.title || 'Unknown Title',
            subtitle: metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author',
            imageUrl: apiClient.getItemCoverUrl(item.id),
            isPlayable: true,
            isBrowsable: false,
          };
        });

      if (libraryBookItems.length > 0) {
        sections.push({
          id: 'library',
          title: 'Library',
          items: libraryBookItems,
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

    // Remove Android Auto event subscription
    if (this.androidAutoSubscription) {
      this.androidAutoSubscription.remove();
      this.androidAutoSubscription = null;
    }

    // Stop listening on native module
    if (Platform.OS === 'android') {
      try {
        const { AndroidAutoModule } = NativeModules;
        if (AndroidAutoModule) {
          await AndroidAutoModule.stopListening();
        }
      } catch (error) {
        log('Error stopping Android Auto listener:', error);
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
