/**
 * src/features/player/services/preloadManager.ts
 *
 * Pre-loads audio for "Continue Listening" items.
 * When these items are visible on the home screen, we preload the first
 * few seconds so playback starts instantly when the user taps.
 */

import { createAudioPlayer, AudioPlayer } from 'expo-audio';

interface PreloadedItem {
  player: AudioPlayer;
  bookId: string;
  url: string;
  createdAt: number;
}

class PreloadManager {
  private preloadedItems: Map<string, PreloadedItem> = new Map();
  private readonly MAX_PRELOADED = 2; // Limit memory usage
  private readonly PRELOAD_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Preload audio for a book (call when Continue Listening item becomes visible)
   */
  async preloadBook(bookId: string, streamUrl: string): Promise<void> {
    // Skip if already preloaded
    if (this.preloadedItems.has(bookId)) return;

    // Evict oldest if at capacity
    if (this.preloadedItems.size >= this.MAX_PRELOADED) {
      this.evictOldest();
    }

    try {
      const player = createAudioPlayer({ uri: '' });
      player.replace({ uri: streamUrl });

      this.preloadedItems.set(bookId, {
        player,
        bookId,
        url: streamUrl,
        createdAt: Date.now(),
      });

      console.log(`[PreloadManager] Preloaded audio for book: ${bookId}`);
    } catch (err) {
      console.warn('[PreloadManager] Preload failed:', err);
    }
  }

  /**
   * Check if a book has been preloaded
   */
  hasPreloaded(bookId: string): boolean {
    const item = this.preloadedItems.get(bookId);
    if (!item) return false;

    // Check if expired
    if (Date.now() - item.createdAt > this.PRELOAD_TTL) {
      this.removeItem(bookId);
      return false;
    }

    return true;
  }

  /**
   * Get and transfer ownership of a preloaded player.
   * After calling this, the player is removed from the manager.
   */
  transferPlayer(bookId: string): AudioPlayer | null {
    const item = this.preloadedItems.get(bookId);
    if (!item) return null;

    // Remove from manager (caller now owns the player)
    this.preloadedItems.delete(bookId);
    console.log(`[PreloadManager] Transferred player for book: ${bookId}`);
    return item.player;
  }

  /**
   * Get the stream URL for a preloaded book
   */
  getPreloadedUrl(bookId: string): string | null {
    return this.preloadedItems.get(bookId)?.url || null;
  }

  /**
   * Remove and cleanup a preloaded item
   */
  private removeItem(bookId: string): void {
    const item = this.preloadedItems.get(bookId);
    if (item) {
      try {
        item.player.remove();
      } catch {
        // Ignore removal errors
      }
      this.preloadedItems.delete(bookId);
    }
  }

  /**
   * Evict the oldest preloaded item
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, item] of this.preloadedItems) {
      if (item.createdAt < oldestTime) {
        oldestTime = item.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      console.log(`[PreloadManager] Evicting oldest: ${oldestKey}`);
      this.removeItem(oldestKey);
    }
  }

  /**
   * Clean up all preloaded items
   */
  cleanup(): void {
    for (const [bookId] of this.preloadedItems) {
      this.removeItem(bookId);
    }
    this.preloadedItems.clear();
  }

  /**
   * Clean up expired items (call periodically)
   */
  cleanupExpired(): void {
    const now = Date.now();
    for (const [bookId, item] of this.preloadedItems) {
      if (now - item.createdAt > this.PRELOAD_TTL) {
        this.removeItem(bookId);
      }
    }
  }
}

export const preloadManager = new PreloadManager();
