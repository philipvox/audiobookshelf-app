/**
 * src/features/playlists/stores/playlistSettingsStore.ts
 *
 * Re-export shim — store moved to src/shared/stores/playlistSettingsStore.ts
 * Kept for backward compatibility with feature-internal imports.
 */
export {
  usePlaylistSettingsStore,
  useVisiblePlaylistIds,
  usePlaylistOrder,
  useDefaultView,
  type DefaultViewType,
  type BuiltInViewKey,
} from '@/shared/stores/playlistSettingsStore';
