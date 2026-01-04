/**
 * src/features/series/screens/SeriesDetailScreen.tsx
 *
 * Clean series detail screen with progress tracking and batch downloads.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  BookOpen,
  CheckCircle,
  Download,
  ArrowUp,
  ArrowDown,
  CloudDownload,
  Bell,
  BellOff,
  LayoutGrid,
  List,
  Play,
  Heart,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useLibraryCache } from '@/core/cache';
import { apiClient } from '@/core/api';
import { LibraryItem } from '@/core/types';
import { useMyLibraryStore } from '@/features/library/stores/myLibraryStore';
import { usePlayerStore } from '@/features/player';
import { useWishlistStore, useIsSeriesTracked } from '@/features/wishlist';
import { useDownloads } from '@/core/hooks/useDownloads';
import { downloadManager } from '@/core/services/downloadManager';

import { SeriesProgressHeader } from '../components/SeriesProgressHeader';
import { BatchActionButtons } from '../components/BatchActionButtons';
import { SeriesBookRow } from '../components/SeriesBookRow';
import { ThumbnailProgressBar } from '@/shared/components/ThumbnailProgressBar';
import { TOP_NAV_HEIGHT, SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { scale, wp, hp, radius } from '@/shared/theme';
import { useThemeColors, useIsDarkMode } from '@/shared/theme/themeStore';
import { useRenderTracker, useLifecycleTracker } from '@/utils/perfDebug';

type ViewMode = 'list' | 'grid';

// Grid constants for 2-column layout
const SCREEN_WIDTH = wp(100);
const SCREEN_HEIGHT = hp(100);
const GRID_GAP = scale(12);
const GRID_PADDING = scale(16);
const GRID_CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;
const GRID_COVER_SIZE = GRID_CARD_WIDTH;
const CARD_RADIUS = radius.sm;

// Stacked covers constants
const STACK_COVER_SIZE = SCREEN_WIDTH * 0.38;
const STACK_OFFSET = SCREEN_WIDTH * 0.12;
const STACK_ROTATION = 8;
const STACK_VERTICAL_OFFSET = scale(12);
const MAX_STACK_COVERS = 5;

type SeriesDetailRouteParams = {
  SeriesDetail: { seriesName: string };
};

type SortType = 'asc' | 'desc';

// Get raw sequence from book metadata - returns null if unknown
function getRawSequence(item: LibraryItem): number | null {
  const metadata = (item.media?.metadata as any) || {};

  if (metadata.series?.length > 0) {
    const primarySeries = metadata.series[0];
    if (primarySeries.sequence !== undefined && primarySeries.sequence !== null) {
      const parsed = parseFloat(primarySeries.sequence);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
  }

  const seriesName = metadata.seriesName || '';
  const match = seriesName.match(/#([\d.]+)/);
  if (match) {
    return parseFloat(match[1]);
  }

  const titleMatch = (metadata.title || '').match(/Book\s*(\d+)/i);
  if (titleMatch) {
    return parseInt(titleMatch[1], 10);
  }

  return null;
}

function getPublishDate(item: LibraryItem): number {
  const metadata = (item.media?.metadata as any) || {};
  if (metadata.publishedDate) {
    const date = new Date(metadata.publishedDate);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  }
  if (metadata.publishedYear) {
    return new Date(metadata.publishedYear, 0, 1).getTime();
  }
  return 0;
}

function getTitle(item: LibraryItem): string {
  const metadata = (item.media?.metadata as any) || {};
  return (metadata.title || '').toLowerCase();
}

function hasRealSequences(books: LibraryItem[]): boolean {
  if (books.length <= 1) return true;
  const sequences = books.map(getRawSequence).filter(s => s !== null);
  if (sequences.length === 0) return false;
  const uniqueSequences = new Set(sequences);
  return uniqueSequences.size > 1;
}

function getSequenceForDisplay(item: LibraryItem, allBooks: LibraryItem[]): number | null {
  if (!hasRealSequences(allBooks)) {
    return null;
  }
  return getRawSequence(item);
}

function getSequenceForSort(item: LibraryItem, allBooks: LibraryItem[]): { primary: number; secondary: number; tertiary: string } {
  const hasReal = hasRealSequences(allBooks);
  if (hasReal) {
    const seq = getRawSequence(item) ?? 999;
    return { primary: seq, secondary: 0, tertiary: '' };
  } else {
    const pubDate = getPublishDate(item);
    const title = getTitle(item);
    return { primary: 0, secondary: pubDate, tertiary: title };
  }
}

// Stacked book covers component
interface StackedCoversProps {
  bookIds: string[];
}

const StackedCovers = React.memo(function StackedCovers({ bookIds }: StackedCoversProps) {
  const stackBooks = useMemo(() => bookIds.slice(0, Math.min(MAX_STACK_COVERS, bookIds.length)), [bookIds]);
  const count = stackBooks.length;
  const themeColors = useThemeColors();

  const coverUrls = useMemo(() =>
    stackBooks.map(id => apiClient.getItemCoverUrl(id)),
    [stackBooks]
  );

  if (count === 0) {
    return (
      <View style={stackStyles.container}>
        <View style={[stackStyles.cover, stackStyles.placeholder, { backgroundColor: themeColors.surfaceElevated }]}>
          <Text style={stackStyles.placeholderText}>📚</Text>
        </View>
      </View>
    );
  }

  // Dynamic container width based on number of covers
  const containerWidth = STACK_COVER_SIZE + (count - 1) * STACK_OFFSET;

  return (
    <View style={[stackStyles.container, { width: containerWidth }]}>
      {stackBooks.map((bookId, index) => {
        // Fan rotation: left books tilt left, right books tilt right
        const middleIndex = (count - 1) / 2;
        const rotation = (index - middleIndex) * STACK_ROTATION;
        // Z-index: center is highest, sides go down
        const distanceFromCenter = Math.abs(index - middleIndex);
        const zIndex = count - Math.floor(distanceFromCenter);
        // Scale: center is biggest, sides get smaller
        const scaleValue = 1 - (distanceFromCenter * 0.12);
        const coverSize = STACK_COVER_SIZE * scaleValue;
        // Horizontal offset: center each cover at its position
        const sizeDiff = (STACK_COVER_SIZE - coverSize) / 2;
        const horizontalOffset = index * STACK_OFFSET + sizeDiff;
        // Vertical offset: center the smaller covers, then push sides down
        const verticalOffset = sizeDiff + (distanceFromCenter * STACK_VERTICAL_OFFSET);

        return (
          <View
            key={bookId}
            style={[
              stackStyles.coverWrapper,
              {
                left: horizontalOffset,
                top: verticalOffset,
                zIndex,
                transform: [{ rotate: `${rotation}deg` }],
              },
            ]}
          >
            <Image
              source={coverUrls[index]}
              style={[
                stackStyles.cover,
                {
                  width: coverSize,
                  height: coverSize,
                  backgroundColor: themeColors.surfaceElevated,
                },
              ]}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </View>
        );
      })}
    </View>
  );
});

const stackStyles = StyleSheet.create({
  container: {
    // width set dynamically based on number of covers
    height: STACK_COVER_SIZE + STACK_VERTICAL_OFFSET * 2 + 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scale(40),
    marginBottom: 24,
  },
  coverWrapper: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  cover: {
    width: STACK_COVER_SIZE,
    height: STACK_COVER_SIZE,
    borderRadius: radius.sm,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
  },
});

export function SeriesDetailScreen() {
  if (__DEV__) {
    useRenderTracker('SeriesDetailScreen');
    useLifecycleTracker('SeriesDetailScreen');
  }

  const route = useRoute<RouteProp<SeriesDetailRouteParams, 'SeriesDetail'>>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const { seriesName } = route.params;

  const themeColors = useThemeColors();
  const isDarkMode = useIsDarkMode();

  const [sortOrder, setSortOrder] = useState<SortType>('asc');
  const [showDownloadedOnly, setShowDownloadedOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadStatuses, setDownloadStatuses] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const { getSeries, isLoaded, refreshCache } = useLibraryCache();
  const { downloads } = useDownloads();
  const currentBookId = usePlayerStore((s) => s.currentBook?.id);
  const { loadBook } = usePlayerStore();

  const isTracking = useIsSeriesTracked(seriesName);
  const { trackSeries, untrackSeries } = useWishlistStore();
  const { isSeriesFavorite, addSeriesToFavorites, removeSeriesFromFavorites } = useMyLibraryStore();
  const isFavourite = isSeriesFavorite(seriesName);

  const handleTrackToggle = useCallback(() => {
    if (isTracking) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      untrackSeries(seriesName);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      trackSeries(seriesName);
    }
  }, [isTracking, seriesName, trackSeries, untrackSeries]);

  const handleFavouriteToggle = useCallback(() => {
    if (isFavourite) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      removeSeriesFromFavorites(seriesName);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addSeriesToFavorites(seriesName);
    }
  }, [isFavourite, seriesName, addSeriesToFavorites, removeSeriesFromFavorites]);

  const seriesInfo = useMemo(() => {
    if (!isLoaded || !seriesName) return null;
    return getSeries(seriesName);
  }, [isLoaded, seriesName, getSeries]);

  const sortedBooks = useMemo(() => {
    if (!seriesInfo?.books) return [];
    const allBooks = seriesInfo.books;
    const sorted = [...allBooks];
    sorted.sort((a, b) => {
      const sortA = getSequenceForSort(a, allBooks);
      const sortB = getSequenceForSort(b, allBooks);
      const primaryDiff = sortOrder === 'asc' ? sortA.primary - sortB.primary : sortB.primary - sortA.primary;
      if (primaryDiff !== 0) return primaryDiff;
      const secondaryDiff = sortOrder === 'asc' ? sortA.secondary - sortB.secondary : sortB.secondary - sortA.secondary;
      if (secondaryDiff !== 0) return secondaryDiff;
      return sortOrder === 'asc' ? sortA.tertiary.localeCompare(sortB.tertiary) : sortB.tertiary.localeCompare(sortA.tertiary);
    });
    return sorted;
  }, [seriesInfo?.books, sortOrder]);

  const seriesHasRealSequences = useMemo(() => {
    if (!seriesInfo?.books) return true;
    return hasRealSequences(seriesInfo.books);
  }, [seriesInfo?.books]);

  useEffect(() => {
    const checkStatuses = async () => {
      const statuses: Record<string, boolean> = {};
      for (const book of sortedBooks) {
        const status = await downloadManager.getDownloadStatus(book.id);
        statuses[book.id] = status?.status === 'complete';
      }
      setDownloadStatuses(statuses);
    };
    if (sortedBooks.length > 0) {
      checkStatuses();
    }
  }, [sortedBooks, downloads]);

  const displayedBooks = useMemo(() => {
    if (!showDownloadedOnly) return sortedBooks;
    return sortedBooks.filter(book => downloadStatuses[book.id]);
  }, [sortedBooks, showDownloadedOnly, downloadStatuses]);

  const progressStats = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let inProgressBook: LibraryItem | null = null;
    let inProgressPercent = 0;

    sortedBooks.forEach(book => {
      const progress = (book as any).userMediaProgress?.progress || 0;
      if (progress >= 0.95) {
        completed++;
      } else if (progress > 0) {
        inProgress++;
        if (!inProgressBook) {
          inProgressBook = book;
          inProgressPercent = Math.round(progress * 100);
        }
      }
    });

    return { completed, inProgress, inProgressBook, inProgressPercent };
  }, [sortedBooks]);

  const nextBook = useMemo(() => {
    return sortedBooks.find(book => {
      const progress = (book as any).userMediaProgress?.progress || 0;
      return progress < 0.95;
    }) || null;
  }, [sortedBooks]);

  const upNextBook = useMemo(() => {
    return sortedBooks.find(book => {
      const progress = (book as any).userMediaProgress?.progress || 0;
      return progress < 0.95 && book.id !== currentBookId;
    }) || null;
  }, [sortedBooks, currentBookId]);

  const booksToDownload = useMemo(() => {
    return sortedBooks.filter(book => !downloadStatuses[book.id]);
  }, [sortedBooks, downloadStatuses]);

  const allDownloaded = booksToDownload.length === 0;
  const seriesComplete = progressStats.completed === sortedBooks.length;
  const nextBookDownloaded = nextBook ? downloadStatuses[nextBook.id] || false : false;

  useEffect(() => {
    if (displayedBooks.length === 0) return;
    const targetBook = currentBookId ? displayedBooks.find(b => b.id === currentBookId) : upNextBook;
    if (targetBook) {
      const index = displayedBooks.findIndex(b => b.id === targetBook.id);
      if (index > 0 && index < displayedBooks.length) {
        setTimeout(() => {
          try {
            flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
          } catch {
            // Ignore scroll errors if list changed
          }
        }, 300);
      }
    }
  }, [displayedBooks, currentBookId, upNextBook]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main' as never);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshCache();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshCache]);

  const handleBookPress = useCallback((bookId: string) => {
    navigation.navigate('BookDetail', { id: bookId });
  }, [navigation]);

  const handleContinueSeries = useCallback(async () => {
    if (!nextBook) return;
    await loadBook(nextBook, { autoPlay: true, showPlayer: true });
  }, [nextBook, loadBook]);

  // Loading state
  if (!isLoaded) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <StatusBar barStyle={themeColors.statusBar} backgroundColor={themeColors.background} />
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Not found state
  if (!seriesInfo) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <StatusBar barStyle={themeColors.statusBar} backgroundColor={themeColors.background} />
        <View style={[styles.scrollHeader, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <ChevronLeft size={24} color={themeColors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Series</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.emptyContainer}>
          <BookOpen size={48} color={themeColors.textTertiary} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>Series not found</Text>
          <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>This series may have been removed</Text>
        </View>
      </View>
    );
  }

  const bookIds = useMemo(() => sortedBooks.map(b => b.id), [sortedBooks]);
  const firstBookCoverUrl = useMemo(() => bookIds[0] ? apiClient.getItemCoverUrl(bookIds[0]) : null, [bookIds]);

  const totalDuration = sortedBooks.reduce((sum, book) => sum + ((book.media as any)?.duration || 0), 0);
  const formatTotalDuration = () => {
    const hours = Math.floor(totalDuration / 3600);
    return `${hours}h`;
  };

  const handlePlayBook = useCallback(async (book: LibraryItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadBook(book, { autoPlay: true, showPlayer: true });
  }, [loadBook]);

  const renderBookItem = useCallback(({ item }: { item: LibraryItem }) => {
    const isNowPlaying = item.id === currentBookId;
    const isUpNext = item.id === upNextBook?.id && !isNowPlaying;
    const seq = getSequenceForDisplay(item, sortedBooks);

    if (viewMode === 'grid') {
      const metadata = item.media?.metadata as any;
      const title = metadata?.title || 'Unknown';
      const coverUrl = apiClient.getItemCoverUrl(item.id);
      const userProgress = (item as any).userMediaProgress?.progress || 0;

      return (
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => handleBookPress(item.id)}
          activeOpacity={0.8}
        >
          <View style={[styles.gridCoverContainer, { backgroundColor: themeColors.surfaceElevated }]}>
            <Image source={coverUrl} style={styles.gridCover} contentFit="cover" />
            {userProgress > 0 && <ThumbnailProgressBar progress={userProgress} />}

            {/* Sequence badge - top right */}
            {seq !== null && (
              <View style={styles.sequenceBadge}>
                <Text style={styles.sequenceBadgeText}>{seq}</Text>
              </View>
            )}

            {/* Play button - bottom right with shadow */}
            <TouchableOpacity
              style={styles.gridPlayButton}
              onPress={() => handlePlayBook(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Play size={scale(14)} color="#000" fill="#000" strokeWidth={0} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.gridTitle, { color: themeColors.text }]} numberOfLines={2}>{title}</Text>
        </TouchableOpacity>
      );
    }

    return (
      <SeriesBookRow
        book={item}
        sequenceNumber={seq}
        isNowPlaying={isNowPlaying}
        isUpNext={isUpNext}
        onPress={() => handleBookPress(item.id)}
      />
    );
  }, [currentBookId, upNextBook?.id, sortedBooks, handleBookPress, viewMode, themeColors, handlePlayBook]);

  const ListHeader = useMemo(() => (
    <>
      {/* Scrollable blurred background - like BrowseScreen */}
      {firstBookCoverUrl && (
        <View style={styles.heroBackgroundScrollable}>
          <Image
            source={firstBookCoverUrl}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            blurRadius={25}
          />
          <BlurView intensity={30} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={
              isDarkMode
                ? ['transparent', 'transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', themeColors.background]
                : ['transparent', 'transparent', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.7)', themeColors.background]
            }
            locations={[0, 0.5, 0.7, 0.85, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      {/* Header - scrolls with content */}
      <View style={styles.scrollHeader}>
        <TouchableOpacity style={styles.headerActionButton} onPress={handleBack}>
          <ChevronLeft size={scale(18)} color="#000" strokeWidth={2.5} />
        </TouchableOpacity>

        {/* Action Buttons in Header */}
        <View style={styles.headerActions}>
          {/* Track Button */}
          <TouchableOpacity
            style={[
              styles.headerActionButton,
              isTracking && { backgroundColor: '#000' }
            ]}
            onPress={handleTrackToggle}
            activeOpacity={0.7}
          >
            {isTracking ? (
              <BellOff size={scale(16)} color="#fff" strokeWidth={2} />
            ) : (
              <Bell size={scale(16)} color="#000" strokeWidth={2} />
            )}
          </TouchableOpacity>

          {/* Favourite Button */}
          <TouchableOpacity
            style={[
              styles.headerActionButton,
              isFavourite && { backgroundColor: '#E53935' }
            ]}
            onPress={handleFavouriteToggle}
            activeOpacity={0.7}
          >
            <Heart
              size={scale(16)}
              color={isFavourite ? '#fff' : '#000'}
              fill={isFavourite ? '#fff' : 'transparent'}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Series Info with Stacked Covers */}
      <View style={styles.seriesHeader}>
        <StackedCovers bookIds={bookIds} />
        <Text style={[styles.seriesName, { color: themeColors.text }]}>{seriesInfo.name}</Text>

        <Text style={[styles.bookCount, { color: themeColors.textSecondary }]}>
          {seriesInfo.bookCount} {seriesInfo.bookCount === 1 ? 'book' : 'books'} · {formatTotalDuration()}
        </Text>
      </View>

      {/* Progress Header */}
      <SeriesProgressHeader
        books={sortedBooks}
        completedCount={progressStats.completed}
        inProgressCount={progressStats.inProgress}
        nextBook={nextBook}
        currentBook={progressStats.inProgressBook}
        onNextBookPress={(book) => handleBookPress(book.id)}
        onPlayPress={async (book) => {
          await loadBook(book, { autoPlay: true, showPlayer: true });
        }}
      />

      {/* Batch Action Buttons */}
      <BatchActionButtons
        booksToDownload={booksToDownload}
        nextBook={nextBook}
        nextBookDownloaded={nextBookDownloaded}
        allDownloaded={allDownloaded}
        seriesComplete={seriesComplete}
        totalBooks={sortedBooks.length}
        inProgressBook={progressStats.inProgressBook}
        inProgressPercent={progressStats.inProgressPercent}
        onContinue={handleContinueSeries}
        hasRealSequences={seriesHasRealSequences}
      />

      {/* Books section options */}
      <View style={styles.booksSection}>
        {/* Single Options Bar - chip pattern with clear labels */}
        <View style={styles.optionsBar}>
          {/* Downloaded Filter Chip */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: showDownloadedOnly
                  ? themeColors.text
                  : isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                borderColor: showDownloadedOnly ? themeColors.text : 'transparent',
              }
            ]}
            onPress={() => setShowDownloadedOnly(!showDownloadedOnly)}
            activeOpacity={0.7}
          >
            <Download
              size={scale(14)}
              color={showDownloadedOnly ? themeColors.background : themeColors.textSecondary}
              strokeWidth={2}
            />
            <Text style={[
              styles.filterChipText,
              { color: showDownloadedOnly ? themeColors.background : themeColors.textSecondary }
            ]}>
              Downloaded
            </Text>
          </TouchableOpacity>

          {/* Sort Chip */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }
            ]}
            onPress={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            activeOpacity={0.7}
          >
            {sortOrder === 'asc' ? (
              <ArrowUp size={scale(14)} color={themeColors.textSecondary} strokeWidth={2} />
            ) : (
              <ArrowDown size={scale(14)} color={themeColors.textSecondary} strokeWidth={2} />
            )}
            <Text style={[styles.filterChipText, { color: themeColors.textSecondary }]}>
              {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
            </Text>
          </TouchableOpacity>

          {/* View Mode Segmented Control */}
          <View style={[
            styles.segmentedControl,
            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }
          ]}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                viewMode === 'grid' && { backgroundColor: themeColors.text }
              ]}
              onPress={() => setViewMode('grid')}
              activeOpacity={0.7}
            >
              <LayoutGrid
                size={scale(16)}
                color={viewMode === 'grid' ? themeColors.background : themeColors.textSecondary}
                strokeWidth={2}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                viewMode === 'list' && { backgroundColor: themeColors.text }
              ]}
              onPress={() => setViewMode('list')}
              activeOpacity={0.7}
            >
              <List
                size={scale(16)}
                color={viewMode === 'list' ? themeColors.background : themeColors.textSecondary}
                strokeWidth={2}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  ), [
    bookIds, seriesInfo.name, seriesInfo.bookCount, isTracking, handleTrackToggle,
    isFavourite, handleFavouriteToggle,
    sortedBooks, progressStats, nextBook, handleBookPress, loadBook, booksToDownload,
    nextBookDownloaded, allDownloaded, seriesComplete, handleContinueSeries,
    seriesHasRealSequences, showDownloadedOnly, displayedBooks.length, sortOrder,
    viewMode, themeColors, firstBookCoverUrl, isDarkMode, handleBack
  ]);

  const ListEmpty = () => (
    <View style={styles.emptyListContainer}>
      <CloudDownload size={scale(40)} color={themeColors.textTertiary} strokeWidth={1.5} />
      <Text style={[styles.emptyListTitle, { color: themeColors.text }]}>No downloaded books</Text>
      <Text style={[styles.emptyListSubtitle, { color: themeColors.textSecondary }]}>
        Download books to see them here when filtering
      </Text>
      <TouchableOpacity
        style={[styles.downloadFirstButton, { backgroundColor: themeColors.text }]}
        onPress={() => {
          if (sortedBooks[0]) {
            downloadManager.queueDownload(sortedBooks[0]);
          }
        }}
      >
        <Download size={scale(16)} color={themeColors.background} strokeWidth={2} />
        <Text style={[styles.downloadFirstButtonText, { color: themeColors.background }]}>Download First Book</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={themeColors.statusBar} backgroundColor="transparent" translucent />

      {/* Book List - header and background scroll together */}
      <FlatList
        ref={flatListRef}
        data={displayedBooks}
        renderItem={renderBookItem}
        keyExtractor={(item) => item.id}
        key={viewMode}
        numColumns={viewMode === 'grid' ? 2 : 1}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={showDownloadedOnly ? ListEmpty : null}
        style={{ backgroundColor: themeColors.background }}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom,
        }}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        windowSize={5}
        maxToRenderPerBatch={5}
        initialNumToRender={10}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={themeColors.text}
            progressViewOffset={20}
          />
        }
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          }, 100);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroBackgroundScrollable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: scale(550),
    marginTop: -scale(100),
  },
  scrollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  headerActionButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  seriesHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  seriesName: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: scale(4),
  },
  bookCount: {
    fontSize: 14,
    marginTop: scale(4),
  },
  booksSection: {
    paddingTop: scale(16),
    paddingHorizontal: scale(16),
  },
  optionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(12),
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(20),
  },
  filterChipText: {
    fontSize: scale(13),
    fontWeight: '500',
  },
  segmentedControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scale(10),
    padding: scale(3),
    marginLeft: 'auto',
  },
  segmentButton: {
    width: scale(36),
    height: scale(32),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: '700',
  },
  sortControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(12),
    borderWidth: 1,
  },
  filterToggleText: {
    fontSize: scale(12),
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyListContainer: {
    alignItems: 'center',
    paddingVertical: scale(40),
    paddingHorizontal: scale(20),
  },
  emptyListTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    marginTop: scale(12),
  },
  emptyListSubtitle: {
    fontSize: scale(13),
    marginTop: scale(4),
    textAlign: 'center',
  },
  downloadFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginTop: scale(20),
    paddingHorizontal: scale(20),
    paddingVertical: scale(12),
    borderRadius: scale(10),
  },
  downloadFirstButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
  },
  viewModeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: scale(12),
    gap: scale(4),
  },
  viewModeButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: GRID_PADDING,
  },
  gridCard: {
    width: GRID_CARD_WIDTH,
    marginBottom: scale(16),
  },
  gridCoverContainer: {
    position: 'relative',
    width: GRID_COVER_SIZE,
    height: GRID_COVER_SIZE,
    borderRadius: scale(8),
    overflow: 'hidden',
  },
  gridCover: {
    width: '100%',
    height: '100%',
  },
  gridTitle: {
    fontSize: scale(13),
    fontWeight: '500',
    marginTop: scale(8),
    lineHeight: scale(16),
  },
  sequenceBadge: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: scale(6),
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    minWidth: scale(28),
    alignItems: 'center',
  },
  sequenceBadgeText: {
    color: '#fff',
    fontSize: scale(16),
    fontWeight: '700',
  },
  gridPlayButton: {
    position: 'absolute',
    bottom: scale(8),
    right: scale(8),
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});
