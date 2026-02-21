/**
 * src/core/api/endpoints/playlists.ts
 *
 * Playlists API endpoints — used for per-user "My Library" sync.
 * Playlists are per-user (unlike collections which are shared).
 */

import { apiClient } from '../apiClient';
import { endpoints } from '../endpoints';
import { Playlist } from '@/core/types/library';

/**
 * Playlists API
 */
export const playlistsApi = {
  /**
   * Get all playlists for the current user
   */
  getAll: async (): Promise<Playlist[]> => {
    return apiClient.getPlaylists();
  },

  /**
   * Get a playlist by ID
   */
  getById: async (playlistId: string): Promise<Playlist> => {
    return apiClient.getPlaylist(playlistId);
  },

  /**
   * Create a new playlist
   */
  create: async (data: {
    libraryId: string;
    name: string;
    description?: string;
    items?: { libraryItemId: string }[];
  }): Promise<Playlist> => {
    return apiClient.createPlaylist(data as Partial<Playlist>);
  },

  /**
   * Update a playlist
   */
  update: async (
    playlistId: string,
    data: { name?: string; description?: string }
  ): Promise<Playlist> => {
    return apiClient.updatePlaylist(playlistId, data as Partial<Playlist>);
  },

  /**
   * Delete a playlist
   */
  delete: async (playlistId: string): Promise<void> => {
    return apiClient.deletePlaylist(playlistId);
  },

  /**
   * Batch add items to a playlist.
   * ABS format: { items: [{ libraryItemId: "..." }] }
   */
  batchAdd: async (playlistId: string, libraryItemIds: string[]): Promise<Playlist> => {
    const url = endpoints.playlists.batchAdd(playlistId);
    return apiClient.post<Playlist>(url, {
      items: libraryItemIds.map(id => ({ libraryItemId: id })),
    });
  },

  /**
   * Batch remove items from a playlist.
   * ABS format: { items: [{ libraryItemId: "..." }] }
   */
  batchRemove: async (playlistId: string, libraryItemIds: string[]): Promise<Playlist> => {
    const url = endpoints.playlists.batchRemove(playlistId);
    return apiClient.post<Playlist>(url, {
      items: libraryItemIds.map(id => ({ libraryItemId: id })),
    });
  },
};
