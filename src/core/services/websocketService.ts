/**
 * src/core/services/websocketService.ts
 *
 * WebSocket service for real-time sync with AudiobookShelf server.
 * Uses socket.io-client to connect to the server and receive live updates
 * for progress changes, library updates, and more.
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Event-driven architecture via eventBus
 * - App state-aware connection management
 * - Graceful degradation when offline
 */

import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus } from 'react-native';
import { eventBus } from '../events';
import { authService } from '../auth/authService';

// =============================================================================
// Types
// =============================================================================

interface ProgressUpdatePayload {
  id: string; // libraryItemId
  odId?: string; // episodeId for podcasts
  data: {
    currentTime: number;
    duration: number;
    progress: number;
    isFinished: boolean;
    lastUpdate: number;
  };
}

interface ItemChangePayload {
  id: string; // libraryItemId
  libraryId: string;
}

interface LibraryScanPayload {
  id: string; // libraryId
  added: number;
  updated: number;
  removed: number;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface WebSocketServiceOptions {
  /** Reconnection delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Maximum reconnection delay in ms (default: 30000) */
  maxReconnectDelay?: number;
  /** Maximum reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Disconnect when app goes to background (default: true) */
  disconnectOnBackground?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_OPTIONS: Required<WebSocketServiceOptions> = {
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  maxReconnectAttempts: 10,
  disconnectOnBackground: true,
};

// =============================================================================
// WebSocket Service
// =============================================================================

class WebSocketService {
  private socket: Socket | null = null;
  private options: Required<WebSocketServiceOptions>;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private currentUserId: string | null = null;
  private serverUrl: string | null = null;

  constructor(options: WebSocketServiceOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Get current connection state.
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected.
   */
  isConnected(): boolean {
    return this.state === 'connected' && this.socket?.connected === true;
  }

  /**
   * Connect to the AudiobookShelf server.
   * Automatically fetches auth credentials from storage.
   */
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      console.log('[WebSocket] Already connected or connecting');
      return;
    }

    // Clear any pending reconnect timer to prevent duplicate connections
    this.clearReconnectTimer();

    this.setState('connecting');

    try {
      // Get auth credentials from storage
      const [token, serverUrl, user] = await Promise.all([
        authService.getStoredToken(),
        authService.getStoredServerUrl(),
        authService.getStoredUser(),
      ]);

      if (!token || !serverUrl) {
        console.log('[WebSocket] No auth credentials - cannot connect');
        this.setState('disconnected');
        return;
      }

      this.serverUrl = serverUrl;
      this.currentUserId = user?.id ?? null;

      console.log(`[WebSocket] Connecting to ${serverUrl}...`);

      // Create socket.io connection
      // AudiobookShelf uses the /socket.io path by default
      this.socket = io(serverUrl, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        reconnection: false, // We handle reconnection ourselves
        timeout: 10000,
      });

      this.setupEventHandlers();
      this.setupAppStateListener();
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.setState('disconnected');
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the server.
   */
  disconnect(reason: 'manual' | 'error' | 'network' | 'auth' = 'manual'): void {
    console.log(`[WebSocket] Disconnecting (reason: ${reason})`);

    this.clearReconnectTimer();
    this.reconnectAttempts = 0;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.setState('disconnected');

    eventBus.emit('websocket:disconnected', { reason });
  }

  /**
   * Force reconnect (e.g., after network comes back online).
   */
  async reconnect(): Promise<void> {
    this.disconnect('network');
    this.reconnectAttempts = 0;
    await this.connect();
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      console.log(`[WebSocket] State: ${this.state} -> ${state}`);
      this.state = state;
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      this.setState('connected');
      this.reconnectAttempts = 0;

      eventBus.emit('websocket:connected', {
        serverUrl: this.serverUrl!,
        userId: this.currentUserId ?? 'unknown',
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[WebSocket] Disconnected: ${reason}`);

      // socket.io disconnect reasons:
      // - 'io server disconnect': Server forcefully disconnected
      // - 'io client disconnect': Client called disconnect()
      // - 'ping timeout': Connection timed out
      // - 'transport close': Connection was closed
      // - 'transport error': Connection error

      if (reason === 'io server disconnect') {
        // Server kicked us - might be auth issue
        this.disconnect('auth');
      } else if (reason !== 'io client disconnect') {
        // Unexpected disconnect - try to reconnect
        this.setState('reconnecting');
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error.message);
      this.setState('disconnected');
      this.scheduleReconnect();
    });

    // AudiobookShelf server events
    // See: https://github.com/advplyr/audiobookshelf/blob/master/server/SocketAuthority.js

    // Progress updates from other devices/web UI
    this.socket.on('user_item_progress_updated', (payload: ProgressUpdatePayload) => {
      console.log('[WebSocket] Progress updated:', payload.id);

      eventBus.emit('websocket:progress_updated', {
        libraryItemId: payload.id,
        episodeId: payload.odId,
        currentTime: payload.data.currentTime,
        duration: payload.data.duration,
        progress: payload.data.progress,
        isFinished: payload.data.isFinished,
        lastUpdate: payload.data.lastUpdate,
      });
    });

    // Library item added
    this.socket.on('item_added', (payload: ItemChangePayload) => {
      console.log('[WebSocket] Item added:', payload.id);

      eventBus.emit('websocket:item_added', {
        libraryItemId: payload.id,
        libraryId: payload.libraryId,
      });
    });

    // Library item updated
    this.socket.on('item_updated', (payload: ItemChangePayload) => {
      console.log('[WebSocket] Item updated:', payload.id);

      eventBus.emit('websocket:item_updated', {
        libraryItemId: payload.id,
        libraryId: payload.libraryId,
      });
    });

    // Library item removed
    this.socket.on('item_removed', (payload: ItemChangePayload) => {
      console.log('[WebSocket] Item removed:', payload.id);

      eventBus.emit('websocket:item_removed', {
        libraryItemId: payload.id,
        libraryId: payload.libraryId,
      });
    });

    // Library scan complete
    this.socket.on('scan_complete', (payload: LibraryScanPayload) => {
      console.log('[WebSocket] Library scan complete:', payload.id);

      eventBus.emit('websocket:library_scan_complete', {
        libraryId: payload.id,
        itemsAdded: payload.added,
        itemsUpdated: payload.updated,
      });
    });
  }

  private setupAppStateListener(): void {
    if (!this.options.disconnectOnBackground) return;

    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );
  }

  private handleAppStateChange = (state: AppStateStatus): void => {
    if (state === 'active') {
      // App came to foreground - reconnect if needed
      if (this.state === 'disconnected' && this.serverUrl) {
        console.log('[WebSocket] App foregrounded - reconnecting');
        this.connect();
      }
    } else if (state === 'background' && this.options.disconnectOnBackground) {
      // App went to background - disconnect to save battery
      console.log('[WebSocket] App backgrounded - disconnecting');
      this.disconnect('manual');
    }
  };

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnection attempts reached');
      this.setState('disconnected');
      return;
    }

    this.clearReconnectTimer();

    // Exponential backoff with jitter
    const baseDelay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.options.maxReconnectDelay
    );
    const jitter = Math.random() * 0.3 * baseDelay; // 0-30% jitter
    const delay = baseDelay + jitter;

    console.log(
      `[WebSocket] Scheduling reconnect in ${Math.round(delay)}ms ` +
        `(attempt ${this.reconnectAttempts + 1}/${this.options.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      // Only increment if we're still in a state that needs reconnection
      // (connect() might have been called directly, resetting the state)
      if (this.state === 'disconnected' || this.state === 'reconnecting') {
        this.reconnectAttempts++;
        this.connect();
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const websocketService = new WebSocketService();

// Also export class for testing
export { WebSocketService };
export type { ConnectionState, WebSocketServiceOptions };
