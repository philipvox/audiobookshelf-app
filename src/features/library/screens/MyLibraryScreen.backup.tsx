/**
 * src/features/library/screens/MyLibraryScreen.tsx
 *
 * My Library screen with tab-based navigation.
 *
 * Tabs:
 * 1. All - All books with download/stream indicators
 * 2. Downloaded - Downloaded content with management
 * 3. In Progress - Continue listening with hero card
 * 4. Favorites - Liked books, authors, series, narrators
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  FlatList,
  Alert,
  Pressable,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import {
  Download,
  Cloud,
  CheckCircle,
  Play,
  User,
  Mic,
  ChevronRight,
  Search,
  XCircle,
  Library,
  CloudDownload,
  PlayCircle,
  BookOpen,
  Heart,
  type LucideIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useDownloads } from '@/core/hooks/useDownloads';
import { useLibraryCache, getAllAuthors, getAllSeries, getAllNarrators } from '@/core/cache';
import { LibraryItem } from '@/core/types';
import { formatBytes } from '@/shared/utils/format';
import { apiClient } from '@/core/api';
import { usePlayerStore } from '@/features/player';
import { DownloadItem } from '@/features/downloads/components/DownloadItem';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import { SeriesProgressBadge, StackedCovers, BookCardSkeleton, SectionSkeleton } from '@/shared/components';
import { SortPicker, SortOption } from '../components/SortPicker';
import { StorageSummary } from '../components/StorageSummary';
import { ContinueListeningHero } from '../components/ContinueListeningHero';
import { LibraryEmptyState } from '../components/LibraryEmptyState';
import { useMyLibraryStore } from '@/shared/stores/myLibraryStore';
import { usePreferencesStore } from '@/features/recommendations/stores/preferencesStore';
import { useFinishedBookIds } from '@/core/hooks/useUserBooks';
import { useContinueListening } from '@/shared/hooks/useContinueListening';
import { useCompletionStore } from '@/features/completion';
import { TOP_NAV_HEIGHT, SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { useScreenLoadTime } from '@/core/hooks/useScreenLoadTime';
import { fpsMonitor } from '@/utils/runtimeMonitor';
import { scale, spacing, radius, wp } from '@/shared/theme';
import { useThemeColors, useIsDarkMode } from '@/shared/theme/themeStore';
import { SeriesHeartButton } from '@/shared/components';
import { useKidModeStore } from '@/shared/stores/kidModeStore';
import { isKidFriendly } from '@/shared/utils/kidModeFilter';

const HORIZONTAL_CARD_WIDTH = scale(110);
const HORIZONTAL_CARD_COVER = scale(100);

// Fanned series card dimensions
const SCREEN_WIDTH = wp(100);
const PADDING = 16;
const GAP = 12;
const SERIES_CARD_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GAP) / 2;
const COVER_SIZE = 60;
const FAN_OFFSET = 18;
const FAN_ROTATION = 8;
const FAN_VERTICAL_OFFSET = 6;
const MAX_VISIBLE_BOOKS = 5;

// Tab types
type TabType = 'all' | 'downloaded' | 'in-progress' | 'not-started' | 'completed' | 'favorites';

interface TabConfig {
  id: TabType;
  label: string;
  Icon: LucideIcon;
}

// Helper to extract metadata safely
function getMetadata(item: LibraryItem): any {
  return (item.media?.metadata as any) || {};
}

// Get progress from item
function getProgress(item: LibraryItem): number {
  const userProgress = (item as any).userMediaProgress;
  return userProgress?.progress || 0;
}

// Get duration from item
function getDuration(item: LibraryItem): number {
  const media = item.media as any;
  return media?.duration || 0;
}

// Format time remaining
function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

// Format duration
function formatDuration(seconds: number): string {
  if (seconds <= 0) return '';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// Extract series metadata from series name string (e.g., "Harry Potter #1" -> { name: "Harry Potter", sequence: 1 })
function extractSeriesMetadata(seriesName: string): { cleanName: string; sequence?: number } {
  if (!seriesName) return { cleanName: '' };
  const match = seriesName.match(/^(.+?)\s*#([\d.]+)$/);
  if (match) {
    return {
      cleanName: match[1].trim(),
      sequence: parseFloat(match[2]),
    };
  }
  return { cleanName: seriesName };
}

// Compass/browse icon
const BrowseIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
    <Path
      d="M14.31 8l-5.31 2.16L12 15.31l5.31-2.16L14.31 8z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Download icon for empty state
const DownloadIcon = ({ size = 48, color = 'rgba(255,255,255,0.3)' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Checkmark icon
const CheckIcon = ({ size = 12, color = '#4ADE80' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 12l5 5L20 7"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface EnrichedBook {
  id: string;
  item: LibraryItem;
  title: string;
  author: string;
  seriesName: string;
  sequence?: number;
  progress: number;
  duration: number;
  totalBytes: number;
  lastPlayedAt?: number;
  addedAt?: number;
  isDownloaded?: boolean;
}

interface SeriesGroup {
  name: string;
  books: EnrichedBook[];
  totalBooks: number;
  downloadedCount: number;
  completedCount: number;
  inProgressCount: number;
}

// Tab configuration - simplified to main categories
const TAB_LABELS: Record<TabType, string> = {
  'all': 'All',
  'downloaded': 'Downloaded',
  'in-progress': 'In Progress',
  'not-started': 'Not Started',
  'completed': 'Finished',
  'favorites': 'Favorites',
};

// Ordered tabs for display
const TAB_ORDER: TabType[] = ['all', 'downloaded', 'in-progress', 'completed', 'favorites'];

// Tab bar component - Home-style large text tabs
const TabBar = React.memo(function TabBar({
  activeTab,
  onTabChange,
  themeColors,
}: {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  counts: Record<TabType, number>;
  themeColors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabBar}
      style={styles.tabBarContainer}
    >
      {TAB_ORDER.map((tabId) => {
        const isActive = activeTab === tabId;
        return (
          <TouchableOpacity
            key={tabId}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onTabChange(tabId);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={styles.textTab}
          >
            <Text style={[
              styles.textTabLabel,
              { color: isActive ? themeColors.text : themeColors.textTertiary },
            ]}>
              {TAB_LABELS[tabId]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
});

// Fanned Series Card Component
interface FannedSeriesCardData {
  name: string;
  books: Array<{ id: string }>;
  bookCount?: number;
}

const FannedSeriesCard = React.memo(function FannedSeriesCard({
  series,
  onPress,
  themeColors,
  isDarkMode,
}: {
  series: FannedSeriesCardData;
  onPress: () => void;
  themeColors: ReturnType<typeof useThemeColors>;
  isDarkMode: boolean;
}) {
  // Get cover URLs for up to 5 books
  const bookCovers = useMemo(() => {
    return (series.books || []).slice(0, MAX_VISIBLE_BOOKS).map(book => apiClient.getItemCoverUrl(book.id));
  }, [series.books]);

  const numCovers = bookCovers.length;
  const cardBgColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const bookCount = series.bookCount ?? series.books?.length ?? 0;

  return (
    <TouchableOpacity
      style={[styles.fannedSeriesCard, { backgroundColor: cardBgColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Heart button - top right */}
      <SeriesHeartButton
        seriesName={series.name}
        size={10}
        showCircle
        style={styles.fannedHeartButton}
      />

      {/* Fanned covers */}
      <View style={styles.fannedCoverFan}>
        {numCovers > 0 ? (
          <View style={[
            styles.fannedFanContainer,
            { width: COVER_SIZE + (numCovers - 1) * FAN_OFFSET }
          ]}>
            {bookCovers.map((coverUrl, idx) => {
              const middleIndex = (numCovers - 1) / 2;
              const rotation = (idx - middleIndex) * FAN_ROTATION;
              const distanceFromCenter = Math.abs(idx - middleIndex);
              const zIndex = numCovers - Math.floor(distanceFromCenter);
              const scaleValue = 1 - (distanceFromCenter * 0.12);
              const coverSize = COVER_SIZE * scaleValue;
              const sizeOffset = (COVER_SIZE - coverSize) / 2;
              const verticalOffset = sizeOffset + (distanceFromCenter * FAN_VERTICAL_OFFSET);
              const horizontalOffset = idx * FAN_OFFSET + sizeOffset;

              return (
                <Image
                  key={idx}
                  source={coverUrl}
                  style={[
                    styles.fannedCover,
                    {
                      width: coverSize,
                      height: coverSize,
                      left: horizontalOffset,
                      top: verticalOffset,
                      zIndex,
                      transform: [{ rotate: `${rotation}deg` }],
                    },
                  ]}
                  contentFit="cover"
                  transition={150}
                />
              );
            })}
          </View>
        ) : null}
      </View>

      {/* Series name */}
      <Text style={[styles.fannedSeriesName, { color: themeColors.text }]} numberOfLines={2}>
        {series.name}
      </Text>
      <Text style={[styles.fannedBookCount, { color: themeColors.textSecondary }]}>
        {bookCount} {bookCount === 1 ? 'book' : 'books'}
      </Text>
    </TouchableOpacity>
  );
});

export function MyLibraryScreen() {
  useScreenLoadTime('MyLibraryScreen');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const themeColors = useThemeColors();
  const isDarkMode = useIsDarkMode();
  const { items: cachedItems, isLoaded, getSeries, getItem, loadCache, currentLibraryId } = useLibraryCache();
  const { downloads, pauseDownload, resumeDownload, deleteDownload } = useDownloads();
  const { loadBook } = usePlayerStore();

  // Favorites from stores
  const libraryIds = useMyLibraryStore((state) => state.libraryIds);
  const favoriteSeriesNames = useMyLibraryStore((state) => state.favoriteSeriesNames);
  const favoriteAuthors = usePreferencesStore((state) => state.favoriteAuthors);
  const favoriteNarrators = usePreferencesStore((state) => state.favoriteNarrators);

  // Reading history (marked as finished) - uses SQLite user_books table
  const finishedBookIds = useFinishedBookIds();

  // Completion store - manual marks via completion sheet (syncs with server isFinished)
  const isCompleteInStore = useCompletionStore((state) => state.isComplete);

  // Combined finished check: marked in user_books OR marked complete via completion store
  const isMarkedFinished = useCallback((bookId: string) => {
    return finishedBookIds.has(bookId) || isCompleteInStore(bookId);
  }, [finishedBookIds, isCompleteInStore]);

  // Continue listening data from server API - source of truth for in-progress books
  const { items: continueListeningItems, refetch: refetchContinueListening } = useContinueListening();

  // Kid Mode filter state
  const kidModeEnabled = useKidModeStore((state) => state.enabled);

  // Tab, sort, and search state
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [sort, setSort] = useState<SortOption>('recently-played');
  const [searchQuery, setSearchQuery] = useState('');

  // Separate active downloads from completed
  const activeDownloads = useMemo(
    () => downloads.filter((d) => d.status === 'downloading' || d.status === 'pending' || d.status === 'paused' || d.status === 'error'),
    [downloads]
  );

  const completedDownloads = useMemo(
    () => downloads.filter((d) => d.status === 'complete'),
    [downloads]
  );

  // O(1) lookup map for download status - prevents O(n²) in loops
  const downloadMap = useMemo(
    () => new Map(completedDownloads.map(d => [d.itemId, d])),
    [completedDownloads]
  );

  // Get total storage used
  const totalStorageUsed = useMemo(() => {
    return completedDownloads.reduce((sum, d) => sum + (d.totalBytes || 0), 0);
  }, [completedDownloads]);

  // Enrich downloads with book metadata
  const enrichedBooks = useMemo<EnrichedBook[]>(() => {
    if (!isLoaded) return [];

    return completedDownloads.map((download) => {
      const item = getItem(download.itemId);
      if (!item) {
        return {
          id: download.itemId,
          item: {} as LibraryItem,
          title: 'Unknown Title',
          author: 'Unknown Author',
          seriesName: '',
          progress: 0,
          duration: 0,
          totalBytes: download.totalBytes || 0,
        };
      }

      const metadata = getMetadata(item);
      const { cleanName: seriesName, sequence } = extractSeriesMetadata(metadata.seriesName || '');

      return {
        id: download.itemId,
        item,
        title: metadata.title || 'Unknown Title',
        author: metadata.authorName || metadata.authors?.[0]?.name || 'Unknown Author',
        seriesName,
        sequence,
        progress: getProgress(item),
        duration: getDuration(item),
        totalBytes: download.totalBytes || 0,
        lastPlayedAt: (item as any).userMediaProgress?.lastUpdate,
        addedAt: item.addedAt,
        isDownloaded: true,
      };
    });
  }, [completedDownloads, getItem, isLoaded]);

  // Server in-progress books - source of truth from API /api/me/items-in-progress
  // These may not be downloaded but user has listened to them
  const serverInProgressBooks = useMemo<EnrichedBook[]>(() => {
    return continueListeningItems.map((item) => {
      const metadata = getMetadata(item);
      const { cleanName: seriesName, sequence } = extractSeriesMetadata(metadata.seriesName || '');
      const download = downloadMap.get(item.id);

      return {
        id: item.id,
        item,
        title: metadata.title || 'Unknown Title',
        author: metadata.authorName || metadata.authors?.[0]?.name || 'Unknown Author',
        seriesName,
        sequence,
        progress: (item as any).userMediaProgress?.progress || 0,
        duration: getDuration(item),
        totalBytes: download?.totalBytes || 0,
        lastPlayedAt: (item as any).progressLastUpdate || (item as any).userMediaProgress?.lastUpdate,
        addedAt: item.addedAt,
        isDownloaded: !!download,
      };
    });
  }, [continueListeningItems, downloadMap]);

  // Get favorited books (heart icon) from cache
  const favoritedBooks = useMemo((): EnrichedBook[] => {
    if (!isLoaded || !cachedItems) return [];

    const result: EnrichedBook[] = [];

    for (const bookId of libraryIds) {
      const item = getItem(bookId);
      if (!item) continue;

      const metadata = getMetadata(item);
      const { cleanName: seriesName, sequence } = extractSeriesMetadata(metadata.seriesName || '');

      // Check if also downloaded - O(1) lookup
      const download = downloadMap.get(bookId);

      result.push({
        id: bookId,
        item,
        title: metadata.title || 'Unknown Title',
        author: metadata.authorName || metadata.authors?.[0]?.name || 'Unknown Author',
        seriesName,
        sequence,
        progress: getProgress(item),
        duration: getDuration(item),
        totalBytes: download?.totalBytes || 0,
        lastPlayedAt: (item as any).userMediaProgress?.lastUpdate,
        addedAt: item.addedAt,
        isDownloaded: !!download,
      });
    }

    return result;
  }, [libraryIds, cachedItems, isLoaded, downloadMap, getItem]);

  // "All" = union of downloaded + favorited + in-progress books (deduplicated)
  // Apply Kid Mode filter to show only kid-friendly content
  const allLibraryBooks = useMemo<EnrichedBook[]>(() => {
    const bookMap = new Map<string, EnrichedBook>();

    // Add all downloaded books first (they have complete data)
    for (const book of enrichedBooks) {
      // Skip non-kid-friendly books when Kid Mode is enabled
      if (kidModeEnabled && book.item && !isKidFriendly(book.item)) continue;
      bookMap.set(book.id, book);
    }

    // Add server in-progress books (user has listened, may not be downloaded)
    for (const book of serverInProgressBooks) {
      if (!bookMap.has(book.id)) {
        // Skip non-kid-friendly books when Kid Mode is enabled
        if (kidModeEnabled && book.item && !isKidFriendly(book.item)) continue;
        bookMap.set(book.id, book);
      }
    }

    // Add favorited books (mark if also downloaded)
    for (const book of favoritedBooks) {
      if (!bookMap.has(book.id)) {
        // Skip non-kid-friendly books when Kid Mode is enabled
        if (kidModeEnabled && book.item && !isKidFriendly(book.item)) continue;
        bookMap.set(book.id, book);
      }
    }

    return Array.from(bookMap.values());
  }, [enrichedBooks, serverInProgressBooks, favoritedBooks, kidModeEnabled]);

  // Get books marked as finished from SQLite (includes non-downloaded books)
  const markedFinishedBooks = useMemo<EnrichedBook[]>(() => {
    if (!isLoaded) return [];

    const result: EnrichedBook[] = [];

    // Create Set for O(1) lookup - prevent O(n²)
    const enrichedBookIds = new Set(enrichedBooks.map(b => b.id));

    for (const bookId of finishedBookIds) {
      // Skip if already in enrichedBooks (downloaded) - O(1) lookup
      if (enrichedBookIds.has(bookId)) continue;

      const item = getItem(bookId);
      if (!item) continue;

      const metadata = getMetadata(item);
      const { cleanName: seriesName, sequence } = extractSeriesMetadata(metadata.seriesName || '');

      result.push({
        id: bookId,
        item,
        title: metadata.title || 'Unknown Title',
        author: metadata.authorName || metadata.authors?.[0]?.name || 'Unknown Author',
        seriesName,
        sequence,
        progress: getProgress(item),
        duration: getDuration(item),
        totalBytes: 0,
        lastPlayedAt: (item as any).userMediaProgress?.lastUpdate,
        addedAt: item.addedAt,
        isDownloaded: false,
      });
    }

    return result;
  }, [isLoaded, finishedBookIds, enrichedBooks, getItem]);

  // Calculate tab counts
  const tabCounts = useMemo(() => {
    // In-progress: use server in-progress books (source of truth from API)
    const inProgressCount = serverInProgressBooks.length;

    // Not started: downloaded books with 0 progress (not marked finished)
    const notStartedCount = enrichedBooks.filter(b =>
      b.progress === 0 && !isMarkedFinished(b.id)
    ).length;

    // Completed includes:
    // 1. Downloaded books with progress >= 0.95 OR marked as finished
    // 2. Non-downloaded books marked as finished (from markedFinishedBooks)
    const downloadedCompletedCount = enrichedBooks.filter(b =>
      b.progress >= 0.95 || isMarkedFinished(b.id)
    ).length;
    const completedCount = downloadedCompletedCount + markedFinishedBooks.length;

    const downloadedCount = enrichedBooks.length;
    const favoritesCount = libraryIds.length + favoriteSeriesNames.length +
                           favoriteAuthors.length + favoriteNarrators.length;
    const allCount = allLibraryBooks.length;

    return {
      'all': allCount,
      'downloaded': downloadedCount,
      'in-progress': inProgressCount,
      'not-started': notStartedCount,
      'completed': completedCount,
      'favorites': favoritesCount,
    } as Record<TabType, number>;
  }, [allLibraryBooks.length, enrichedBooks, serverInProgressBooks.length, libraryIds.length,
      favoriteSeriesNames.length, favoriteAuthors.length, favoriteNarrators.length,
      isMarkedFinished, markedFinishedBooks.length]);

  // Get books for current tab
  const currentTabBooks = useMemo(() => {
    switch (activeTab) {
      case 'downloaded':
        return enrichedBooks;
      case 'in-progress':
        // Use server in-progress books (source of truth from API)
        return serverInProgressBooks;
      case 'not-started':
        // Downloaded books with 0 progress (not marked finished)
        return enrichedBooks.filter(b => b.progress === 0 && !isMarkedFinished(b.id));
      case 'completed':
        // Include:
        // 1. Downloaded books with progress >= 0.95 OR marked as finished
        // 2. Non-downloaded books marked as finished (from markedFinishedBooks)
        const downloadedCompleted = enrichedBooks.filter(b => b.progress >= 0.95 || isMarkedFinished(b.id));
        return [...downloadedCompleted, ...markedFinishedBooks];
      case 'favorites':
        return favoritedBooks;
      default:
        return allLibraryBooks;
    }
  }, [activeTab, enrichedBooks, serverInProgressBooks, favoritedBooks, allLibraryBooks, isMarkedFinished, markedFinishedBooks]);

  // Apply sort
  const sortedBooks = useMemo(() => {
    const sorted = [...currentTabBooks];

    switch (sort) {
      case 'recently-played':
        return sorted.sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
      case 'recently-added':
        return sorted.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
      case 'title-asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'title-desc':
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      case 'author-asc':
        return sorted.sort((a, b) => a.author.localeCompare(b.author));
      case 'duration-asc':
        return sorted.sort((a, b) => a.duration - b.duration);
      case 'duration-desc':
        return sorted.sort((a, b) => b.duration - a.duration);
      default:
        return sorted;
    }
  }, [currentTabBooks, sort]);

  // Apply search filter
  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) {
      return sortedBooks;
    }

    const query = searchQuery.toLowerCase().trim();
    return sortedBooks.filter(b =>
      b.title.toLowerCase().includes(query) ||
      b.author.toLowerCase().includes(query) ||
      b.seriesName?.toLowerCase().includes(query)
    );
  }, [sortedBooks, searchQuery]);

  // In-progress books for Continue Listening section
  const inProgressBooks = useMemo(() => {
    if (activeTab === 'favorites') return [];
    return filteredBooks.filter(b => b.progress > 0 && b.progress < 0.95);
  }, [filteredBooks, activeTab]);

  // Get favorite authors/series/narrators data
  const favoriteAuthorData = useMemo(() => {
    if (!isLoaded) return [];
    const allAuthorsMap = getAllAuthors();
    return favoriteAuthors
      .map(name => allAuthorsMap.find(a => a.name === name))
      .filter(Boolean);
  }, [favoriteAuthors, isLoaded]);

  const favoriteSeriesData = useMemo(() => {
    if (!isLoaded) return [];
    const allSeriesMap = getAllSeries();
    return favoriteSeriesNames
      .map(name => allSeriesMap.find(s => s.name === name))
      .filter(Boolean);
  }, [favoriteSeriesNames, isLoaded]);

  const favoriteNarratorData = useMemo(() => {
    if (!isLoaded) return [];
    const allNarratorsMap = getAllNarrators();
    return favoriteNarrators
      .map(name => allNarratorsMap.find(n => n.name === name))
      .filter(Boolean);
  }, [favoriteNarrators, isLoaded]);

  // Group books by series
  const seriesGroups = useMemo<SeriesGroup[]>(() => {
    const seriesMap = new Map<string, EnrichedBook[]>();

    for (const book of filteredBooks) {
      if (book.seriesName) {
        const existing = seriesMap.get(book.seriesName) || [];
        existing.push(book);
        seriesMap.set(book.seriesName, existing);
      }
    }

    return Array.from(seriesMap.entries()).map(([name, books]) => {
      // Get full series info from cache
      const seriesInfo = getSeries(name);
      const totalBooks = seriesInfo?.books?.length || books.length;

      return {
        name,
        books: books.sort((a, b) => (a.sequence || 999) - (b.sequence || 999)),
        totalBooks,
        downloadedCount: books.length,
        completedCount: books.filter(b => b.progress >= 0.95).length,
        inProgressCount: books.filter(b => b.progress > 0 && b.progress < 0.95).length,
      };
    });
  }, [filteredBooks, getSeries]);

  // Refresh handler - refreshes library data and continue listening from server
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    if (!currentLibraryId) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadCache(currentLibraryId, true), // forceRefresh = true
        refetchContinueListening(),
      ]);
    } catch (error) {
      // Silently fail - cache will show stale data
    } finally {
      setIsRefreshing(false);
    }
  }, [currentLibraryId, loadCache, refetchContinueListening]);

  // Navigation handlers
  const handleProfilePress = () => navigation.navigate('Main', { screen: 'ProfileTab' });
  const handleDiscoverPress = () => navigation.navigate('Main', { screen: 'DiscoverTab' });
  const handleHomePress = () => navigation.navigate('Main', { screen: 'HomeTab' });
  const handleBrowse = () => navigation.navigate('DiscoverTab');
  const handleBookPress = (itemId: string) => navigation.navigate('BookDetail', { id: itemId });
  const handleSeriesPress = (seriesName: string) => navigation.navigate('SeriesDetail', { seriesName });
  const handleManageStorage = () => navigation.navigate('Main', { screen: 'ProfileTab' });

  // Resume book playback
  const handleResumeBook = useCallback(async (book: EnrichedBook) => {
    try {
      const fullBook = await apiClient.getItem(book.id);
      await loadBook(fullBook, { autoPlay: true, showPlayer: false });
    } catch {
      if (book.item) {
        await loadBook(book.item, { autoPlay: true, showPlayer: false });
      }
    }
  }, [loadBook]);

  // Play book from beginning
  const handlePlayBook = useCallback(async (book: EnrichedBook) => {
    if (book.progress >= 0.95) {
      // Completed book - ask to restart
      Alert.alert(
        'Restart Book?',
        'This book is completed. Would you like to start from the beginning?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restart',
            onPress: async () => {
              try {
                const fullBook = await apiClient.getItem(book.id);
                await loadBook(fullBook, { autoPlay: true, showPlayer: false, startPosition: 0 });
              } catch {
                if (book.item) {
                  await loadBook(book.item, { autoPlay: true, showPlayer: false, startPosition: 0 });
                }
              }
            },
          },
        ]
      );
    } else {
      handleResumeBook(book);
    }
  }, [loadBook, handleResumeBook]);

  // Pause/Resume all downloads
  const handlePauseAll = useCallback(() => {
    activeDownloads.forEach(d => {
      if (d.status === 'downloading') {
        pauseDownload(d.itemId);
      }
    });
  }, [activeDownloads, pauseDownload]);

  const handleResumeAll = useCallback(() => {
    activeDownloads.forEach(d => {
      if (d.status === 'paused') {
        resumeDownload(d.itemId);
      }
    });
  }, [activeDownloads, resumeDownload]);

  const hasDownloading = activeDownloads.some(d => d.status === 'downloading');
  const hasPaused = activeDownloads.some(d => d.status === 'paused');

  const hasContent = completedDownloads.length > 0 || activeDownloads.length > 0;

  // Render Continue Listening card
  const renderContinueListeningCard = useCallback(({ item }: { item: EnrichedBook }) => {
    const coverUrl = apiClient.getItemCoverUrl(item.id);
    const progressPct = Math.round(item.progress * 100);
    const timeRemaining = item.duration * (1 - item.progress);

    return (
      <TouchableOpacity
        style={styles.horizontalCard}
        onPress={() => handleResumeBook(item)}
        onLongPress={() => handleBookPress(item.id)}
        activeOpacity={0.9}
      >
        <View style={styles.horizontalCardCoverContainer}>
          <Image
            source={coverUrl}
            style={styles.horizontalCardCover}
            contentFit="cover"
            transition={200}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.cardGradient}
          />
          <View style={styles.horizontalCardProgress}>
            <View style={[styles.horizontalCardProgressFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.cardProgressText}>{progressPct}%</Text>
        </View>
        <Text style={[styles.horizontalCardTitle, { color: themeColors.text }]} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.horizontalCardSubtitle, { color: themeColors.textSecondary }]}>{formatTimeRemaining(timeRemaining)}</Text>
      </TouchableOpacity>
    );
  }, [handleResumeBook, handleBookPress]);

  // Render book row with download/stream indicator
  const renderBookRow = useCallback((book: EnrichedBook, showIndicator = true) => {
    const coverUrl = apiClient.getItemCoverUrl(book.id);
    // Check both server progress AND manual mark from galleryStore
    const isCompleted = book.progress >= 0.95 || isMarkedFinished(book.id);
    const isDownloaded = book.isDownloaded || book.totalBytes > 0;

    const progressText = book.progress > 0 && book.progress < 0.95
      ? `, ${Math.round(book.progress * 100)}% complete`
      : isCompleted ? ', completed' : '';
    const downloadText = isDownloaded ? ', downloaded' : '';

    return (
      <TouchableOpacity
        key={book.id}
        style={styles.bookRow}
        onPress={() => handleBookPress(book.id)}
        activeOpacity={0.7}
        accessibilityLabel={`${book.title} by ${book.author}${progressText}${downloadText}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to view book details"
      >
        <View style={styles.bookCoverContainer}>
          <Image source={coverUrl} style={styles.bookCover} contentFit="cover" />
          {/* Download/Stream indicator */}
          {showIndicator && (
            <View style={[styles.statusBadge, isDownloaded ? [styles.downloadedBadge, { backgroundColor: themeColors.text }] : styles.streamBadge]}>
              {isDownloaded ? (
                <CheckCircle size={scale(10)} color={themeColors.background} strokeWidth={2.5} />
              ) : (
                <Cloud size={scale(10)} color={themeColors.background} strokeWidth={2} />
              )}
            </View>
          )}
          {isCompleted && (
            <View style={styles.completedBadge}>
              <CheckCircle size={14} color={themeColors.text} strokeWidth={2} />
            </View>
          )}
        </View>

        <View style={styles.bookInfo}>
          <Text style={[styles.bookTitle, { color: themeColors.text }]} numberOfLines={1}>{book.title}</Text>
          <Text style={[styles.bookAuthor, { color: themeColors.textSecondary }]} numberOfLines={1}>{book.author}</Text>
          <View style={styles.bookMetaRow}>
            <Text style={[styles.bookMeta, { color: themeColors.textSecondary }]}>{formatDuration(book.duration)}</Text>
            {book.progress > 0 && book.progress < 0.95 && (
              <Text style={[styles.bookProgress, { color: themeColors.text }]}>{Math.round(book.progress * 100)}%</Text>
            )}
          </View>
          {/* Progress bar for in-progress books */}
          {book.progress > 0 && book.progress < 0.95 && (
            <View style={[styles.bookProgressBar, { backgroundColor: themeColors.border }]}>
              <View style={[styles.bookProgressFill, { width: `${book.progress * 100}%`, backgroundColor: themeColors.text }]} />
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: themeColors.text }]}
          onPress={() => handlePlayBook(book)}
          activeOpacity={0.7}
          accessibilityLabel={`Play ${book.title}`}
          accessibilityRole="button"
        >
          <Play size={18} color={themeColors.background} fill={themeColors.background} strokeWidth={0} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [handleBookPress, handlePlayBook, isMarkedFinished, themeColors]);

  // Render favorite author card
  const renderAuthorCard = useCallback((author: any) => {
    if (!author) return null;
    const bookCount = author.books?.length || 0;

    return (
      <TouchableOpacity
        key={author.name}
        style={styles.personCard}
        onPress={() => navigation.navigate('AuthorDetail', { name: author.name })}
        activeOpacity={0.7}
        accessibilityLabel={`${author.name}, ${bookCount} book${bookCount !== 1 ? 's' : ''}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to view author"
      >
        <View style={[styles.personAvatar, { backgroundColor: themeColors.border }]}>
          {author.imageUrl ? (
            <Image source={author.imageUrl} style={styles.personImage} contentFit="cover" />
          ) : (
            <User size={scale(24)} color={themeColors.textSecondary} strokeWidth={1.5} />
          )}
        </View>
        <Text style={[styles.personName, { color: themeColors.text }]} numberOfLines={1}>{author.name}</Text>
        <Text style={[styles.personMeta, { color: themeColors.textSecondary }]}>{bookCount} book{bookCount !== 1 ? 's' : ''}</Text>
      </TouchableOpacity>
    );
  }, [navigation, themeColors]);

  // Render favorite narrator card
  const renderNarratorCard = useCallback((narrator: any) => {
    if (!narrator) return null;
    const bookCount = narrator.books?.length || 0;

    return (
      <TouchableOpacity
        key={narrator.name}
        style={styles.personCard}
        onPress={() => navigation.navigate('NarratorDetail', { name: narrator.name })}
        activeOpacity={0.7}
        accessibilityLabel={`${narrator.name}, narrator, ${bookCount} book${bookCount !== 1 ? 's' : ''}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to view narrator"
      >
        <View style={[styles.personAvatar, { backgroundColor: themeColors.border }]}>
          <Mic size={scale(24)} color={themeColors.textSecondary} strokeWidth={1.5} />
        </View>
        <Text style={[styles.personName, { color: themeColors.text }]} numberOfLines={1}>{narrator.name}</Text>
        <Text style={[styles.personMeta, { color: themeColors.textSecondary }]}>{bookCount} book{bookCount !== 1 ? 's' : ''}</Text>
      </TouchableOpacity>
    );
  }, [navigation, themeColors]);

  // Render favorite series card - uses StackedCovers per design spec
  const renderFavoriteSeriesCard = useCallback((series: any) => {
    if (!series) return null;
    const bookCount = series.books?.length || 0;
    // Get cover URLs for stacked display (up to 3 books)
    const coverUrls = (series.books || []).slice(0, 3).map((book: any) =>
      apiClient.getItemCoverUrl(book.id)
    );

    return (
      <TouchableOpacity
        key={series.name}
        style={[styles.favoriteSeriesCard, { backgroundColor: themeColors.border }]}
        onPress={() => handleSeriesPress(series.name)}
        activeOpacity={0.7}
        accessibilityLabel={`${series.name} series, ${bookCount} book${bookCount !== 1 ? 's' : ''}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to view series"
      >
        <View style={styles.seriesCoversContainer}>
          <StackedCovers
            coverUrls={coverUrls}
            size={40}
            offset={10}
            maxCovers={3}
          />
        </View>
        <View style={styles.favoriteSeriesInfo}>
          <Text style={[styles.favoriteSeriesName, { color: themeColors.text }]} numberOfLines={1}>{series.name}</Text>
          <Text style={[styles.favoriteSeriesMeta, { color: themeColors.textSecondary }]}>{bookCount} book{bookCount !== 1 ? 's' : ''}</Text>
        </View>
        <ChevronRight size={scale(16)} color={themeColors.textSecondary} strokeWidth={2} />
      </TouchableOpacity>
    );
  }, [handleSeriesPress, themeColors]);

  // Render series card
  const renderSeriesCard = useCallback((series: SeriesGroup) => {
    // Calculate time remaining for in-progress books
    const timeRemaining = series.books.reduce((total, book) => {
      if (book.progress > 0 && book.progress < 0.95) {
        return total + book.duration * (1 - book.progress);
      }
      return total;
    }, 0);

    // Get cover URLs for stacked display
    const coverUrls = series.books.slice(0, 3).map(book => apiClient.getItemCoverUrl(book.id));

    const progressText = series.completedCount > 0
      ? `${series.completedCount} of ${series.totalBooks} complete`
      : `${series.downloadedCount} of ${series.totalBooks} downloaded`;

    return (
      <TouchableOpacity
        key={series.name}
        style={[styles.seriesCard, { backgroundColor: themeColors.border }]}
        onPress={() => handleSeriesPress(series.name)}
        activeOpacity={0.8}
        accessibilityLabel={`${series.name} series, ${progressText}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to view series"
      >
        <View style={styles.seriesCoversContainer}>
          <StackedCovers
            coverUrls={coverUrls}
            size={40}
            offset={10}
            maxCovers={3}
          />
        </View>

        <View style={styles.seriesInfo}>
          <Text style={[styles.seriesName, { color: themeColors.text }]} numberOfLines={1}>{series.name}</Text>
          <Text style={[styles.seriesStats, { color: themeColors.textSecondary }]}>
            {series.downloadedCount} of {series.totalBooks} downloaded
          </Text>

          {/* Series Progress Badge */}
          <SeriesProgressBadge
            completed={series.completedCount}
            inProgress={series.inProgressCount}
            total={series.totalBooks}
            timeRemaining={timeRemaining}
          />
        </View>
      </TouchableOpacity>
    );
  }, [handleSeriesPress, themeColors]);

  // Check if there's any content in the library (downloaded or favorited)
  const hasAnyContent = allLibraryBooks.length > 0 || activeDownloads.length > 0 ||
                        favoriteSeriesNames.length > 0 || favoriteAuthors.length > 0 ||
                        favoriteNarrators.length > 0;

  // Render Favorites tab content
  const renderFavoritesContent = () => {
    const hasFavoriteBooks = favoritedBooks.length > 0;
    const hasFavoriteAuthors = favoriteAuthorData.length > 0;
    const hasFavoriteSeries = favoriteSeriesData.length > 0;
    const hasFavoriteNarrators = favoriteNarratorData.length > 0;
    const hasAnyFavorites = hasFavoriteBooks || hasFavoriteAuthors || hasFavoriteSeries || hasFavoriteNarrators;

    if (!hasAnyFavorites) {
      return <LibraryEmptyState tab="favorites" onAction={handleBrowse} />;
    }

    return (
      <>
        {/* Favorite Books */}
        {hasFavoriteBooks && (
          <View style={styles.section}>
            <SectionHeader title={`Favorite Books (${favoritedBooks.length})`} showViewAll={false} />
            {favoritedBooks.map(book => renderBookRow(book))}
          </View>
        )}

        {/* Favorite Authors */}
        {hasFavoriteAuthors && (
          <View style={styles.section}>
            <SectionHeader title={`Favorite Authors (${favoriteAuthorData.length})`} showViewAll={false} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {favoriteAuthorData.map(author => renderAuthorCard(author))}
            </ScrollView>
          </View>
        )}

        {/* Favorite Series - 2-column fanned cards */}
        {hasFavoriteSeries && (
          <View style={styles.section}>
            <SectionHeader title={`Favorite Series (${favoriteSeriesData.length})`} showViewAll={false} />
            <View style={styles.fannedSeriesGrid}>
              {favoriteSeriesData.map((series: any) => (
                <FannedSeriesCard
                  key={series.name}
                  series={series}
                  onPress={() => handleSeriesPress(series.name)}
                  themeColors={themeColors}
                  isDarkMode={isDarkMode}
                />
              ))}
            </View>
          </View>
        )}

        {/* Favorite Narrators */}
        {hasFavoriteNarrators && (
          <View style={styles.section}>
            <SectionHeader title={`Favorite Narrators (${favoriteNarratorData.length})`} showViewAll={false} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {favoriteNarratorData.map(narrator => renderNarratorCard(narrator))}
            </ScrollView>
          </View>
        )}
      </>
    );
  };

  // Render In Progress tab content
  const renderInProgressContent = () => {
    const inProgressItems = enrichedBooks.filter(b => b.progress > 0 && b.progress < 0.95);

    if (inProgressItems.length === 0) {
      return <LibraryEmptyState tab="in-progress" onAction={handleBrowse} />;
    }

    // Sort by most recently played
    const sortedItems = [...inProgressItems].sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
    const heroItem = sortedItems[0];
    const otherItems = sortedItems.slice(1);

    // Group in-progress items by series
    const inProgressSeriesMap = new Map<string, EnrichedBook[]>();
    for (const book of inProgressItems) {
      if (book.seriesName) {
        const existing = inProgressSeriesMap.get(book.seriesName) || [];
        existing.push(book);
        inProgressSeriesMap.set(book.seriesName, existing);
      }
    }

    // Convert to series data format for FannedSeriesCard
    const inProgressSeriesData = Array.from(inProgressSeriesMap.entries())
      .filter(([_, books]) => books.length >= 1)
      .map(([name, books]) => {
        const seriesInfo = getSeries(name);
        return {
          name,
          books: books.sort((a, b) => (a.sequence || 999) - (b.sequence || 999)),
          bookCount: seriesInfo?.books?.length || books.length,
        };
      });

    return (
      <>
        {/* Hero Continue Listening Card */}
        {heroItem && (
          <View style={styles.heroSection}>
            <TouchableOpacity
              style={styles.heroCard}
              onPress={() => handleResumeBook(heroItem)}
              activeOpacity={0.9}
            >
              <Image
                source={apiClient.getItemCoverUrl(heroItem.id)}
                style={styles.heroCover}
                contentFit="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.9)']}
                style={styles.heroGradient}
              />
              <View style={styles.heroContent}>
                <Text style={styles.heroLabel}>Continue Listening</Text>
                <Text style={styles.heroTitle} numberOfLines={2}>{heroItem.title}</Text>
                <Text style={styles.heroAuthor}>{heroItem.author}</Text>
                <View style={styles.heroProgressContainer}>
                  <View style={styles.heroProgressBar}>
                    <View style={[styles.heroProgressFill, { width: `${Math.round(heroItem.progress * 100)}%` }]} />
                  </View>
                  <Text style={styles.heroProgressText}>
                    {formatTimeRemaining(heroItem.duration * (1 - heroItem.progress))}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.heroPlayButton, { backgroundColor: themeColors.background }]}
                onPress={() => handleResumeBook(heroItem)}
              >
                <Play size={scale(28)} color={themeColors.text} fill={themeColors.text} strokeWidth={0} />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        )}

        {/* Other In Progress Items */}
        {otherItems.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title={`More In Progress (${otherItems.length})`} showViewAll={false} />
            {otherItems.map(book => renderBookRow(book))}
          </View>
        )}

        {/* In Progress Series - 2-column fanned cards */}
        {inProgressSeriesData.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title={`Series In Progress (${inProgressSeriesData.length})`} showViewAll={false} />
            <View style={styles.fannedSeriesGrid}>
              {inProgressSeriesData.map((series) => (
                <FannedSeriesCard
                  key={series.name}
                  series={series}
                  onPress={() => handleSeriesPress(series.name)}
                  themeColors={themeColors}
                  isDarkMode={isDarkMode}
                />
              ))}
            </View>
          </View>
        )}
      </>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={themeColors.statusBar} backgroundColor={themeColors.background} />

      {/* Content */}
      {!isLoaded ? (
        /* Loading state with skeletons */
        <View style={[styles.scrollContent, { paddingTop: insets.top + TOP_NAV_HEIGHT + 16 }]}>
          <View style={styles.skeletonTitleContainer}>
            <View style={styles.skeletonTitle} />
          </View>
          <View style={styles.skeletonSearchBar} />
          <SectionSkeleton cardCount={4} showHeader />
          <View style={{ marginTop: 16 }}>
            <BookCardSkeleton />
            <BookCardSkeleton style={{ marginTop: 8 }} />
            <BookCardSkeleton style={{ marginTop: 8 }} />
            <BookCardSkeleton style={{ marginTop: 8 }} />
          </View>
        </View>
      ) : !hasAnyContent ? (
        <View style={[styles.emptyContainer, { paddingTop: insets.top + TOP_NAV_HEIGHT + 16 }]}>
          <LibraryEmptyState tab="all" onAction={handleBrowse} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + TOP_NAV_HEIGHT + 16 }]}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => fpsMonitor.start('libraryScroll')}
          onScrollEndDrag={() => fpsMonitor.stop()}
          onMomentumScrollEnd={() => fpsMonitor.stop()}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={themeColors.text}
            />
          }
        >
          {/* Tab Bar - replaces screen title */}
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} counts={tabCounts} themeColors={themeColors} />

          {/* Search Bar - under tabs */}
          <View style={styles.searchBarContainer}>
            <View style={[styles.searchBar, { backgroundColor: themeColors.border }]}>
              <Search size={scale(18)} color={themeColors.textSecondary} strokeWidth={2} />
              <TextInput
                style={[styles.searchInput, { color: themeColors.text }]}
                placeholder="Search library..."
                placeholderTextColor={themeColors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Search your library"
                accessibilityHint="Enter book title, author, or series name"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Clear search"
                  accessibilityRole="button"
                >
                  <XCircle size={scale(18)} color={themeColors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Sort Picker (not shown on Favorites tab) */}
          {activeTab !== 'favorites' && activeTab !== 'in-progress' && (
            <SortPicker
              selected={sort}
              onSelect={setSort}
              bookCount={filteredBooks.length}
            />
          )}

          {/* =============== TAB CONTENT =============== */}
          {activeTab === 'favorites' ? (
            renderFavoritesContent()
          ) : activeTab === 'in-progress' ? (
            renderInProgressContent()
          ) : (
            <>
              {/* =============== CONTINUE LISTENING HERO (All tab) =============== */}
              {activeTab === 'all' && continueListeningItems.length > 0 && (() => {
                const heroItem = continueListeningItems[0];
                const progress = heroItem.userMediaProgress?.progress || 0;
                const duration = (heroItem.media as any)?.duration || 0;
                const remainingSeconds = duration * (1 - progress);

                // Only show if genuinely in progress (not complete)
                if (progress <= 0 || progress >= 0.95) return null;

                return (
                  <ContinueListeningHero
                    book={heroItem}
                    progress={progress}
                    remainingSeconds={remainingSeconds}
                    onPlay={async () => {
                      try {
                        const fullBook = await apiClient.getItem(heroItem.id);
                        await loadBook(fullBook, { autoPlay: true, showPlayer: false });
                      } catch {
                        await loadBook(heroItem, { autoPlay: true, showPlayer: false });
                      }
                    }}
                    onPress={() => handleBookPress(heroItem.id)}
                  />
                );
              })()}

              {/* =============== 1. DOWNLOADING SECTION =============== */}
              {activeDownloads.length > 0 && (activeTab === 'all' || activeTab === 'downloaded') && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderWithAction}>
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                      Downloading ({activeDownloads.length})
                    </Text>
                    {hasDownloading && (
                      <TouchableOpacity onPress={handlePauseAll}>
                        <Text style={[styles.sectionAction, { color: themeColors.text }]}>Pause All</Text>
                      </TouchableOpacity>
                    )}
                    {!hasDownloading && hasPaused && (
                      <TouchableOpacity onPress={handleResumeAll}>
                        <Text style={[styles.sectionAction, { color: themeColors.text }]}>Resume All</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.downloadList}>
                    {activeDownloads.map((download) => (
                      <DownloadItem
                        key={download.itemId}
                        download={download}
                        onPause={() => pauseDownload(download.itemId)}
                        onResume={() => resumeDownload(download.itemId)}
                        onDelete={() => deleteDownload(download.itemId)}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* =============== 2. BOOKS SECTION =============== */}
              {filteredBooks.length > 0 ? (
                <View style={styles.section}>
                  <SectionHeader
                    title={
                      activeTab === 'downloaded' ? `Downloaded Books (${filteredBooks.length})` :
                      activeTab === 'not-started' ? `Not Started (${filteredBooks.length})` :
                      activeTab === 'completed' ? `Completed (${filteredBooks.length})` :
                      `Books (${filteredBooks.length})`
                    }
                    showViewAll={false}
                  />
                  {filteredBooks.map(book => renderBookRow(book, activeTab === 'all'))}
                </View>
              ) : (activeTab === 'not-started' || activeTab === 'completed') && (
                <LibraryEmptyState tab={activeTab} onAction={handleBrowse} />
              )}

              {/* =============== 3. SERIES SECTION - 2-column fanned cards =============== */}
              {activeTab === 'all' && favoriteSeriesData.length > 0 && (
                <View style={styles.section}>
                  <SectionHeader
                    title={`Series (${favoriteSeriesData.length})`}
                    showViewAll={false}
                  />
                  <View style={styles.fannedSeriesGrid}>
                    {favoriteSeriesData.map((series: any) => (
                      <FannedSeriesCard
                        key={series.name}
                        series={series}
                        onPress={() => handleSeriesPress(series.name)}
                        themeColors={themeColors}
                        isDarkMode={isDarkMode}
                      />
                    ))}
                  </View>
                </View>
              )}
              {seriesGroups.length > 0 && activeTab === 'downloaded' && (
                <View style={styles.section}>
                  <SectionHeader
                    title={`Downloaded Series (${seriesGroups.length})`}
                    showViewAll={false}
                  />
                  <View style={styles.fannedSeriesGrid}>
                    {seriesGroups.map((series) => (
                      <FannedSeriesCard
                        key={series.name}
                        series={series}
                        onPress={() => handleSeriesPress(series.name)}
                        themeColors={themeColors}
                        isDarkMode={isDarkMode}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* =============== 4. AUTHORS SECTION (All tab) =============== */}
              {activeTab === 'all' && favoriteAuthorData.length > 0 && (
                <View style={styles.section}>
                  <SectionHeader
                    title={`Authors (${favoriteAuthorData.length})`}
                    showViewAll={false}
                  />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalList}
                  >
                    {favoriteAuthorData.map(author => renderAuthorCard(author))}
                  </ScrollView>
                </View>
              )}

              {/* =============== 5. NARRATORS SECTION (All tab) =============== */}
              {activeTab === 'all' && favoriteNarratorData.length > 0 && (
                <View style={styles.section}>
                  <SectionHeader
                    title={`Narrators (${favoriteNarratorData.length})`}
                    showViewAll={false}
                  />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalList}
                  >
                    {favoriteNarratorData.map(narrator => renderNarratorCard(narrator))}
                  </ScrollView>
                </View>
              )}

              {/* =============== STORAGE SUMMARY (Downloaded tab) =============== */}
              {activeTab === 'downloaded' && (
                <StorageSummary
                  usedBytes={totalStorageUsed}
                  bookCount={enrichedBooks.length}
                  onManagePress={handleManageStorage}
                />
              )}
            </>
          )}

          {/* =============== BROWSE CTA =============== */}
          <View style={styles.bottomCta}>
            <Text style={[styles.bottomCtaText, { color: themeColors.textSecondary }]}>Looking for more?</Text>
            <TouchableOpacity style={[styles.browseButtonOutline, { borderColor: themeColors.text }]} onPress={handleBrowse}>
              <BrowseIcon size={18} color={themeColors.text} />
              <Text style={[styles.browseButtonOutlineText, { color: themeColors.text }]}>Browse Library</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor set dynamically via themeColors
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SCREEN_BOTTOM_PADDING,
  },

  // Search bar - now under tabs
  searchBarContainer: {
    paddingHorizontal: scale(20),
    marginBottom: scale(16),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    gap: scale(10),
    minHeight: scale(44),
  },
  searchInput: {
    flex: 1,
    fontSize: scale(15),
    paddingVertical: scale(4),
  },

  // Tab bar - Home-style large text tabs
  tabBarContainer: {
    marginBottom: scale(12),
  },
  tabBar: {
    paddingHorizontal: scale(20),
    gap: scale(14),
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  textTab: {
    paddingVertical: scale(2),
  },
  textTabLabel: {
    fontSize: scale(26),
    fontWeight: '400',
  },

  // Sections
  section: {
    marginBottom: scale(24),
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    marginBottom: scale(12),
  },
  sectionTitle: {
    fontSize: scale(18),
    fontWeight: '600',
  },
  sectionAction: {
    fontSize: scale(14),
    fontWeight: '500',
  },

  // Horizontal sections
  horizontalList: {
    paddingHorizontal: scale(20),
    gap: scale(12),
  },

  // Horizontal cards
  horizontalCard: {
    width: HORIZONTAL_CARD_WIDTH,
  },
  horizontalCardCoverContainer: {
    width: HORIZONTAL_CARD_COVER,
    height: HORIZONTAL_CARD_COVER,
    borderRadius: scale(10),
    overflow: 'hidden',
    marginBottom: scale(8),
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  horizontalCardCover: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  horizontalCardProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  horizontalCardProgressFill: {
    height: '100%',
    backgroundColor: '#FFF',
  },
  cardProgressText: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    fontSize: scale(11),
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  horizontalCardTitle: {
    fontSize: scale(12),
    fontWeight: '500',
    // color set dynamically via themeColors.text
    lineHeight: scale(16),
  },
  horizontalCardSubtitle: {
    fontSize: scale(10),
    // color set dynamically via themeColors.textSecondary
    marginTop: 2,
  },

  // Download list
  downloadList: {
    paddingHorizontal: scale(16),
  },

  // Book row
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
    gap: scale(12),
  },
  bookCoverContainer: {
    position: 'relative',
    width: scale(60),
    height: scale(60),
    borderRadius: scale(8),
    overflow: 'hidden',
  },
  bookCover: {
    width: '100%',
    height: '100%',
    borderRadius: scale(8),
  },
  statusBadge: {
    position: 'absolute',
    bottom: scale(4),
    right: scale(4),
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadedBadge: {
    // backgroundColor set dynamically via themeColors.text
  },
  streamBadge: {
    backgroundColor: 'rgba(100, 150, 255, 0.9)',
  },
  completedBadge: {
    position: 'absolute',
    top: scale(4),
    right: scale(4),
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: scale(15),
    fontWeight: '500',
  },
  bookAuthor: {
    fontSize: scale(13),
    marginTop: scale(2),
  },
  bookMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginTop: scale(4),
  },
  bookMeta: {
    fontSize: scale(12),
  },
  bookProgress: {
    fontSize: scale(12),
    fontWeight: '500',
  },
  bookProgressBar: {
    height: scale(3),
    borderRadius: scale(2),
    marginTop: scale(6),
    overflow: 'hidden',
  },
  bookProgressFill: {
    height: '100%',
    borderRadius: scale(2),
  },
  playButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Series card
  seriesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: scale(20),
    marginBottom: scale(12),
    padding: scale(12),
    borderRadius: scale(12),
    gap: scale(12),
  },
  seriesCoversContainer: {
    width: scale(70),
    height: scale(70),
    alignItems: 'center',
    justifyContent: 'center',
  },
  seriesInfo: {
    flex: 1,
  },
  seriesName: {
    fontSize: scale(15),
    fontWeight: '600',
    marginBottom: scale(4),
  },
  seriesStats: {
    fontSize: scale(12),
    marginBottom: scale(6),
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(40),
  },

  // Bottom CTA
  bottomCta: {
    alignItems: 'center',
    paddingVertical: scale(32),
    paddingHorizontal: scale(20),
  },
  bottomCtaText: {
    fontSize: scale(14),
    marginBottom: scale(12),
  },
  browseButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    gap: scale(8),
  },
  browseButtonOutlineText: {
    fontSize: scale(14),
    fontWeight: '500',
  },

  // Hero section (In Progress tab)
  heroSection: {
    paddingHorizontal: scale(20),
    marginBottom: scale(24),
  },
  heroCard: {
    width: '100%',
    height: scale(200),
    borderRadius: scale(16),
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  heroCover: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  heroContent: {
    position: 'absolute',
    left: scale(16),
    bottom: scale(16),
    right: scale(70),
  },
  heroLabel: {
    fontSize: scale(13),
    fontWeight: '600',
    color: '#000',
    letterSpacing: 0.5,
    marginBottom: scale(4),
  },
  heroTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: '#FFF',
    marginBottom: scale(2),
  },
  heroAuthor: {
    fontSize: scale(13),
    color: 'rgba(255,255,255,0.7)',
    marginBottom: scale(8),
  },
  heroProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  heroProgressBar: {
    flex: 1,
    height: scale(4),
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: scale(2),
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: scale(2),
  },
  heroProgressText: {
    fontSize: scale(11),
    color: 'rgba(255,255,255,0.7)',
  },
  heroPlayButton: {
    position: 'absolute',
    right: scale(16),
    bottom: scale(16),
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    // backgroundColor set dynamically via themeColors.background
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Person cards (authors, narrators)
  personCard: {
    width: scale(90),
    alignItems: 'center',
  },
  personAvatar: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(35),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(8),
    overflow: 'hidden',
  },
  personImage: {
    width: '100%',
    height: '100%',
  },
  personName: {
    fontSize: scale(12),
    fontWeight: '500',
    textAlign: 'center',
  },
  personMeta: {
    fontSize: scale(10),
    marginTop: scale(2),
  },

  // Favorite series card
  favoriteSeriesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: scale(20),
    marginBottom: scale(10),
    padding: scale(12),
    borderRadius: scale(12),
    gap: scale(12),
  },
  favoriteSeriesInfo: {
    flex: 1,
  },
  favoriteSeriesName: {
    fontSize: scale(14),
    fontWeight: '500',
  },
  favoriteSeriesMeta: {
    fontSize: scale(12),
    marginTop: scale(2),
  },

  // Fanned series card styles (2-column grid)
  fannedSeriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: PADDING,
    gap: GAP,
  },
  fannedSeriesCard: {
    width: SERIES_CARD_WIDTH,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  fannedHeartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  fannedCoverFan: {
    height: COVER_SIZE + 10,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fannedFanContainer: {
    position: 'relative',
    height: COVER_SIZE,
  },
  fannedCover: {
    position: 'absolute',
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: 5,
    backgroundColor: 'rgba(128,128,128,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  fannedSeriesName: {
    fontSize: scale(13),
    fontWeight: '600',
    lineHeight: scale(17),
    textAlign: 'center',
  },
  fannedBookCount: {
    fontSize: scale(11),
    textAlign: 'center',
    marginTop: 2,
  },

  // Skeleton loading styles
  skeletonTitleContainer: {
    paddingHorizontal: scale(20),
    marginBottom: scale(12),
  },
  skeletonTitle: {
    width: scale(140),
    height: scale(28),
    borderRadius: scale(6),
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  skeletonSearchBar: {
    marginHorizontal: scale(20),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginBottom: scale(16),
  },
});

export default MyLibraryScreen;
