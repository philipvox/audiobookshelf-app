/**
 * src/features/home/stores/spineCache.ts
 *
 * Centralized cache for pre-calculated book spine dimensions.
 * Single source of truth for all spine-related calculations.
 *
 * Benefits:
 * - Dimensions calculated once per book, not on every render
 * - Consistent dimensions across all components
 * - Reduces CPU usage in lists with many books
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Image } from 'expo-image';
import { LibraryItem, BookMedia, BookMetadata } from '@/core/types';
import { sqliteCache } from '@/core/services/sqliteCache';
import { createLogger } from '@/shared/utils/logger';

const log = createLogger('SpineCache');

// Dimension cache TTL: 24 hours
// Ensures stale dimensions are refreshed if server spine images change
const DIMENSION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// MIGRATED: Now using new spine system via adapter
import { calculateBookDimensions, hashString, getSpineColorForGenres, generateSpineComposition, SpineComposition, getTypographyForGenres } from '../utils/spine/adapter';
// Template system - spines use this when available, so cache must too
import { shouldUseTemplates, applyTemplateConfig } from '../utils/spine/templateAdapter';
// getPlatformFont resolves custom fonts to available fonts (same as BookSpineVertical)
import { getPlatformFont } from '../utils/spineCalculations';

// =============================================================================
// TYPE GUARDS
// =============================================================================

function isBookMedia(media: LibraryItem['media'] | undefined): media is BookMedia {
  return media !== undefined && 'metadata' in media && 'duration' in media;
}

function getBookMetadata(item: LibraryItem | null | undefined): BookMetadata | null {
  if (!item || !isBookMedia(item.media)) return null;
  return item.media.metadata;
}

function getBookDuration(item: LibraryItem | null | undefined): number {
  if (!item || !isBookMedia(item.media)) return 0;
  return item.media.duration || 0;
}


// =============================================================================
// TYPES
// =============================================================================

export interface CachedSpineData {
  /** Book ID */
  id: string;
  /** Base width in pixels (unscaled) */
  baseWidth: number;
  /** Base height in pixels (unscaled) */
  baseHeight: number;
  /** Hash of book ID for deterministic randomization */
  hash: number;
  /** Genres for styling */
  genres: string[];
  /** Tags for styling */
  tags: string[];
  /** Duration in seconds */
  duration: number;
  /** Series name if part of series */
  seriesName?: string;
  /** Title for display */
  title: string;
  /** Author for display */
  author: string;
  /** User progress (0-1) */
  progress: number;
  /** Background color for spine (genre-based) */
  backgroundColor: string;
  /** Text color for spine (contrast-based) */
  textColor: string;
  /** Pre-computed spine composition (title orientation, author treatment, etc.) */
  composition?: SpineComposition;
  /** Pre-computed typography (font family, weight, transform, etc.) - ensures consistency across all screens */
  typography?: {
    fontFamily: string;
    fontWeight: string;
    fontStyle: string;
    titleTransform: string;
    authorTransform: string;
    authorPosition: string;
    authorBox: string;
    letterSpacing: number;
    titleLetterSpacing: number;
    authorLetterSpacing: number;
    authorOrientationBias: string;
    contrast: string;
    titleWeight: string;
    authorWeight: string;
    authorAbbreviation: string;
  };
}

/** Server spine dimension entry with timestamp for TTL-based expiry */
export interface SpineDimensionEntry {
  width: number;
  height: number;
  cachedAt: number;  // Date.now() when cached
}

export interface SpineCacheState {
  /** Map of bookId -> cached spine data */
  cache: Map<string, CachedSpineData>;
  /** Whether initial population is complete */
  isPopulated: boolean;
  /** Last population timestamp */
  lastPopulatedAt: number | null;
  /** Whether to use genre-based colored spines (default: true) */
  useColoredSpines: boolean;
  /** Whether to use server-provided spine images (default: false until images are generated) */
  useServerSpines: boolean;
  /** Record of bookId -> server spine image dimensions with TTL - persisted */
  serverSpineDimensions: Record<string, SpineDimensionEntry>;
  /** Whether persisted state has been hydrated from AsyncStorage */
  isHydrated: boolean;
  /** Whether expo-image disk cache has been cleared (prevents stale image flash) */
  imageCacheCleared: boolean;
  /** Version counter for serverSpineDimensions - increments on any change.
   *  Subscribe to this instead of the full object to avoid mass re-renders. */
  serverSpineDimensionsVersion: number;
}

export interface SpineCacheActions {
  /** Hydrate cache from SQLite only (fast, no computation) - call during app init */
  hydrateFromSQLite: (libraryId: string) => Promise<number>;
  /** Populate cache from library items - tries SQLite first, then computes missing */
  populateFromLibrary: (items: LibraryItem[], libraryId?: string) => Promise<void>;
  /** Get cached data for a single book */
  getSpineData: (bookId: string) => CachedSpineData | undefined;
  /** Get cached data for multiple books */
  getSpineDataBatch: (bookIds: string[]) => CachedSpineData[];
  /** Update progress for a book */
  updateProgress: (bookId: string, progress: number) => void;
  /** Clear the cache */
  clearCache: () => void;
  /** Toggle colored spines on/off */
  setUseColoredSpines: (enabled: boolean) => void;
  /** Toggle server-provided spine images on/off */
  setUseServerSpines: (enabled: boolean) => void;
  /** Save current cache to SQLite for persistence */
  saveToSQLite: (libraryId: string) => Promise<void>;
  /** Get cached server spine image dimensions for a book */
  getServerSpineDimensions: (bookId: string) => { width: number; height: number } | undefined;
  /** Set server spine image dimensions after image loads */
  setServerSpineDimensions: (bookId: string, width: number, height: number) => void;
  /** Clear all cached server spine dimensions (call when refreshing spines) */
  clearServerSpineDimensions: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extract spine-relevant data from a LibraryItem
 */
function extractSpineData(item: LibraryItem): CachedSpineData {
  const metadata = getBookMetadata(item);
  const genres = metadata?.genres || [];
  // Tags are on BookMedia, not metadata
  const tags = isBookMedia(item.media) ? item.media.tags || [] : [];
  const duration = getBookDuration(item) || 6 * 60 * 60; // Default 6 hours

  // DEBUG: Log tags to verify they're loading
  if (tags.length > 0 || genres.length > 0) {
    log.debug(`${metadata?.title?.substring(0, 20) || item.id}:`, {
      genres: genres.slice(0, 3),
      tags: tags.slice(0, 3),
    });
  }
  // Get series name from either string format or array format
  const seriesName = metadata?.seriesName || metadata?.series?.[0]?.name;
  const progress = item.userMediaProgress?.progress || 0;

  // Calculate base dimensions using shared utility
  const calculated = calculateBookDimensions({
    id: item.id,
    genres,
    tags,
    duration,
    seriesName,
  });

  // Calculate spine colors based on genres
  const colors = getSpineColorForGenres(genres, item.id);

  // Pre-compute spine composition (title orientation, author treatment, etc.)
  // This ensures consistent styling across home, book detail, and player screens
  const title = metadata?.title || 'Unknown';
  const author = metadata?.authorName || 'Unknown Author';
  // Pass spine width for smart layout constraints (horizontal only on wide spines)
  const composition = generateSpineComposition(item.id, title, author, genres, seriesName ? { name: seriesName, number: 1 } : undefined, calculated.width);

  // Pre-compute typography (font family, weight, transforms, etc.)
  // CRITICAL: Must match EXACTLY what BookSpineVertical uses!
  // The spine checks templates FIRST, then falls back to genre typography.
  // We must do the same here to ensure book detail/player match the spine.
  const useTemplates = shouldUseTemplates(genres);
  let typography: any;

  if (useTemplates && genres.length > 0) {
    // Use template system - same as BookSpineVertical line 977-981
    const templateConfig = applyTemplateConfig(genres, calculated.width, title);

    // CRITICAL: Resolve fonts using getPlatformFont() - same as BookSpineVertical line 1654
    // This converts custom font names (e.g., 'AlmendraSC-Regular') to available fonts (e.g., 'Lora-Regular')
    const resolvedTitleFont = getPlatformFont(templateConfig.title.fontFamily);
    const resolvedAuthorFont = getPlatformFont(templateConfig.author.fontFamily);

    typography = {
      // Map template config to typography format - use RESOLVED fonts!
      fontFamily: resolvedTitleFont,
      fontWeight: templateConfig.title.weight,
      fontStyle: 'normal',
      titleTransform: templateConfig.title.case,
      authorTransform: templateConfig.author.case,
      authorPosition: templateConfig.author.placement,
      authorBox: 'none',
      letterSpacing: templateConfig.title.letterSpacing,
      titleLetterSpacing: templateConfig.title.letterSpacing,
      authorLetterSpacing: templateConfig.author.letterSpacing,
      authorOrientationBias: templateConfig.author.orientation === 'horizontal' ? 'horizontal' : 'vertical',
      contrast: 'high',
      titleWeight: templateConfig.title.weight,
      authorWeight: templateConfig.author.weight,
      authorAbbreviation: 'none',
      authorFontFamily: resolvedAuthorFont,
      // Store template info for debugging
      _fromTemplate: templateConfig.templateId,
      _rawTitleFont: templateConfig.title.fontFamily,
    };

    log.debug(`"${title?.substring(0, 20)}" TEMPLATE: ${templateConfig.templateName}, raw: ${templateConfig.title.fontFamily} → resolved: ${resolvedTitleFont}`);
  } else {
    // No template - use genre-based typography
    const genreTypo = getTypographyForGenres(genres, item.id);

    // CRITICAL: Also resolve genre typography fonts!
    const resolvedFont = getPlatformFont(genreTypo.fontFamily);

    typography = {
      ...genreTypo,
      fontFamily: resolvedFont,
    };

    log.debug(`"${title?.substring(0, 20)}" GENRE: raw: ${genreTypo.fontFamily} → resolved: ${resolvedFont}`);
  }

  return {
    id: item.id,
    baseWidth: calculated.width,
    baseHeight: calculated.height,
    hash: hashString(item.id),
    genres,
    tags,
    duration,
    seriesName,
    title,
    author,
    progress,
    backgroundColor: colors.backgroundColor,
    textColor: colors.textColor,
    composition,
    typography,
  };
}

// =============================================================================
// STORE
// =============================================================================

export const useSpineCacheStore = create<SpineCacheState & SpineCacheActions>()(
  persist(
    (set, get) => ({
      // State
      cache: new Map(),
      isPopulated: false,
      lastPopulatedAt: null,
      useColoredSpines: true, // Default to colored spines enabled
      useServerSpines: true, // Default to server spines when available
      serverSpineDimensions: {}, // Cache for server spine image dimensions (persisted)
      isHydrated: false, // Set to true once AsyncStorage hydration completes
      imageCacheCleared: false, // Set to true once expo-image disk cache is cleared
      serverSpineDimensionsVersion: 0,

      // Actions

      /**
       * Hydrate cache from SQLite ONLY (no computation).
       * Call this during app initialization to pre-load spine data.
       * Returns the number of items loaded.
       */
      hydrateFromSQLite: async (libraryId: string): Promise<number> => {
        if (!libraryId) return 0;

        // Skip spine generation caching if server spines are enabled
        // (procedural spine calculations not needed when using server images)
        if (get().useServerSpines) {
          log.debug('Server spines enabled, skipping procedural spine hydration');
          return 0;
        }

        // Skip if already populated (avoid duplicate work)
        if (get().isPopulated && get().cache.size > 0) {
          log.debug('Already populated, skipping hydration');
          return get().cache.size;
        }

        const startTime = Date.now();

        try {
          const sqliteData = await sqliteCache.getSpineCache(libraryId);

          if (sqliteData.size > 0) {
            set({
              cache: sqliteData,
              isPopulated: true,
              lastPopulatedAt: Date.now(),
            });

            const elapsed = Date.now() - startTime;
            log.debug(`Hydrated ${sqliteData.size} items from SQLite in ${elapsed}ms`);
            return sqliteData.size;
          }
        } catch (error) {
          log.warn('Hydration from SQLite failed:', error);
        }

        return 0;
      },

      populateFromLibrary: async (items: LibraryItem[], libraryId?: string) => {
        // Skip procedural spine caching entirely if server spines are enabled
        // (server images don't need pre-computed dimensions)
        if (get().useServerSpines) {
          log.debug('Server spines enabled, skipping procedural spine population');
          set({ isPopulated: true, lastPopulatedAt: Date.now() });
          return;
        }

        const startTime = Date.now();
        const newCache = new Map<string, CachedSpineData>();
        const itemIds = new Set(items.map(i => i.id));
        let loadedFromSQLite = 0;
        let computed = 0;

        // Try to load from SQLite first (if libraryId provided)
        if (libraryId) {
          try {
            const sqliteData = await sqliteCache.getSpineCache(libraryId);

            // Use SQLite data for items that still exist
            for (const [bookId, data] of sqliteData.entries()) {
              if (itemIds.has(bookId)) {
                newCache.set(bookId, data);
                loadedFromSQLite++;
              }
            }

            if (loadedFromSQLite > 0) {
              log.debug(`Loaded ${loadedFromSQLite} items from SQLite`);
            }
          } catch (error) {
            log.warn('Failed to load from SQLite:', error);
          }
        }

        // Compute only for items not in cache
        for (const item of items) {
          if (!newCache.has(item.id)) {
            try {
              const spineData = extractSpineData(item);
              newCache.set(item.id, spineData);
              computed++;
            } catch (error) {
              // Skip items that fail to process
              log.warn(`Failed to process item ${item.id}:`, error);
            }
          }
        }

        set({
          cache: newCache,
          isPopulated: true,
          lastPopulatedAt: Date.now(),
        });

        const elapsed = Date.now() - startTime;
        log.debug(`Populated ${newCache.size} items (${loadedFromSQLite} from SQLite, ${computed} computed) in ${elapsed}ms`);

        // Save back to SQLite if we computed new items
        if (libraryId && computed > 0) {
          // Run in background, don't block
          sqliteCache.setSpineCache(libraryId, newCache).catch(err => {
            log.warn('Failed to save to SQLite:', err);
          });
        }
      },

    getSpineData: (bookId: string) => {
      return get().cache.get(bookId);
    },

    getSpineDataBatch: (bookIds: string[]) => {
      const cache = get().cache;
      const results: CachedSpineData[] = [];

      for (const id of bookIds) {
        const data = cache.get(id);
        if (data) {
          results.push(data);
        }
      }

      return results;
    },

    updateProgress: (bookId: string, progress: number) => {
      const cache = get().cache;
      const existing = cache.get(bookId);

      // Skip if progress unchanged - prevents unnecessary re-renders
      if (existing && existing.progress !== progress) {
        const newCache = new Map(cache);
        newCache.set(bookId, { ...existing, progress });
        set({ cache: newCache });
      }
    },

    clearCache: () => {
      set({
        cache: new Map(),
        isPopulated: false,
        lastPopulatedAt: null,
      });
    },

    setUseColoredSpines: (enabled: boolean) => {
      set({ useColoredSpines: enabled });
    },

    setUseServerSpines: (enabled: boolean) => {
      set({ useServerSpines: enabled });
    },

    getServerSpineDimensions: (bookId: string) => {
      const entry = get().serverSpineDimensions[bookId];
      if (!entry) return undefined;

      // Check if entry has expired (24h TTL)
      const age = Date.now() - entry.cachedAt;
      if (age > DIMENSION_CACHE_TTL_MS) {
        // Expired - return undefined to trigger refresh
        return undefined;
      }

      return { width: entry.width, height: entry.height };
    },

    setServerSpineDimensions: (bookId: string, width: number, height: number) => {
      const { serverSpineDimensions, serverSpineDimensionsVersion } = get();
      const existing = serverSpineDimensions[bookId];
      // Update if new or dimensions changed (allows refresh after expiry)
      if (!existing || existing.width !== width || existing.height !== height) {
        set({
          serverSpineDimensions: {
            ...serverSpineDimensions,
            [bookId]: { width, height, cachedAt: Date.now() },
          },
          serverSpineDimensionsVersion: serverSpineDimensionsVersion + 1,
        });
      }
    },

    clearServerSpineDimensions: () => {
      set({ serverSpineDimensions: {}, serverSpineDimensionsVersion: get().serverSpineDimensionsVersion + 1 });
      console.log('[SpineCache] Cleared all server spine dimensions');
    },

    saveToSQLite: async (libraryId: string) => {
      // Skip saving procedural spine data if server spines are enabled
      // (no need to persist calculations we won't use)
      if (get().useServerSpines) {
        log.debug('Server spines enabled, skipping procedural spine save');
        return;
      }

      const { cache } = get();
      if (cache.size === 0) return;

      try {
        await sqliteCache.setSpineCache(libraryId, cache);
        log.debug(`Saved ${cache.size} items to SQLite`);
      } catch (error) {
        log.warn('Failed to save to SQLite:', error);
      }
    },

  }),
    {
      name: 'spine-settings',
      version: 5, // Increment to trigger migration for TTL-based cache
      storage: createJSONStorage(() => AsyncStorage),
      // Persist settings AND serverSpineDimensions with TTL
      // Dimensions have 24h TTL to handle server-side image changes
      partialize: (state) => ({
        useColoredSpines: state.useColoredSpines,
        useServerSpines: state.useServerSpines,
        serverSpineDimensions: state.serverSpineDimensions,
      }),
      // Migration: v1 -> v2: Enable colored spines for light mode theme
      // Migration: v2 -> v3: Add server spines setting (default off)
      // Migration: v3 -> v4: Persist serverSpineDimensions to eliminate flash
      // Migration: v4 -> v5: Add cachedAt timestamp for 24h TTL expiry
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Enable colored spines for new light mode theme
          return {
            ...persistedState,
            useColoredSpines: true,
            useServerSpines: false,
            serverSpineDimensions: {},
          };
        }
        if (version < 3) {
          // Add server spines setting (default off until images are generated)
          return {
            ...persistedState,
            useServerSpines: false,
            serverSpineDimensions: {},
          };
        }
        if (version < 4) {
          // Add persisted serverSpineDimensions (previously was Map, now Record)
          return {
            ...persistedState,
            serverSpineDimensions: {},
          };
        }
        if (version < 5) {
          // Add cachedAt timestamp to existing dimension entries
          const oldDimensions = persistedState.serverSpineDimensions || {};
          const newDimensions: Record<string, { width: number; height: number; cachedAt: number }> = {};
          const now = Date.now();
          for (const [bookId, dims] of Object.entries(oldDimensions)) {
            const d = dims as { width: number; height: number; cachedAt?: number };
            newDimensions[bookId] = {
              width: d.width,
              height: d.height,
              cachedAt: d.cachedAt || now, // Add timestamp if missing
            };
          }
          return {
            ...persistedState,
            serverSpineDimensions: newDimensions,
          };
        }
        return persistedState;
      },
      onRehydrateStorage: () => (state) => {
        // Called when hydration from AsyncStorage completes
        if (state) {
          const dimCount = Object.keys(state.serverSpineDimensions || {}).length;
          console.log(`[SpineCache] Hydrated from AsyncStorage: ${dimCount} server spine dimensions`);
          // Mark as hydrated so components know persisted data is available
          useSpineCacheStore.setState({ isHydrated: true, imageCacheCleared: true });
          // NOTE: We no longer clear expo-image caches on app start.
          // URL timestamps now handle cache busting, and we want to preserve
          // the full library image cache for instant loading.
        }
      },
    }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

/**
 * Select just the population status (stable reference)
 */
export const selectIsPopulated = (state: SpineCacheState) => state.isPopulated;

/**
 * Select cache size for debugging
 */
export const selectCacheSize = (state: SpineCacheState) => state.cache.size;

/**
 * Select colored spines setting
 */
export const selectUseColoredSpines = (state: SpineCacheState) => state.useColoredSpines;

/**
 * Select server spines setting
 */
export const selectUseServerSpines = (state: SpineCacheState) => state.useServerSpines;
