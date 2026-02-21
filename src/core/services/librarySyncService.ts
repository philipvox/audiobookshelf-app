/**
 * src/core/services/librarySyncService.ts
 *
 * Syncs "My Library" books and favorite series across devices
 * using ABS playlists as the server-side backing store.
 * Playlists are per-user (unlike collections which are shared).
 *
 * Sync strategy: bidirectional merge.
 * - Both have it: keep.
 * - Server has it, local doesn't, no tombstone: add locally.
 * - Server has it, local tombstoned: remove from server.
 * - Local has it, server doesn't, added after last sync: push to server.
 * - Local has it, server doesn't, added before last sync: server removed it, drop locally.
 */

import { playlistsApi } from '@/core/api/endpoints/playlists';
import { useLibrarySyncStore, Tombstone } from '@/shared/stores/librarySyncStore';
import { useMyLibraryStore } from '@/shared/stores/myLibraryStore';
import { useProgressStore } from '@/core/stores/progressStore';
import { useLibraryCache } from '@/core/cache';
import { syncQueue } from './syncQueue';
import { createLogger } from '@/shared/utils/logger';

const log = createLogger('LibrarySync');

const SERIES_PLAYLIST_NAME = '__sl_favorite_series';

interface MergeResult {
  finalIds: string[];
  toAddToServer: string[];
  toRemoveFromServer: string[];
  removedLocally: string[];
}

/**
 * Bidirectional merge algorithm.
 *
 * - Server has it, local doesn't, no tombstone → add locally (server-side add)
 * - Server has it, local tombstoned it → remove from server
 * - Local has it, server doesn't, added after last sync → push to server (local add)
 * - Local has it, server doesn't, added before last sync → remove locally (server-side removal)
 * - Both have it → keep
 */
/**
 * Get the timestamp when a book was added to library locally.
 * Returns epoch ms or null if unknown.
 */
function getLocalAddedAt(id: string): number | null {
  const progressMap = useProgressStore.getState().progressMap;
  const entry = progressMap.get(id);
  return entry?.addedToLibraryAt ?? null;
}

function bidirectionalMerge(
  localIds: string[],
  serverIds: string[],
  tombstones: Tombstone[],
  lastSyncAt: number | null
): MergeResult {
  const serverSet = new Set(serverIds);
  const tombstoneMap = new Map(tombstones.map(t => [t.id, t.removedAt]));
  const final = new Set<string>();

  const toAddToServer: string[] = [];
  const toRemoveFromServer: string[] = [];
  const removedLocally: string[] = [];

  // Process local books
  for (const id of localIds) {
    if (serverSet.has(id)) {
      // Both have it — keep
      final.add(id);
    } else if (!lastSyncAt) {
      // First sync ever — push local to server
      final.add(id);
      toAddToServer.push(id);
    } else {
      // Local has it but server doesn't.
      // Check if it was added locally after the last sync — if so, it's a local add.
      // Otherwise, the server removed it — drop locally.
      const addedAt = getLocalAddedAt(id);
      if (addedAt && addedAt > lastSyncAt) {
        // Added locally after last sync — push to server
        final.add(id);
        toAddToServer.push(id);
      } else {
        // Server removed it — drop locally
        removedLocally.push(id);
      }
    }
  }

  // Process server books
  for (const id of serverIds) {
    if (tombstoneMap.has(id)) {
      toRemoveFromServer.push(id);
    } else {
      final.add(id);
    }
  }

  return {
    finalIds: [...final],
    toAddToServer,
    toRemoveFromServer,
    removedLocally,
  };
}

class LibrarySyncService {
  private isSyncing = false;

  /**
   * Full bidirectional sync. Called on app startup and pull-to-refresh.
   */
  async fullSync(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      await this.syncBooks();
      await this.syncSeries();

      const syncStore = useLibrarySyncStore.getState();
      syncStore.pruneOldTombstones();
      syncStore.setLastSyncAt(Date.now());

      log.info('Full library sync complete');
    } catch (err) {
      log.warn('Full library sync failed:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync book library IDs with server playlist.
   * Auto-rediscovers playlist if the stored ID is stale.
   */
  private async syncBooks(): Promise<void> {
    const syncStore = useLibrarySyncStore.getState();
    const libraryStore = useMyLibraryStore.getState();
    let playlistId = syncStore.libraryPlaylistId;

    if (!playlistId) return;

    let playlist;
    try {
      playlist = await playlistsApi.getById(playlistId);
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.status === 404 || err?.message === 'Resource not found') {
        log.warn('Stored playlist ID is stale (404), attempting to rediscover...');

        // Try to find the playlist by name
        const allPlaylists = await playlistsApi.getAll();
        const existing = allPlaylists.find(p => p.name === '__sl_my_library');

        if (existing) {
          log.info(`Rediscovered library playlist: ${existing.id}`);
          syncStore.setLibraryPlaylistId(existing.id);
          playlistId = existing.id;
          playlist = existing;
        } else {
          // No playlist found - unlink so user can re-setup
          log.warn('Library playlist not found on server, unlinking');
          syncStore.setLibraryPlaylistId(null);
          return;
        }
      } else {
        throw err;
      }
    }

    const serverBookIds = playlist.items?.map(i => i.libraryItemId) || [];
    const localIds = libraryStore.libraryIds;

    log.info(`Sync merge: ${localIds.length} local, ${serverBookIds.length} server, ${syncStore.bookTombstones.length} tombstones, lastSync=${syncStore.lastSyncAt}`);

    const result = bidirectionalMerge(localIds, serverBookIds, syncStore.bookTombstones, syncStore.lastSyncAt);

    if (result.removedLocally.length > 0) {
      log.info(`Server-side removals detected: ${result.removedLocally.length} books removed locally`);
    }

    // Update local store with merged result
    if (result.finalIds.length !== localIds.length ||
        !result.finalIds.every(id => localIds.includes(id))) {
      useMyLibraryStore.setState({ libraryIds: result.finalIds });
      log.info(`Local library updated: ${localIds.length} -> ${result.finalIds.length} books`);
    }

    // Sync progressStore.librarySet so HomeScreen sees the books
    const progressState = useProgressStore.getState();
    const currentLibrarySet = progressState.librarySet;
    const finalSet = new Set(result.finalIds);
    // Check if sets differ
    if (finalSet.size !== currentLibrarySet.size ||
        result.finalIds.some(id => !currentLibrarySet.has(id))) {
      useProgressStore.setState({
        librarySet: finalSet,
        version: progressState.version + 1,
      });
      log.info(`Progress store librarySet updated: ${currentLibrarySet.size} -> ${finalSet.size}`);

      // Bulk upsert to SQLite in background
      this.bulkAddToSQLiteLibrary(result.finalIds).catch(err => {
        log.warn('Failed to bulk update SQLite library:', err);
      });
    }

    // Remove server-deleted books from SQLite (outside the if block — always run)
    if (result.removedLocally.length > 0) {
      this.bulkRemoveFromSQLiteLibrary(result.removedLocally).catch(err => {
        log.warn('Failed to remove from SQLite library:', err);
      });
    }

    // Use batch endpoints to push deltas to server
    if (result.toAddToServer.length > 0) {
      try {
        await playlistsApi.batchAdd(playlistId, result.toAddToServer);
        log.info(`Server batch/add: +${result.toAddToServer.length}`);
      } catch (err) {
        log.warn('Failed to batch add to server playlist:', err);
      }
    }
    if (result.toRemoveFromServer.length > 0) {
      try {
        await playlistsApi.batchRemove(playlistId, result.toRemoveFromServer);
        log.info(`Server batch/remove: -${result.toRemoveFromServer.length}`);
      } catch (err) {
        log.warn('Failed to batch remove from server playlist:', err);
      }
    }
  }

  /**
   * Sync favorite series names via a special playlist's description field.
   * Auto-rediscovers playlist if the stored ID is stale.
   */
  private async syncSeries(): Promise<void> {
    const syncStore = useLibrarySyncStore.getState();
    const libraryStore = useMyLibraryStore.getState();
    let playlistId = syncStore.seriesPlaylistId;

    // If no playlist ID stored, try to find or create one
    if (!playlistId) {
      // Need a libraryId to create — get it from the library playlist
      const libPlaylistId = syncStore.libraryPlaylistId;
      if (!libPlaylistId) return;
      try {
        const libPlaylist = await playlistsApi.getById(libPlaylistId);
        playlistId = await this.getOrCreateSeriesPlaylist(libPlaylist.libraryId);
      } catch {
        return;
      }
    }

    let playlist;
    try {
      playlist = await playlistsApi.getById(playlistId);
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.status === 404 || err?.message === 'Resource not found') {
        log.warn('Stored series playlist ID is stale (404), attempting to rediscover or recreate...');

        // Try to find the playlist by name
        const allPlaylists = await playlistsApi.getAll();
        const existing = allPlaylists.find(p => p.name === SERIES_PLAYLIST_NAME);

        if (existing) {
          log.info(`Rediscovered series playlist: ${existing.id}`);
          syncStore.setSeriesPlaylistId(existing.id);
          playlistId = existing.id;
          playlist = existing;
        } else {
          // Playlist deleted — recreate it using libraryId from any existing playlist
          const anyPlaylist = allPlaylists[0];
          if (anyPlaylist) {
            log.info('Series playlist deleted, recreating...');
            playlistId = await this.getOrCreateSeriesPlaylist(anyPlaylist.libraryId);
            playlist = await playlistsApi.getById(playlistId);
          } else {
            log.warn('No playlists found, cannot recreate series playlist');
            syncStore.setSeriesPlaylistId(null);
            return;
          }
        }
      } else {
        throw err;
      }
    }

    // Parse series names from description
    let serverSeriesNames: string[] = [];
    try {
      if (playlist.description) {
        const parsed = JSON.parse(playlist.description);
        serverSeriesNames = parsed.seriesNames || [];
      }
    } catch {
      // Description isn't valid JSON, treat as empty
    }

    const localNames = libraryStore.favoriteSeriesNames;
    const tombstones = syncStore.seriesTombstones;

    const result = bidirectionalMerge(localNames, serverSeriesNames, tombstones, syncStore.lastSyncAt);

    // Update local store
    if (result.finalIds.length !== localNames.length ||
        !result.finalIds.every(name => localNames.includes(name))) {
      useMyLibraryStore.setState({ favoriteSeriesNames: result.finalIds });
      log.info(`Local series updated: ${localNames.length} -> ${result.finalIds.length} series`);
    }

    // Update server if changed
    if (result.toAddToServer.length > 0 || result.toRemoveFromServer.length > 0) {
      const description = JSON.stringify({ seriesNames: result.finalIds });
      await playlistsApi.update(playlistId, { description });
      log.info(`Server series updated: +${result.toAddToServer.length}, -${result.toRemoveFromServer.length}`);
    }
  }

  /**
   * Push a single book change to server immediately (or queue if offline).
   */
  async pushBookChange(bookId: string, action: 'add' | 'remove'): Promise<void> {
    const playlistId = useLibrarySyncStore.getState().libraryPlaylistId;
    log.info(`pushBookChange: ${action} ${bookId}, playlistId=${playlistId}`);
    if (!playlistId) {
      log.warn('pushBookChange: no playlistId linked, skipping');
      return;
    }

    const syncAction = action === 'add' ? 'add_to_playlist' : 'remove_from_playlist';
    await syncQueue.enqueue(syncAction, { playlistId, itemId: bookId });
    log.info(`pushBookChange: enqueued ${syncAction}`);
  }

  /**
   * Push a series change to server immediately (or queue if offline).
   */
  async pushSeriesChange(seriesName: string, action: 'add' | 'remove'): Promise<void> {
    let playlistId = useLibrarySyncStore.getState().seriesPlaylistId;

    // Auto-create series playlist if missing
    if (!playlistId) {
      const libPlaylistId = useLibrarySyncStore.getState().libraryPlaylistId;
      if (!libPlaylistId) return;
      try {
        const libPlaylist = await playlistsApi.getById(libPlaylistId);
        playlistId = await this.getOrCreateSeriesPlaylist(libPlaylist.libraryId);
      } catch {
        log.warn('pushSeriesChange: could not auto-create series playlist');
        return;
      }
    }

    // Update the description field with series names list
    const libraryStore = useMyLibraryStore.getState();
    const description = JSON.stringify({ seriesNames: libraryStore.favoriteSeriesNames });
    await syncQueue.enqueue('playlist_update_series', { playlistId, description });

    // Add/remove a representative book for this series in the playlist.
    // Only one book per series is needed — the My Series view pulls all books
    // from the library cache, not from the playlist items.
    const seriesInfo = useLibraryCache.getState().getSeries(seriesName);
    if (seriesInfo && seriesInfo.books.length > 0) {
      if (action === 'add') {
        // Add just the first book as a representative
        const firstBookId = seriesInfo.books[0].id;
        log.info(`pushSeriesChange: add 1 representative book for series "${seriesName}"`);
        await syncQueue.enqueue('add_to_playlist', { playlistId, itemId: firstBookId });
      } else {
        // Remove all books that may have been added (handles legacy full-add)
        const bookIds = seriesInfo.books.map(b => b.id);
        log.info(`pushSeriesChange: remove ${bookIds.length} books for series "${seriesName}"`);
        for (const itemId of bookIds) {
          await syncQueue.enqueue('remove_from_playlist', { playlistId, itemId });
        }
      }
    }
  }

  /**
   * Find or create the series playlist for syncing favorite series.
   */
  async getOrCreateSeriesPlaylist(libraryId: string): Promise<string> {
    const syncStore = useLibrarySyncStore.getState();

    // Already linked?
    if (syncStore.seriesPlaylistId) {
      try {
        await playlistsApi.getById(syncStore.seriesPlaylistId);
        return syncStore.seriesPlaylistId;
      } catch {
        // Doesn't exist anymore, recreate
      }
    }

    // Check if one already exists
    const playlists = await playlistsApi.getAll();
    const existing = playlists.find(p => p.name === SERIES_PLAYLIST_NAME);
    if (existing) {
      syncStore.setSeriesPlaylistId(existing.id);
      return existing.id;
    }

    // Create a new playlist for series sync
    const localNames = useMyLibraryStore.getState().favoriteSeriesNames;
    const newPlaylist = await playlistsApi.create({
      libraryId,
      name: SERIES_PLAYLIST_NAME,
      description: JSON.stringify({ seriesNames: localNames }),
    });

    syncStore.setSeriesPlaylistId(newPlaylist.id);
    return newPlaylist.id;
  }

  /**
   * Reset & Pull: clear all local library data and tombstones, then pull from server.
   * Auto-rediscovers playlist if the stored ID is stale.
   */
  async resetAndPull(): Promise<number> {
    const syncStore = useLibrarySyncStore.getState();
    let playlistId = syncStore.libraryPlaylistId;
    if (!playlistId) throw new Error('No playlist linked');

    // Clear all tombstones
    useLibrarySyncStore.setState({ bookTombstones: [], seriesTombstones: [] });

    // Try to fetch the playlist, auto-rediscover if 404
    let playlist;
    try {
      playlist = await playlistsApi.getById(playlistId);
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.status === 404 || err?.message === 'Resource not found') {
        log.warn('Stored playlist ID is stale (404), attempting to rediscover...');

        // Try to find the playlist by name
        const allPlaylists = await playlistsApi.getAll();
        const existing = allPlaylists.find(p => p.name === '__sl_my_library');

        if (existing) {
          log.info(`Rediscovered playlist: ${existing.id}`);
          syncStore.setLibraryPlaylistId(existing.id);
          playlistId = existing.id;
          playlist = existing;
        } else {
          // No playlist found - unlink and throw helpful error
          syncStore.setLibraryPlaylistId(null);
          throw new Error('Playlist not found on server. Please re-enable Library Sync.');
        }
      } else {
        throw err;
      }
    }

    const serverBookIds = playlist.items?.map(i => i.libraryItemId) || [];

    // Replace local library with server state
    useMyLibraryStore.setState({ libraryIds: serverBookIds });

    // Update progressStore
    const state = useProgressStore.getState();
    const newMap = new Map(state.progressMap);
    // Clear all isInLibrary flags first
    newMap.forEach((data, bookId) => {
      newMap.set(bookId, { ...data, isInLibrary: false });
    });
    // Set isInLibrary for server books
    const now = Date.now();
    for (const bookId of serverBookIds) {
      const existing = newMap.get(bookId);
      newMap.set(bookId, {
        bookId,
        currentTime: existing?.currentTime ?? 0,
        duration: existing?.duration ?? 0,
        progress: existing?.progress ?? 0,
        lastPlayedAt: existing?.lastPlayedAt ?? now,
        isFinished: existing?.isFinished ?? false,
        isInLibrary: true,
        addedToLibraryAt: existing?.addedToLibraryAt ?? now,
      });
    }
    useProgressStore.setState({
      librarySet: new Set(serverBookIds),
      progressMap: newMap,
      version: state.version + 1,
    });

    // Update SQLite
    await this.bulkResetSQLiteLibrary(serverBookIds);

    syncStore.setLastSyncAt(Date.now());
    log.info(`Reset & Pull complete: ${serverBookIds.length} books from server`);
    return serverBookIds.length;
  }

  /**
   * Clear all library flags in SQLite, then set only the given book IDs.
   * Uses sqliteCache.resetLibraryBooks() to respect the transaction lock.
   */
  private async bulkResetSQLiteLibrary(bookIds: string[]): Promise<void> {
    const { sqliteCache } = await import('./sqliteCache');
    await sqliteCache.resetLibraryBooks(bookIds);
    log.info(`Reset SQLite library to ${bookIds.length} books`);
  }

  /**
   * Bulk add book IDs to SQLite library (upsert is_in_library = 1).
   * Uses sqliteCache.bulkSetLibraryBooks() to respect the transaction lock.
   */
  private async bulkAddToSQLiteLibrary(bookIds: string[]): Promise<void> {
    const { sqliteCache } = await import('./sqliteCache');
    await sqliteCache.bulkSetLibraryBooks(bookIds, true);
    log.info(`Bulk added ${bookIds.length} books to SQLite library`);
  }

  /**
   * Bulk remove book IDs from SQLite library (set is_in_library = 0).
   * Uses sqliteCache.bulkSetLibraryBooks() to respect the transaction lock.
   */
  private async bulkRemoveFromSQLiteLibrary(bookIds: string[]): Promise<void> {
    const { sqliteCache } = await import('./sqliteCache');
    await sqliteCache.bulkSetLibraryBooks(bookIds, false);
    log.info(`Bulk removed ${bookIds.length} books from SQLite library`);
  }
}

export const librarySyncService = new LibrarySyncService();
