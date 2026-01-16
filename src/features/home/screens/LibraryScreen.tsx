/**
 * src/features/home/screens/LibraryScreen.tsx
 *
 * Secret Library - Library Screen
 * Features two view modes: Bookshelf (spines, primary) and Grid (secondary)
 *
 * Design: Clean editorial aesthetic with Playfair Display titles,
 * JetBrains Mono metadata, and a cream/black color scheme.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
// Note: Safe area is handled by TopNav component
import Svg, { Path, Rect, Circle } from 'react-native-svg';

import { apiClient } from '@/core/api';
import { LibraryItem, BookMedia, BookMetadata } from '@/core/types';
import { haptics } from '@/core/native/haptics';
import { useDownloads } from '@/core/hooks/useDownloads';
import { useLibraryCache } from '@/core/cache';
import { scale, useSecretLibraryColors } from '@/shared/theme';
import { TopNav, TopNavSearchIcon, SkullRefreshControl } from '@/shared/components';
import {
  secretLibraryColors as staticColors,
  secretLibraryTypography as typography,
  secretLibrarySpacing as spacing,
  secretLibrarySizes as sizes,
  secretLibraryFonts as fonts,
} from '@/shared/theme/secretLibrary';
import { getTitle, getAuthorName, getNarratorName } from '@/shared/utils/metadata';

// Extended metadata with tags
interface ExtendedBookMetadata extends BookMetadata {
  tags?: string[];
}

// Helper to get book metadata safely
// Note: Does NOT require audioFiles - works with cache items that only have metadata
function getBookMetadata(item: LibraryItem | null | undefined): ExtendedBookMetadata | null {
  if (!item?.media?.metadata) return null;
  return item.media.metadata as ExtendedBookMetadata;
}

// Helper to get book duration safely
// Note: Does NOT require audioFiles - works with cache items that only have duration
function getBookDuration(item: LibraryItem | null | undefined): number {
  return item?.media?.duration || 0;
}

import { BookshelfView, LayoutMode } from '../components/BookshelfView';
import { BookSpineVerticalData } from '../components/BookSpineVertical';
import { RecommendedBook } from '../components/DiscoverMoreCard';
import { useHomeData } from '../hooks/useHomeData';
import { useRecommendations } from '@/features/recommendations/hooks/useRecommendations';
import { useInProgressBooks } from '@/core/hooks/useUserBooks';
import { useProgressStore } from '@/core/stores/progressStore';
import { usePlayerStore } from '@/features/player/stores/playerStore';
import { GLOBAL_MINI_PLAYER_HEIGHT } from '@/navigation/components/GlobalMiniPlayer';

// =============================================================================
// BOTTOM PADDING CONSTANTS - Edit these to adjust shelf/stack/list positioning
// =============================================================================

// SHELF MODE (upright spines, horizontal scroll)
const SHELF_PADDING_WITH_MINI_PLAYER = GLOBAL_MINI_PLAYER_HEIGHT - 50;
const SHELF_PADDING_NO_MINI_PLAYER = 0;

// STACK MODE (rotated pile, vertical scroll)
const STACK_PADDING_WITH_MINI_PLAYER = GLOBAL_MINI_PLAYER_HEIGHT - 65;
const STACK_PADDING_NO_MINI_PLAYER = 0;

// LIST MODE (vertical list with covers)
const LIST_PADDING_WITH_MINI_PLAYER = GLOBAL_MINI_PLAYER_HEIGHT + 20;
const LIST_PADDING_NO_MINI_PLAYER = 40;

// =============================================================================
// TYPES
// =============================================================================

type ViewMode = 'shelf' | 'stack' | 'list';  // Shelf (upright spines), Stack (rotated pile), or List (vertical)
type SortMode = 'recent' | 'title' | 'author' | 'progress' | 'duration';
type ContentMode = 'library' | 'lastPlayed';  // What content to show
type DownloadFilter = 'all' | 'downloaded' | 'not-downloaded';  // Download status filter

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'title', label: 'Title' },
  { key: 'author', label: 'Author' },
  { key: 'progress', label: 'Progress' },
  { key: 'duration', label: 'Duration' },
];

const CONTENT_OPTIONS: { key: ContentMode; label: string }[] = [
  { key: 'library', label: 'My Library' },
  { key: 'lastPlayed', label: 'Last Played' },
];

const DOWNLOAD_OPTIONS: { key: DownloadFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'downloaded', label: 'Downloaded' },
  { key: 'not-downloaded', label: 'Not Downloaded' },
];

interface LibraryBook {
  id: string;
  title: string;
  author: string;
  duration: string;
  durationSeconds: number;
  progress: number;
  coverUrl?: string;
  lastPlayedAt?: number; // Unix timestamp in milliseconds
  isDownloaded: boolean;
}

// =============================================================================
// ICONS
// =============================================================================

interface IconProps {
  color?: string;
}

// Stack icon - horizontal stacked books (filled)
const StackIcon = ({ color = '#000' }: IconProps) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill={color}>
    <Rect x={2} y={4} width={20} height={4} rx={1} />
    <Rect x={4} y={10} width={16} height={4} rx={1} />
    <Rect x={6} y={16} width={12} height={4} rx={1} />
  </Svg>
);

// Shelf icon - upright books on shelf (filled)
const ShelfIcon = ({ color = '#000' }: IconProps) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill={color}>
    <Rect x={3} y={4} width={4} height={14} rx={1} />
    <Rect x={9} y={6} width={4} height={12} rx={1} />
    <Rect x={15} y={3} width={4} height={15} rx={1} />
    <Rect x={2} y={19} width={20} height={2} rx={0.5} />
  </Svg>
);

// List icon - horizontal lines (filled)
const ListIcon = ({ color = '#000' }: IconProps) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill={color}>
    <Circle cx={3} cy={6} r={1.5} />
    <Circle cx={3} cy={12} r={1.5} />
    <Circle cx={3} cy={18} r={1.5} />
    <Rect x={7} y={5} width={14} height={2} rx={1} />
    <Rect x={7} y={11} width={14} height={2} rx={1} />
    <Rect x={7} y={17} width={14} height={2} rx={1} />
  </Svg>
);

// Refresh icon - circular arrows
const RefreshIcon = ({ color = '#000' }: IconProps) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <Path d="M21 3v5h-5" />
  </Svg>
);

// =============================================================================
// HELPERS
// =============================================================================

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Format duration as compact string (e.g., "10h")
function formatDurationCompact(seconds: number): string {
  const hours = Math.round(seconds / 3600);
  return `${hours}h`;
}

// =============================================================================
// TRANSFORM DATA
// =============================================================================

function transformToLibraryBook(item: LibraryItem, downloadedIds: Set<string>): LibraryBook {
  const metadata = getBookMetadata(item) || {};
  const mediaProgress = item.mediaProgress || item.userMediaProgress;
  const progress = mediaProgress?.progress || 0;
  const duration = getBookDuration(item);
  // Get lastUpdate timestamp
  const lastPlayedAt = mediaProgress?.lastUpdate || 0;

  return {
    id: item.id,
    title: getTitle(item),
    author: getAuthorName(item),
    duration: formatDuration(duration),
    durationSeconds: duration,
    progress,
    coverUrl: apiClient.getItemCoverUrl(item.id),
    lastPlayedAt,
    isDownloaded: downloadedIds.has(item.id),
  };
}

/**
 * Extract series name and sequence from metadata
 * Handles both series array and seriesName string formats
 */
function extractSeriesInfo(metadata: any): { name?: string; sequence?: number } {
  // Handle null/undefined metadata
  if (!metadata) return {};

  // Try series array first (expanded API data with name and sequence)
  if (metadata.series?.length > 0) {
    const seriesEntry = metadata.series[0];
    const name = seriesEntry.name || seriesEntry;
    const sequence = seriesEntry.sequence ? parseFloat(seriesEntry.sequence) : undefined;
    if (name && typeof name === 'string') {
      return { name, sequence: sequence || undefined };
    }
  }

  // Try seriesName string (format: "Series Name #N")
  const seriesNameRaw = metadata.seriesName || '';
  if (seriesNameRaw) {
    const seqMatch = seriesNameRaw.match(/#([\d.]+)/);
    if (seqMatch) {
      const sequence = parseFloat(seqMatch[1]);
      const name = seriesNameRaw.replace(/\s*#[\d.]+$/, '').trim();
      return { name, sequence };
    }
    // Series name without sequence
    return { name: seriesNameRaw, sequence: undefined };
  }

  return {};
}

function transformToSpineData(
  book: LibraryBook,
  item: LibraryItem,
  showLastPlayed: boolean = false
): BookSpineVerticalData {
  const metadata = getBookMetadata(item);
  const duration = getBookDuration(item);
  const genres: string[] = metadata?.genres || [];
  const tags: string[] = metadata?.tags || []; // Tags for dimension modifiers (cozy, epic-fantasy, etc.)

  // Extract series info properly
  const seriesInfo = extractSeriesInfo(metadata);

  // Convert timestamp to ISO string only when showing last played
  const lastPlayedAt = showLastPlayed && book.lastPlayedAt
    ? new Date(book.lastPlayedAt).toISOString()
    : undefined;

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    progress: book.progress,
    genres,
    tags,
    duration,
    seriesName: seriesInfo.name,
    seriesSequence: seriesInfo.sequence,
    lastPlayedAt,
    isDownloaded: book.isDownloaded,
  };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LibraryScreen() {
  const navigation = useNavigation<any>();
  // Note: Safe area is handled by TopNav component (includeSafeArea={true} by default)

  // Theme-aware colors
  const colors = useSecretLibraryColors();
  const isDarkMode = colors.isDark;

  const [viewMode, setViewMode] = useState<ViewMode>('shelf');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [contentMode, setContentMode] = useState<ContentMode>('library'); // Library vs Last Played
  const [downloadFilter, setDownloadFilter] = useState<DownloadFilter>('all'); // Download status filter
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showContentDropdown, setShowContentDropdown] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);

  // Get data from home hook (for refresh and in-progress data)
  const {
    recentlyListened,
    isRefreshing,
    refresh,
  } = useHomeData();

  // Get library IDs (books user has added to their library)
  // Use progressStore which is the unified source of truth (same as book detail "IN LIBRARY" button)
  const librarySet = useProgressStore((state) => state.librarySet);
  const isProgressLoaded = useProgressStore((state) => state.isLoaded);

  // Check if mini player is active (has a book loaded)
  const currentBook = usePlayerStore((state) => state.currentBook);
  const isMiniPlayerActive = currentBook !== null;

  // Calculate bottom padding based on view mode and mini player state
  const getBottomPadding = useCallback((mode: ViewMode) => {
    switch (mode) {
      case 'shelf':
        return isMiniPlayerActive ? SHELF_PADDING_WITH_MINI_PLAYER : SHELF_PADDING_NO_MINI_PLAYER;
      case 'stack':
        return isMiniPlayerActive ? STACK_PADDING_WITH_MINI_PLAYER : STACK_PADDING_NO_MINI_PLAYER;
      case 'list':
        return isMiniPlayerActive ? LIST_PADDING_WITH_MINI_PLAYER : LIST_PADDING_NO_MINI_PLAYER;
    }
  }, [isMiniPlayerActive]);

  // Get local SQLite progress data as fallback for "Last Played"
  const { data: localInProgressBooks = [] } = useInProgressBooks();

  // Get library cache for items and refresh functionality
  const { items: allCacheItems, refreshCache, isLoading: isCacheLoading, isLoaded: isCacheLoaded } = useLibraryCache();

  // Get recommendations for "Find More Books" card
  const { recommendations: recommendedItems } = useRecommendations(allCacheItems, 3);

  // Auto-refresh cache on mount to load latest book data
  // This ensures spines render with fresh data without manual refresh
  const hasAutoRefreshed = useRef(false);
  useEffect(() => {
    if (!hasAutoRefreshed.current && isCacheLoaded) {
      hasAutoRefreshed.current = true;
      // Trigger refresh asynchronously (non-blocking)
      // Note: This may cause a brief visual update as data refreshes
      setTimeout(async () => {
        if (__DEV__) {
          console.log('[LibraryScreen] Auto-refreshing cache on mount...');
        }
        await refreshCache();
        await refresh();
      }, 100);
    }
  }, [isCacheLoaded, refreshCache, refresh]);

  // Transform recommendations to the format needed by DiscoverMoreCard
  // Include genres, tags, and duration so BookSpineVertical can render properly
  const discoverRecommendations = useMemo((): RecommendedBook[] => {
    return recommendedItems.slice(0, 3).map((item) => {
      const metadata = getBookMetadata(item);
      return {
        id: item.id,
        title: getTitle(item),
        author: getAuthorName(item),
        genres: metadata?.genres || [],
        tags: metadata?.tags || [],
        duration: getBookDuration(item),
      };
    });
  }, [recommendedItems]);

  // Handler for "Find More Books" card press
  const handleDiscoverPress = useCallback(() => {
    haptics.buttonPress();
    // Navigate to discover/browse tab
    const parent = navigation.getParent();
    if (parent?.jumpTo) {
      parent.jumpTo('DiscoverTab');
    } else {
      navigation.navigate('Main', { screen: 'DiscoverTab' });
    }
  }, [navigation]);

  // Handler for recommendation book spine press - navigate to book detail
  const handleRecommendationPress = useCallback((book: RecommendedBook) => {
    haptics.buttonPress();
    navigation.navigate('BookDetail', { id: book.id });
  }, [navigation]);

  // Build local "recently listened" from SQLite when server data is empty
  // This ensures "Last Played" shows books even when server returns 0 items
  const localRecentlyListened = useMemo(() => {
    if (recentlyListened.length > 0) return recentlyListened;
    if (localInProgressBooks.length === 0) return [];

    // Convert local progress data to LibraryItems by looking up in cache
    const cacheMap = new Map(allCacheItems.map(item => [item.id, item]));
    const localItems: LibraryItem[] = [];

    for (const userBook of localInProgressBooks) {
      const cacheItem = cacheMap.get(userBook.bookId);
      if (cacheItem) {
        // Enrich cache item with local progress data
        const lastUpdateTime = userBook.lastPlayedAt ? new Date(userBook.lastPlayedAt).getTime() : Date.now();
        localItems.push({
          ...cacheItem,
          mediaProgress: {
            id: userBook.bookId,
            libraryItemId: userBook.bookId,
            currentTime: userBook.currentTime,
            duration: userBook.duration,
            progress: userBook.progress,
            isFinished: userBook.isFinished,
            hideFromContinueListening: false,
            lastUpdate: lastUpdateTime,
            startedAt: lastUpdateTime, // Use lastUpdate as fallback for startedAt
          },
        });
      }
    }

    return localItems.slice(0, 20);
  }, [recentlyListened, localInProgressBooks, allCacheItems]);

  // Get downloaded books
  const { downloads } = useDownloads();
  const downloadedIds = useMemo(() => {
    const ids = new Set<string>();
    downloads
      .filter((d) => d.status === 'complete')
      .forEach((d) => ids.add(d.itemId));
    return ids;
  }, [downloads]);

  // Get all completed downloads as LibraryItems
  const downloadedLibraryItems = useMemo(() => {
    return downloads
      .filter((d) => d.status === 'complete' && d.libraryItem)
      .map((d) => d.libraryItem as LibraryItem);
  }, [downloads]);

  // Get books in user's library from cache
  // Now using progressStore.librarySet which is the same source as book detail screen
  const libraryBooksFromCache = useMemo(() => {
    if (!isCacheLoaded || !isProgressLoaded || librarySet.size === 0) return [];
    return allCacheItems.filter(item => librarySet.has(item.id));
  }, [allCacheItems, librarySet, isCacheLoaded, isProgressLoaded]);

  // Select items based on content mode (Library vs Last Played)
  const baseLibraryItems = useMemo(() => {
    switch (contentMode) {
      case 'library':
        // "My Library" - show books user has added to their library
        return libraryBooksFromCache;
      case 'lastPlayed':
      default:
        // "Last Played" - use local SQLite data as fallback when server returns empty
        return localRecentlyListened;
    }
  }, [contentMode, libraryBooksFromCache, localRecentlyListened]);

  // Apply download filter on top of content mode
  const effectiveLibraryItems = useMemo(() => {
    switch (downloadFilter) {
      case 'downloaded':
        return baseLibraryItems.filter(item => downloadedIds.has(item.id));
      case 'not-downloaded':
        return baseLibraryItems.filter(item => !downloadedIds.has(item.id));
      case 'all':
      default:
        return baseLibraryItems;
    }
  }, [baseLibraryItems, downloadFilter, downloadedIds]);

  // Transform to LibraryBook format for list/grid views
  // Uses effectiveLibraryItems so "Downloaded" filter shows ALL downloaded books
  const allBooksUnsorted = useMemo(() => {
    return effectiveLibraryItems.map((item) => transformToLibraryBook(item, downloadedIds));
  }, [effectiveLibraryItems, downloadedIds]);

  // Books are already filtered by effectiveLibraryItems, no additional filtering needed
  const filteredBooks = allBooksUnsorted;

  // Sort books based on sort mode
  const allBooks = useMemo(() => {
    const sorted = [...filteredBooks];
    switch (sortMode) {
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'author':
        sorted.sort((a, b) => a.author.localeCompare(b.author));
        break;
      case 'progress':
        sorted.sort((a, b) => b.progress - a.progress); // High to low
        break;
      case 'duration':
        sorted.sort((a, b) => b.durationSeconds - a.durationSeconds); // Long to short
        break;
      case 'recent':
      default:
        // Sort by last played timestamp (most recent first)
        sorted.sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
        break;
    }
    return sorted;
  }, [filteredBooks, sortMode]);

  // Handlers
  const handleBookPress = useCallback((book: LibraryBook | BookSpineVerticalData) => {
    haptics.buttonPress();
    navigation.navigate('BookDetail', { id: book.id });
  }, [navigation]);

  const handleSearchPress = useCallback(() => {
    haptics.selection();
    navigation.navigate('Search');
  }, [navigation]);

  const handleRefreshPress = useCallback(async () => {
    haptics.selection();
    await refreshCache();
    await refresh();
  }, [refreshCache, refresh]);

  const handleLogoLongPress = useCallback(() => {
    haptics.selection();
    navigation.navigate('Main', { screen: 'ProfileTab' });
  }, [navigation]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    haptics.selection();
    setViewMode(mode);
  }, []);

  const handleSortPress = useCallback(() => {
    haptics.selection();
    setShowSortDropdown(true);
  }, []);

  const handleSortSelect = useCallback((mode: SortMode) => {
    haptics.selection();
    setSortMode(mode);
    setShowSortDropdown(false);
  }, []);

  const handleContentPress = useCallback(() => {
    haptics.selection();
    setShowContentDropdown(true);
  }, []);

  const handleContentSelect = useCallback((mode: ContentMode) => {
    haptics.selection();
    setContentMode(mode);
    setShowContentDropdown(false);
  }, []);

  const handleDownloadPress = useCallback(() => {
    haptics.selection();
    setShowDownloadDropdown(true);
  }, []);

  const handleDownloadSelect = useCallback((filter: DownloadFilter) => {
    haptics.selection();
    setDownloadFilter(filter);
    setShowDownloadDropdown(false);
  }, []);

  // Create a map for quick lookup of library items by ID
  // Uses effectiveLibraryItems so spine data works for downloaded books
  const libraryItemsMap = useMemo(() => {
    const map = new Map<string, LibraryItem>();
    effectiveLibraryItems.forEach(item => map.set(item.id, item));
    return map;
  }, [effectiveLibraryItems]);

  // Dynamic styles based on mode - using white/black background
  const screenBg = colors.white;
  const textColor = colors.black;
  const buttonInactiveColor = colors.grayLine;
  const buttonInactiveTextColor = colors.gray;

  // Get current labels for dropdowns
  const currentSortLabel = SORT_OPTIONS.find(opt => opt.key === sortMode)?.label || 'Recent';
  const currentContentLabel = CONTENT_OPTIONS.find(opt => opt.key === contentMode)?.label || 'Library';
  const currentDownloadLabel = DOWNLOAD_OPTIONS.find(opt => opt.key === downloadFilter)?.label || 'All';

  // Render list view (vertical list with covers)
  const renderListView = () => {
    return (
      <SkullRefreshControl
        refreshing={isCacheLoading || isRefreshing}
        onRefresh={handleRefreshPress}
      >
        <ScrollView
          style={styles.listScrollView}
          contentContainerStyle={{ paddingBottom: getBottomPadding('list') }}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.verticalList}>
          {allBooks.map((book) => {
            const item = libraryItemsMap.get(book.id);
            const metadata = item ? getBookMetadata(item) : null;
            const seriesInfo = extractSeriesInfo(metadata);
            const coverUrl = apiClient.getItemCoverUrl(book.id, { width: 80, height: 80 });
            const durationText = formatDurationCompact(book.durationSeconds);

            return (
              <Pressable
                key={book.id}
                style={[styles.verticalListItem, { borderBottomColor: colors.grayLine }]}
                onPress={() => handleBookPress(book)}
              >
                <Image
                  source={{ uri: coverUrl }}
                  style={styles.verticalCover}
                />
                <View style={styles.verticalInfo}>
                  <Text style={[styles.verticalTitle, { color: colors.black }]} numberOfLines={1}>{book.title}</Text>
                  {seriesInfo.name && (
                    <Text style={[styles.verticalSeries, { color: colors.gray }]} numberOfLines={1}>
                      {seriesInfo.name}{seriesInfo.sequence ? ` #${seriesInfo.sequence}` : ''}
                    </Text>
                  )}
                </View>
                <Text style={[styles.verticalDuration, { color: colors.gray }]}>{durationText}</Text>
              </Pressable>
            );
          })}
        </View>
        </ScrollView>
      </SkullRefreshControl>
    );
  };

  // Navigate to browse
  const handleBrowsePress = useCallback(() => {
    haptics.selection();
    navigation.navigate('Main', { screen: 'DiscoverTab' });
  }, [navigation]);

  // Render empty state based on content mode
  const renderEmptyState = () => {
    const isLibraryMode = contentMode === 'library';
    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyTitle, { color: colors.black }]}>
          {isLibraryMode ? 'No Books Saved' : 'No Recently Played'}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.gray }]}>
          {isLibraryMode
            ? 'Add books to your library to see them here'
            : 'Start listening to see your books here'}
        </Text>
        <Pressable
          style={[styles.browseButton, { backgroundColor: colors.black }]}
          onPress={handleBrowsePress}
        >
          <Text style={[styles.browseButtonText, { color: colors.white }]}>Browse Library →</Text>
        </Pressable>
      </View>
    );
  };

  // Render content based on view mode
  const renderContent = () => {
    // Show empty state when no books
    if (allBooks.length === 0) {
      return renderEmptyState();
    }

    // List view uses its own rendering
    if (viewMode === 'list') {
      return renderListView();
    }

    // Only show last played time when sorted by recent
    const showLastPlayed = sortMode === 'recent';
    const spineData = allBooks.map((book) => {
      const item = libraryItemsMap.get(book.id);
      return item ? transformToSpineData(book, item, showLastPlayed) : null;
    }).filter(Boolean) as BookSpineVerticalData[];

    // Shelf and Stack modes use BookshelfView with different layoutMode
    return (
      <BookshelfView
        books={spineData}
        onBookPress={(book) => handleBookPress(book)}
        layoutMode={viewMode}
        bottomPadding={getBottomPadding(viewMode)}
        recommendations={discoverRecommendations}
        onDiscoverPress={handleDiscoverPress}
        onRecommendationPress={handleRecommendationPress}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <TopNav
        variant={isDarkMode ? 'dark' : 'light'}
        showLogo={true}
        onLogoLongPress={handleLogoLongPress}
        style={{ backgroundColor: 'transparent' }}
        circleButtons={[
          {
            key: 'refresh',
            icon: <RefreshIcon color={isCacheLoading || isRefreshing ? colors.gray : colors.black} />,
            onPress: isCacheLoading || isRefreshing ? undefined : handleRefreshPress,
          },
          {
            key: 'shelf',
            icon: <ShelfIcon color={viewMode === 'shelf' ? colors.white : buttonInactiveTextColor} />,
            active: viewMode === 'shelf',
            onPress: () => handleViewModeChange('shelf'),
          },
          {
            key: 'stack',
            icon: <StackIcon color={viewMode === 'stack' ? colors.white : buttonInactiveTextColor} />,
            active: viewMode === 'stack',
            onPress: () => handleViewModeChange('stack'),
          },
          {
            key: 'list',
            icon: <ListIcon color={viewMode === 'list' ? colors.white : buttonInactiveTextColor} />,
            active: viewMode === 'list',
            onPress: () => handleViewModeChange('list'),
          },
          {
            key: 'search',
            icon: <TopNavSearchIcon color={colors.black} size={14} />,
            onPress: handleSearchPress,
          },
        ]}
      />

      {/* Filter Row: Content Mode + Download Filter + Sort */}
      <View style={styles.filterRow}>
        {/* Content mode dropdown (Library / Last Played) */}
        <TouchableOpacity style={styles.dropdownBtn} onPress={handleContentPress}>
          <Text style={[styles.dropdownBtnText, { color: textColor }]}>
            ⊙ {currentContentLabel}
          </Text>
        </TouchableOpacity>

        {/* Download filter dropdown */}
        <TouchableOpacity style={styles.dropdownBtn} onPress={handleDownloadPress}>
          <Text style={[styles.dropdownBtnText, { color: textColor }]}>
            ↓ {currentDownloadLabel}
          </Text>
        </TouchableOpacity>

        {/* Sort dropdown button */}
        <TouchableOpacity style={styles.dropdownBtn} onPress={handleSortPress}>
          <Text style={[styles.dropdownBtnText, { color: textColor }]}>
            ⇅ {currentSortLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sort Dropdown Modal */}
      <Modal
        visible={showSortDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortDropdown(false)}
      >
        <Pressable
          style={styles.dropdownOverlay}
          onPress={() => setShowSortDropdown(false)}
        >
          <View style={[styles.dropdownMenu, { backgroundColor: isDarkMode ? colors.shelfBg : colors.white }]}>
            <Text style={[styles.dropdownTitle, { color: colors.black }]}>
              Sort By
            </Text>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.dropdownItem,
                  sortMode === option.key && styles.dropdownItemSelected,
                  { borderBottomColor: isDarkMode ? colors.gray : colors.grayLine },
                ]}
                onPress={() => handleSortSelect(option.key)}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    { color: colors.black },
                    sortMode === option.key && styles.dropdownItemTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {sortMode === option.key && (
                  <Text style={[styles.dropdownCheck, { color: colors.black }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Content Mode Dropdown Modal */}
      <Modal
        visible={showContentDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowContentDropdown(false)}
      >
        <Pressable
          style={styles.dropdownOverlay}
          onPress={() => setShowContentDropdown(false)}
        >
          <View style={[styles.dropdownMenu, { backgroundColor: isDarkMode ? colors.shelfBg : colors.white }]}>
            <Text style={[styles.dropdownTitle, { color: colors.black }]}>
              View
            </Text>
            {CONTENT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.dropdownItem,
                  contentMode === option.key && styles.dropdownItemSelected,
                  { borderBottomColor: isDarkMode ? colors.gray : colors.grayLine },
                ]}
                onPress={() => handleContentSelect(option.key)}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    { color: colors.black },
                    contentMode === option.key && styles.dropdownItemTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {contentMode === option.key && (
                  <Text style={[styles.dropdownCheck, { color: colors.black }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Download Filter Dropdown Modal */}
      <Modal
        visible={showDownloadDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDownloadDropdown(false)}
      >
        <Pressable
          style={styles.dropdownOverlay}
          onPress={() => setShowDownloadDropdown(false)}
        >
          <View style={[styles.dropdownMenu, { backgroundColor: isDarkMode ? colors.shelfBg : colors.white }]}>
            <Text style={[styles.dropdownTitle, { color: colors.black }]}>
              Download Status
            </Text>
            {DOWNLOAD_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.dropdownItem,
                  downloadFilter === option.key && styles.dropdownItemSelected,
                  { borderBottomColor: isDarkMode ? colors.gray : colors.grayLine },
                ]}
                onPress={() => handleDownloadSelect(option.key)}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    { color: colors.black },
                    downloadFilter === option.key && styles.dropdownItemTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {downloadFilter === option.key && (
                  <Text style={[styles.dropdownCheck, { color: colors.black }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Filter Row (aligned to right with search)
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPaddingH,
    paddingBottom: 16,
    gap: 16,
  },

  // Dropdown buttons (filter & sort)
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dropdownBtnText: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // Dropdown Modal
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    width: 200,
    borderRadius: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownTitle: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    opacity: 0.5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownItemSelected: {
    // Selected state styling
  },
  dropdownItemText: {
    fontFamily: fonts.playfair.regular,
    fontSize: 16,
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
  },
  dropdownCheck: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
  },

  // List View Styles
  listScrollView: {
    flex: 1,
    paddingHorizontal: spacing.screenPaddingH,
  },
  verticalList: {
    flex: 1,
  },
  verticalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.grayLine,
  },
  verticalCover: {
    width: scale(40),
    height: scale(40),
    borderRadius: 4,
  },
  verticalInfo: {
    flex: 1,
    marginLeft: 12,
  },
  verticalTitle: {
    fontFamily: fonts.playfair.regular,
    fontSize: scale(16),
    color: staticColors.black,
  },
  verticalSeries: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: staticColors.gray,
    marginTop: 2,
  },
  verticalDuration: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(10),
    color: staticColors.gray,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emptyTitle: {
    fontFamily: fonts.playfair.regular,
    fontSize: scale(24),
    color: staticColors.black,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(12),
    color: staticColors.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: staticColors.black,
    borderRadius: 4,
  },
  browseButtonText: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(12),
    color: staticColors.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default LibraryScreen;
