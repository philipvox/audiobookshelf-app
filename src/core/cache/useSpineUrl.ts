/**
 * src/core/cache/useSpineUrl.ts
 *
 * Hook to get spine image URLs with automatic cache busting when library is refreshed.
 * Spine images are pre-generated PNG files stored in ABS metadata folder and served via Caddy proxy.
 *
 * URL pattern: /api/items/{itemId}/spine → metadata/items/{itemId}/spine.png
 */

import { useMemo } from 'react';
import { apiClient } from '@/core/api';
import { useLibraryCache } from './libraryCache';

/**
 * Get a spine image URL with cache busting based on library refresh timestamp
 * @param itemId - The library item ID
 * @param options - Optional thumb for placeholder, or width/height for future resizing
 * @returns Spine URL with cache-busting query parameter, or null if no itemId
 */
export function useSpineUrl(
  itemId: string | undefined,
  options?: { width?: number; height?: number; thumb?: boolean }
): string | null {
  const lastRefreshed = useLibraryCache((state) => state.lastRefreshed);

  return useMemo(() => {
    if (!itemId) return null;

    const baseUrl = apiClient.getItemSpineUrl(itemId, options);

    // If library was refreshed, append timestamp to bust cache
    if (lastRefreshed) {
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}t=${lastRefreshed}`;
    }
    return baseUrl;
  }, [itemId, lastRefreshed, options?.width, options?.height, options?.thumb]);
}

/**
 * Non-hook version for use outside of React components (e.g., prefetching)
 * @param itemId - The library item ID
 * @param options - Optional width/height for future resizing support
 * @returns Spine URL with cache-busting query parameter
 */
export function getSpineUrl(
  itemId: string,
  options?: { width?: number; height?: number }
): string {
  const { lastRefreshed } = useLibraryCache.getState();
  const baseUrl = apiClient.getItemSpineUrl(itemId, options);

  if (lastRefreshed) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}t=${lastRefreshed}`;
  }
  return baseUrl;
}
