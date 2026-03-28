/**
 * src/core/api/endpoints.ts
 * 
 * Centralized mapping of all AudiobookShelf API endpoints.
 * This provides a single source of truth for API URLs.
 */

/**
 * API endpoint paths
 */
export const endpoints = {
  // Server Status
  server: {
    status: '/api/status',
  },

  // Authentication
  auth: {
    login: '/login',
    logout: '/logout',
  },

  // User
  user: {
    me: '/api/me',
    progress: (progressId: string) => `/api/me/progress/${progressId}`,
    itemsInProgress: '/api/me/items-in-progress',
  },

  // Libraries
  libraries: {
    list: '/api/libraries',
    get: (libraryId: string) => `/api/libraries/${libraryId}`,
    items: (libraryId: string) => `/api/libraries/${libraryId}/items`,
    search: (libraryId: string) => `/api/libraries/${libraryId}/search`,
    series: (libraryId: string) => `/api/libraries/${libraryId}/series`,
    authors: (libraryId: string) => `/api/libraries/${libraryId}/authors`,
    filterData: (libraryId: string) => `/api/libraries/${libraryId}/filterdata`,
  },

  // Items
  items: {
    get: (itemId: string) => `/api/items/${itemId}`,
    cover: (itemId: string) => `/api/items/${itemId}/cover`,
    spine: (itemId: string) => `/api/items/${itemId}/spine`,
  },

  // Spines (image cache)
  spines: {
    manifest: '/api/spines/manifest',
    manifestV2: '/api/spines/manifest/v2',
  },

  // Playback
  playback: {
    session: (libraryItemId: string) => `/api/session/${libraryItemId}`,
    sessionSync: (sessionId: string) => `/api/session/${sessionId}/sync`,
    sessionClose: (sessionId: string) => `/api/session/${sessionId}/close`,
  },

  // Series
  series: {
    get: (seriesId: string) => `/api/series/${seriesId}`,
  },

  // Authors
  authors: {
    get: (authorId: string) => `/api/authors/${authorId}`,
    image: (authorId: string) => `/api/authors/${authorId}/image`,
  },

  // Collections
  collections: {
    list: '/api/collections',
    get: (collectionId: string) => `/api/collections/${collectionId}`,
    create: '/api/collections',
    update: (collectionId: string) => `/api/collections/${collectionId}`,
    delete: (collectionId: string) => `/api/collections/${collectionId}`,
    batchAdd: (collectionId: string) => `/api/collections/${collectionId}/batch/add`,
    batchRemove: (collectionId: string) => `/api/collections/${collectionId}/batch/remove`,
  },

  // Playlists
  playlists: {
    list: '/api/playlists',
    get: (playlistId: string) => `/api/playlists/${playlistId}`,
    create: '/api/playlists',
    update: (playlistId: string) => `/api/playlists/${playlistId}`,
    delete: (playlistId: string) => `/api/playlists/${playlistId}`,
    batchAdd: (playlistId: string) => `/api/playlists/${playlistId}/batch/add`,
    batchRemove: (playlistId: string) => `/api/playlists/${playlistId}/batch/remove`,
  },

  // Search (global)
  search: {
    books: '/api/search/books',
  },
} as const;

/**
 * Helper to build query string from params
 */
export function buildQueryString<T extends Record<string, unknown>>(params?: T): string {
  if (!params) return '';

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}
