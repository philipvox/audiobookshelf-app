/**
 * Download Completion Listener Utility
 *
 * Handles seamless switch from streaming to local playback when download completes.
 * Extracted from playerStore.ts for modularity.
 */

import { LibraryItem } from '@/core/types';
import { clearSmartRewindState } from './smartRewind';
import { useSeekingStore } from '../stores/seekingStore';

// =============================================================================
// MODULE-LEVEL STATE
// =============================================================================

let downloadListenerUnsubscribe: (() => void) | null = null;
let currentStreamingBookId: string | null = null;

// =============================================================================
// TYPES
// =============================================================================

export interface PlayerStateSnapshot {
  currentBook: LibraryItem | null;
  position: number;
  isPlaying: boolean;
  isLoading: boolean;
  isPlayerVisible: boolean;
}

export interface LoadBookOptions {
  startPosition?: number;
  autoPlay?: boolean;
  showPlayer?: boolean;
}

// =============================================================================
// DOWNLOAD LISTENER FUNCTIONS
// =============================================================================

/**
 * Sets up a listener for download completion of the currently streaming book.
 * When the download completes, automatically switches to local playback.
 *
 * @param bookId - The book ID to monitor for download completion
 * @param getState - Function to get current player state
 * @param loadBook - Function to reload the book with local files
 * @param audioService - Audio service for getting fresh position
 * @param log - Logging function
 * @param logError - Error logging function
 */
export async function setupDownloadCompletionListener(
  bookId: string,
  getState: () => PlayerStateSnapshot,
  loadBook: (book: LibraryItem, options: LoadBookOptions) => Promise<void>,
  audioService: { getPosition: () => Promise<number> },
  log: (msg: string) => void = () => {},
  logError: (msg: string, ...args: any[]) => void = () => {}
): Promise<void> {
  // Clean up any existing listener
  cleanupDownloadCompletionListener();

  currentStreamingBookId = bookId;

  const { downloadManager } = await import('@/core/services/downloadManager');

  downloadListenerUnsubscribe = downloadManager.subscribe((tasks) => {
    // Find the task for our currently streaming book
    const task = tasks.find((t) => t.itemId === currentStreamingBookId);

    if (task?.status === 'complete' && currentStreamingBookId) {
      log(`[DOWNLOAD] Completed for streaming book: ${currentStreamingBookId}`);
      log('[DOWNLOAD] Switching to local playback...');

      // Get current state
      const state = getState();
      const { currentBook, position, isPlaying, isLoading } = state;
      log(`[DOWNLOAD] Current state: currentBook=${currentBook?.id}, isPlaying=${isPlaying}, isLoading=${isLoading}`);

      // Verify we're still playing the same book
      if (currentBook?.id === currentStreamingBookId) {
        // Clear the streaming book tracker
        const bookToReload = currentBook;
        const savedPosition = position;
        const wasPlaying = isPlaying;
        currentStreamingBookId = null;

        // Clean up the listener since we're about to reload
        if (downloadListenerUnsubscribe) {
          downloadListenerUnsubscribe();
          downloadListenerUnsubscribe = null;
        }

        // Capture the book ID for cancellation check
        const capturedBookId = bookToReload.id;

        // Helper to wait for safe state (not seeking/loading)
        const waitForSafeState = async (maxWaitMs: number): Promise<boolean> => {
          const startTime = Date.now();
          while (Date.now() - startTime < maxWaitMs) {
            const currentState = getState();
            // Abort if book changed
            if (currentState.currentBook?.id !== capturedBookId) {
              return false;
            }
            // Wait if seeking or loading
            const isSeeking = useSeekingStore.getState().isSeeking;
            if (isSeeking || currentState.isLoading) {
              log(`[DOWNLOAD] Waiting for safe state (isSeeking=${isSeeking}, isLoading=${currentState.isLoading})`);
              await new Promise(resolve => setTimeout(resolve, 200));
              continue;
            }
            return true;
          }
          return false; // Timeout
        };

        // Use longer delay for network stability (especially mobile data)
        setTimeout(async () => {
          try {
            // Wait for user to finish seeking/loading (max 5 seconds)
            const isSafe = await waitForSafeState(5000);
            if (!isSafe) {
              log(`[DOWNLOAD] Aborting switch - state not safe or book changed`);
              return;
            }

            // RACE CONDITION FIX: Final check if user switched books
            const currentState = getState();
            if (currentState.currentBook?.id !== capturedBookId) {
              log(`[DOWNLOAD] Book changed during reload delay (${capturedBookId} -> ${currentState.currentBook?.id}), aborting switch`);
              return;
            }

            // Get fresh position from audio service (more accurate than saved)
            const freshPosition = await audioService.getPosition();
            const positionToUse = Math.abs(freshPosition - savedPosition) < 5 ? freshPosition : savedPosition;
            log(`Reloading book at position ${positionToUse.toFixed(1)}s to use local files (saved=${savedPosition.toFixed(1)}s, fresh=${freshPosition.toFixed(1)}s)`);

            // Show a toast notification
            try {
              const ToastModule = await import('react-native-toast-message');
              ToastModule.default.show({
                type: 'success',
                text1: 'Download Complete',
                text2: 'Switched to offline playback',
                position: 'bottom',
                visibilityTime: 2000,
              });
            } catch {
              // Toast not available
            }

            // Clear smart rewind state to prevent interference
            await clearSmartRewindState();

            // Reload the book from local files
            await loadBook(bookToReload, {
              startPosition: positionToUse,
              autoPlay: wasPlaying,
              showPlayer: currentState.isPlayerVisible,
            });
          } catch (err) {
            logError('Failed to switch to local playback:', err);
          }
        }, 1500); // Increased from 500ms to 1500ms for mobile data stability
      }
    }
  });

  log(`Download completion listener set up for book: ${bookId}`);
}

/**
 * Cleans up the download completion listener.
 */
export function cleanupDownloadCompletionListener(): void {
  if (downloadListenerUnsubscribe) {
    downloadListenerUnsubscribe();
    downloadListenerUnsubscribe = null;
  }
  currentStreamingBookId = null;
}

/**
 * Get current streaming book ID (for debugging)
 */
export function getCurrentStreamingBookId(): string | null {
  return currentStreamingBookId;
}
