/**
 * src/features/playlists/hooks/usePlaylists.ts
 *
 * React Query hook for fetching user playlists.
 */

import { useQuery } from '@tanstack/react-query';
import { playlistsApi } from '@/core/api/endpoints/playlists';
import { Playlist } from '@/core/types/library';

/**
 * Fetch all playlists for the current user
 */
export function usePlaylists() {
  return useQuery<Playlist[], Error>({
    queryKey: ['playlists'],
    queryFn: () => playlistsApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single playlist by ID
 */
export function usePlaylist(playlistId: string | undefined) {
  return useQuery<Playlist, Error>({
    queryKey: ['playlist', playlistId],
    queryFn: () => playlistsApi.getById(playlistId!),
    enabled: !!playlistId,
    staleTime: 5 * 60 * 1000,
  });
}
