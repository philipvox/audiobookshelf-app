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
import { getColors } from 'react-native-image-colors';
import { LibraryItem, BookMedia, BookMetadata } from '@/core/types';
import { apiClient } from '@/core/api';
import { sqliteCache } from '@/core/services/sqliteCache';
// MIGRATED: Now using new spine system via adapter
import { calculateBookDimensions, hashString, getSpineColorForGenres, isLightColor, darkenColorForDisplay, generateSpineComposition, SpineComposition, getTypographyForGenres } from '../utils/spine/adapter';
// Template system - spines use this when available, so cache must too
import { shouldUseTemplates, applyTemplateConfig } from '../utils/spine/templateAdapter';
// getPlatformFont resolves custom fonts to available fonts (same as BookSpineVertical)
import { getPlatformFont } from '../utils/spineCalculations';
import { getErrorMessage } from '@/shared/utils/errorUtils';

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

// Platform-specific color result types
interface IOSImageColors {
  platform: 'ios';
  background: string;
  primary: string;
  secondary: string;
  detail: string;
}

interface AndroidImageColors {
  platform: 'android';
  dominant?: string;
  average?: string;
  vibrant?: string;
  darkVibrant?: string;
  lightVibrant?: string;
  darkMuted?: string;
  lightMuted?: string;
  muted?: string;
}

type ImageColorsResult = IOSImageColors | AndroidImageColors;

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
  /** Background color for spine (from cover or genre-based fallback) */
  backgroundColor: string;
  /** Text color for spine (contrast-based) */
  textColor: string;
  /** Cover URL for color extraction */
  coverUrl?: string;
  /** Whether colors were extracted from cover image */
  colorsFromCover?: boolean;
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

export interface SpineCacheState {
  /** Map of bookId -> cached spine data */
  cache: Map<string, CachedSpineData>;
  /** Whether initial population is complete */
  isPopulated: boolean;
  /** Last population timestamp */
  lastPopulatedAt: number | null;
  /** Whether to use genre-based colored spines (default: true) */
  useColoredSpines: boolean;
  /** Version counter that increments when colors are updated (triggers re-renders) */
  colorVersion: number;
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
  /** Extract colors from cover images (async, call after populateFromLibrary) */
  extractCoverColors: () => Promise<void>;
  /** Update a single book's colors */
  updateBookColors: (bookId: string, backgroundColor: string, textColor: string) => void;
  /** Save current cache to SQLite for persistence */
  saveToSQLite: (libraryId: string) => Promise<void>;
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
  if (__DEV__ && (tags.length > 0 || genres.length > 0)) {
    console.log(`[SpineCache] ${metadata?.title?.substring(0, 20) || item.id}:`, {
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

  // Calculate spine colors based on genres (fallback until cover colors are extracted)
  const colors = getSpineColorForGenres(genres, item.id);

  // Get cover URL for color extraction
  const coverUrl = apiClient.getItemCoverUrl(item.id);

  // Pre-compute spine composition (title orientation, author treatment, etc.)
  // This ensures consistent styling across home, book detail, and player screens
  const title = metadata?.title || 'Unknown';
  const author = metadata?.authorName || 'Unknown Author';
  const composition = generateSpineComposition(item.id, title, author, genres, seriesName ? { name: seriesName, number: 1 } : undefined);

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

    if (__DEV__) {
      console.log(`[SpineCache] "${title?.substring(0, 20)}" TEMPLATE: ${templateConfig.templateName}, raw: ${templateConfig.title.fontFamily} → resolved: ${resolvedTitleFont}`);
    }
  } else {
    // No template - use genre-based typography
    const genreTypo = getTypographyForGenres(genres, item.id);

    // CRITICAL: Also resolve genre typography fonts!
    const resolvedFont = getPlatformFont(genreTypo.fontFamily);

    typography = {
      ...genreTypo,
      fontFamily: resolvedFont,
    };

    if (__DEV__) {
      console.log(`[SpineCache] "${title?.substring(0, 20)}" GENRE: raw: ${genreTypo.fontFamily} → resolved: ${resolvedFont}`);
    }
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
    coverUrl,
    colorsFromCover: false,
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
      colorVersion: 0, // Increments when colors are updated

      // Actions

      /**
       * Hydrate cache from SQLite ONLY (no computation).
       * Call this during app initialization to pre-load spine data.
       * Returns the number of items loaded.
       */
      hydrateFromSQLite: async (libraryId: string): Promise<number> => {
        if (!libraryId) return 0;

        // Skip if already populated (avoid duplicate work)
        if (get().isPopulated && get().cache.size > 0) {
          if (__DEV__) {
            console.log('[SpineCache] Already populated, skipping hydration');
          }
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
            if (__DEV__) {
              console.log(`[SpineCache] Hydrated ${sqliteData.size} items from SQLite in ${elapsed}ms`);
            }
            return sqliteData.size;
          }
        } catch (error) {
          if (__DEV__) {
            console.warn('[SpineCache] Hydration from SQLite failed:', error);
          }
        }

        return 0;
      },

      populateFromLibrary: async (items: LibraryItem[], libraryId?: string) => {
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

            if (__DEV__ && loadedFromSQLite > 0) {
              console.log(`[SpineCache] Loaded ${loadedFromSQLite} items from SQLite`);
            }
          } catch (error) {
            if (__DEV__) {
              console.warn('[SpineCache] Failed to load from SQLite:', error);
            }
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
              if (__DEV__) {
                console.warn(`[SpineCache] Failed to process item ${item.id}:`, error);
              }
            }
          }
        }

        set({
          cache: newCache,
          isPopulated: true,
          lastPopulatedAt: Date.now(),
        });

        const elapsed = Date.now() - startTime;
        if (__DEV__) {
          console.log(`[SpineCache] Populated ${newCache.size} items (${loadedFromSQLite} from SQLite, ${computed} computed) in ${elapsed}ms`);
        }

        // Save back to SQLite if we computed new items
        if (libraryId && computed > 0) {
          // Run in background, don't block
          sqliteCache.setSpineCache(libraryId, newCache).catch(err => {
            if (__DEV__) {
              console.warn('[SpineCache] Failed to save to SQLite:', err);
            }
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

      if (existing) {
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

    updateBookColors: (bookId: string, backgroundColor: string, textColor: string) => {
      const { cache } = get();
      const existing = cache.get(bookId);

      if (existing) {
        const newCache = new Map(cache);
        newCache.set(bookId, {
          ...existing,
          backgroundColor,
          textColor,
          colorsFromCover: true,
        });
        set({ cache: newCache });
      }
    },

    saveToSQLite: async (libraryId: string) => {
      const { cache } = get();
      if (cache.size === 0) return;

      try {
        await sqliteCache.setSpineCache(libraryId, cache);
        if (__DEV__) {
          console.log(`[SpineCache] Saved ${cache.size} items to SQLite`);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[SpineCache] Failed to save to SQLite:', error);
        }
      }
    },

    extractCoverColors: async () => {
      const { cache } = get();
      const books = Array.from(cache.values()).filter(book => !book.colorsFromCover && book.coverUrl);

      // Process in batches to avoid overwhelming the system
      const BATCH_SIZE = 5;
      const BATCH_DELAY = 100; // ms between batches
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < books.length; i += BATCH_SIZE) {
        const batch = books.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (book) => {
          try {
            if (!book.coverUrl) {
              return;
            }

            const result = await getColors(book.coverUrl, {
              fallback: book.backgroundColor, // Keep genre color as fallback
              cache: true,
              key: book.id,
            }) as ImageColorsResult;

            // Extract dominant color based on platform
            let dominantColor: string | undefined;
            if (result.platform === 'ios') {
              dominantColor = result.primary || result.background;
            } else {
              dominantColor = result.dominant || result.vibrant;
            }

            if (dominantColor) {
              // Darken light colors for better contrast on grey background
              let bgColor = dominantColor;
              if (isLightColor(bgColor)) {
                bgColor = darkenColorForDisplay(bgColor);
              }

              // Calculate text color based on background luminance
              const textColor = isLightColor(bgColor, 0.5) ? '#000000' : '#FFFFFF';

              // Update the cache
              get().updateBookColors(book.id, bgColor, textColor);
              successCount++;
            } else {
              failCount++;
            }
          } catch (error) {
            failCount++;
            if (__DEV__) {
              console.error(`[SpineCache] Failed to extract color for ${book.id} (${book.title}):`, getErrorMessage(error));
            }
          }
        }));

        // Small delay between batches
        if (i + BATCH_SIZE < books.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      }

      // Increment colorVersion to trigger UI re-renders
      if (successCount > 0) {
        set({ colorVersion: get().colorVersion + 1 });
      }
    },
  }),
    {
      name: 'spine-settings',
      version: 2, // Increment to trigger migration
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the settings, not the cache
      partialize: (state) => ({
        useColoredSpines: state.useColoredSpines,
      }),
      // Migration: v1 -> v2: Enable colored spines for light mode theme
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Enable colored spines for new light mode theme
          return {
            ...persistedState,
            useColoredSpines: true,
          };
        }
        return persistedState;
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
