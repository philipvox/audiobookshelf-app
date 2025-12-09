/**
 * src/features/library/screens/MyLibraryScreen.tsx
 *
 * My Library screen - shows downloaded content with filtering and sorting.
 *
 * Sections:
 * 1. Filter chips (All, In Progress, Not Started, Completed)
 * 2. Sort picker + book count
 * 3. Downloading section (if active)
 * 4. Continue Listening (in-progress books)
 * 5. Downloaded books (list view)
 * 6. Your Series (with progress)
 * 7. Storage summary
 * 8. Browse Library CTA
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  RefreshControl,
  FlatList,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDownloads } from '@/core/hooks/useDownloads';
import { useLibraryCache, useCoverUrl } from '@/core/cache';
import { LibraryItem } from '@/core/types';
import { formatBytes } from '@/shared/utils/format';
import { apiClient } from '@/core/api';
import { usePlayerStore } from '@/features/player';
import { DownloadItem } from '@/features/downloads/components/DownloadItem';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import { FilterChips, FilterOption } from '../components/FilterChips';
import { SortPicker, SortOption } from '../components/SortPicker';
import { StorageSummary } from '../components/StorageSummary';
import { TOP_NAV_HEIGHT } from '@/constants/layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

const COLORS = {
  background: '#000000',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  accent: '#c1f40c',
  cardBg: 'rgba(255, 255, 255, 0.08)',
};

const HORIZONTAL_CARD_WIDTH = scale(110);
const HORIZONTAL_CARD_COVER = scale(100);

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
}

interface SeriesGroup {
  name: string;
  books: EnrichedBook[];
  totalBooks: number;
  downloadedCount: number;
  completedCount: number;
  inProgressCount: number;
}

export function MyLibraryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { items: cachedItems, isLoaded, getSeries, getItem } = useLibraryCache();
  const { downloads, pauseDownload, resumeDownload, deleteDownload } = useDownloads();
  const { loadBook } = usePlayerStore();

  // Filter and sort state
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sort, setSort] = useState<SortOption>('recently-played');

  // Separate active downloads from completed
  const activeDownloads = useMemo(
    () => downloads.filter((d) => d.status === 'downloading' || d.status === 'pending' || d.status === 'paused' || d.status === 'error'),
    [downloads]
  );

  const completedDownloads = useMemo(
    () => downloads.filter((d) => d.status === 'complete'),
    [downloads]
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
      const seriesName = metadata.seriesName || '';
      const sequenceMatch = seriesName.match(/^(.+?)\s*#([\d.]+)$/);
      const cleanSeriesName = sequenceMatch ? sequenceMatch[1].trim() : seriesName;
      const sequence = sequenceMatch ? parseFloat(sequenceMatch[2]) : undefined;

      return {
        id: download.itemId,
        item,
        title: metadata.title || 'Unknown Title',
        author: metadata.authorName || metadata.authors?.[0]?.name || 'Unknown Author',
        seriesName: cleanSeriesName,
        sequence,
        progress: getProgress(item),
        duration: getDuration(item),
        totalBytes: download.totalBytes || 0,
        lastPlayedAt: (item as any).userMediaProgress?.lastUpdate,
        addedAt: item.addedAt,
      };
    });
  }, [completedDownloads, getItem, isLoaded]);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const all = enrichedBooks.length;
    const inProgress = enrichedBooks.filter(b => b.progress > 0 && b.progress < 0.95).length;
    const notStarted = enrichedBooks.filter(b => b.progress === 0).length;
    const completed = enrichedBooks.filter(b => b.progress >= 0.95).length;
    return { all, inProgress, notStarted, completed };
  }, [enrichedBooks]);

  // Apply filter
  const filteredBooks = useMemo(() => {
    switch (filter) {
      case 'in-progress':
        return enrichedBooks.filter(b => b.progress > 0 && b.progress < 0.95);
      case 'not-started':
        return enrichedBooks.filter(b => b.progress === 0);
      case 'completed':
        return enrichedBooks.filter(b => b.progress >= 0.95);
      default:
        return enrichedBooks;
    }
  }, [enrichedBooks, filter]);

  // Apply sort
  const sortedBooks = useMemo(() => {
    const sorted = [...filteredBooks];

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
  }, [filteredBooks, sort]);

  // Separate in-progress books for Continue Listening section
  const inProgressBooks = useMemo(() => {
    if (filter === 'not-started' || filter === 'completed') return [];
    return sortedBooks.filter(b => b.progress > 0 && b.progress < 0.95);
  }, [sortedBooks, filter]);

  // Downloaded books section (exclude in-progress unless filtered to in-progress)
  const downloadedBooksList = useMemo(() => {
    if (filter === 'in-progress') return sortedBooks;
    return sortedBooks.filter(b => b.progress === 0 || b.progress >= 0.95);
  }, [sortedBooks, filter]);

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

  // Refresh handler
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  }, []);

  // Navigation handlers
  const handleProfilePress = () => navigation.navigate('Main', { screen: 'ProfileTab' });
  const handleDiscoverPress = () => navigation.navigate('Main', { screen: 'DiscoverTab' });
  const handleHomePress = () => navigation.navigate('Main', { screen: 'HomeTab' });
  const handleBrowse = () => navigation.navigate('DiscoverTab');
  const handleBookPress = (itemId: string) => navigation.navigate('BookDetail', { id: itemId });
  const handleSeriesPress = (seriesName: string) => navigation.navigate('SeriesDetail', { name: seriesName });
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
        <Text style={styles.horizontalCardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.horizontalCardSubtitle}>{formatTimeRemaining(timeRemaining)}</Text>
      </TouchableOpacity>
    );
  }, [handleResumeBook, handleBookPress]);

  // Render downloaded book row
  const renderBookRow = useCallback((book: EnrichedBook) => {
    const coverUrl = apiClient.getItemCoverUrl(book.id);
    const isCompleted = book.progress >= 0.95;

    return (
      <TouchableOpacity
        key={book.id}
        style={styles.bookRow}
        onPress={() => handleBookPress(book.id)}
        activeOpacity={0.7}
      >
        <View style={styles.bookCoverContainer}>
          <Image source={coverUrl} style={styles.bookCover} contentFit="cover" />
          <View style={styles.downloadedBadge}>
            <CheckIcon size={10} color="#FFFFFF" />
          </View>
          {isCompleted && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.accent} />
            </View>
          )}
        </View>

        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={1}>{book.title}</Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>
          <Text style={styles.bookMeta}>{formatDuration(book.duration)}</Text>
        </View>

        <TouchableOpacity
          style={styles.playButton}
          onPress={() => handlePlayBook(book)}
          activeOpacity={0.7}
        >
          <Ionicons name="play" size={18} color="#000" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [handleBookPress, handlePlayBook]);

  // Render series card
  const renderSeriesCard = useCallback((series: SeriesGroup) => {
    const firstBook = series.books[0];
    const coverUrl = firstBook ? apiClient.getItemCoverUrl(firstBook.id) : undefined;
    const progressPercent = series.totalBooks > 0
      ? Math.round((series.completedCount / series.totalBooks) * 100)
      : 0;

    return (
      <TouchableOpacity
        key={series.name}
        style={styles.seriesCard}
        onPress={() => handleSeriesPress(series.name)}
        activeOpacity={0.8}
      >
        <View style={styles.seriesCoversContainer}>
          {/* Stacked covers */}
          {series.books.slice(0, 2).reverse().map((book, idx) => (
            <View
              key={book.id}
              style={[
                styles.seriesCover,
                { left: idx * 8, top: idx * 4, zIndex: 2 - idx },
              ]}
            >
              <Image
                source={apiClient.getItemCoverUrl(book.id)}
                style={styles.seriesCoverImage}
                contentFit="cover"
              />
            </View>
          ))}
        </View>

        <View style={styles.seriesInfo}>
          <Text style={styles.seriesName} numberOfLines={1}>{series.name}</Text>
          <Text style={styles.seriesStats}>
            {series.downloadedCount} of {series.totalBooks} downloaded
          </Text>
          <Text style={styles.seriesProgress}>
            {series.completedCount} listened · {series.inProgressCount} in progress
          </Text>

          {/* Progress bar */}
          <View style={styles.seriesProgressBar}>
            <View style={[styles.seriesProgressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [handleSeriesPress]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* TopNav is now rendered at the navigator level */}

      {/* Content */}
      {!hasContent ? (
        <View style={[styles.emptyContainer, { paddingTop: insets.top + TOP_NAV_HEIGHT + 16 }]}>
          <DownloadIcon size={scale(64)} />
          <Text style={styles.emptyTitle}>Your library is empty</Text>
          <Text style={styles.emptySubtitle}>
            Download books from Discover to build your collection and listen offline.
          </Text>
          <TouchableOpacity style={styles.browseButton} onPress={handleBrowse}>
            <BrowseIcon size={20} color="#000" />
            <Text style={styles.browseButtonText}>Browse Books</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + TOP_NAV_HEIGHT + 16 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.accent}
            />
          }
        >
          {/* Screen Title */}
          <Text style={styles.screenTitle}>My Library</Text>

          {/* Filter Chips */}
          <FilterChips
            selected={filter}
            onSelect={setFilter}
            counts={filterCounts}
          />

          {/* Sort Picker + Book Count */}
          <SortPicker
            selected={sort}
            onSelect={setSort}
            bookCount={filteredBooks.length}
          />

          {/* =============== DOWNLOADING SECTION =============== */}
          {activeDownloads.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderWithAction}>
                <Text style={styles.sectionTitle}>
                  Downloading ({activeDownloads.length})
                </Text>
                {hasDownloading && (
                  <TouchableOpacity onPress={handlePauseAll}>
                    <Text style={styles.sectionAction}>Pause All</Text>
                  </TouchableOpacity>
                )}
                {!hasDownloading && hasPaused && (
                  <TouchableOpacity onPress={handleResumeAll}>
                    <Text style={styles.sectionAction}>Resume All</Text>
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

          {/* =============== CONTINUE LISTENING SECTION =============== */}
          {inProgressBooks.length > 0 && filter !== 'not-started' && filter !== 'completed' && (
            <View style={styles.horizontalSection}>
              <SectionHeader
                title={`Continue Listening (${inProgressBooks.length})`}
                showViewAll={false}
              />
              <FlatList
                data={inProgressBooks}
                renderItem={renderContinueListeningCard}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />
            </View>
          )}

          {/* =============== DOWNLOADED BOOKS SECTION =============== */}
          {downloadedBooksList.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title={`Downloaded (${downloadedBooksList.length})`}
                showViewAll={false}
              />
              {downloadedBooksList.map(renderBookRow)}
            </View>
          )}

          {/* =============== YOUR SERIES SECTION =============== */}
          {seriesGroups.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title={`Your Series (${seriesGroups.length})`}
                showViewAll={false}
              />
              {seriesGroups.map(renderSeriesCard)}
            </View>
          )}

          {/* =============== STORAGE SUMMARY =============== */}
          <StorageSummary
            usedBytes={totalStorageUsed}
            onManagePress={handleManageStorage}
          />

          {/* =============== BROWSE CTA =============== */}
          <View style={styles.bottomCta}>
            <Text style={styles.bottomCtaText}>Looking for more?</Text>
            <TouchableOpacity style={styles.browseButtonOutline} onPress={handleBrowse}>
              <BrowseIcon size={18} color={COLORS.accent} />
              <Text style={styles.browseButtonOutlineText}>Browse Library</Text>
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
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 100,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  libraryButtonActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(193, 244, 12, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    gap: 8,
    borderWidth: 1,
    borderColor: '#c1f40c',
  },
  libraryButtonTextActive: {
    color: '#c1f40c',
    fontSize: 10,
    letterSpacing: 0.2,
    fontWeight: '600',
  },
  libraryIcon: {
    width: 14,
    height: 16,
    position: 'relative',
  },
  libraryIconBack: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 10,
    height: 14,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(193, 244, 12, 0.5)',
    backgroundColor: 'transparent',
  },
  libraryIconFront: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 10,
    height: 14,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#c1f40c',
    backgroundColor: 'rgba(193, 244, 12, 0.1)',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scale(100),
  },

  // Screen title
  screenTitle: {
    fontSize: scale(28),
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingHorizontal: scale(20),
    marginBottom: scale(8),
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
    color: COLORS.textPrimary,
  },
  sectionAction: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.accent,
  },

  // Horizontal sections
  horizontalSection: {
    marginBottom: scale(24),
  },
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
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  horizontalCardProgressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
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
    color: '#fff',
    lineHeight: scale(16),
  },
  horizontalCardSubtitle: {
    fontSize: scale(10),
    color: 'rgba(255,255,255,0.5)',
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
  downloadedBadge: {
    position: 'absolute',
    bottom: scale(4),
    right: scale(4),
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: COLORS.textPrimary,
  },
  bookAuthor: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  bookMeta: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(4),
  },
  playButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.accent,
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
    backgroundColor: COLORS.cardBg,
    borderRadius: scale(12),
    gap: scale(12),
  },
  seriesCoversContainer: {
    width: scale(70),
    height: scale(70),
    position: 'relative',
  },
  seriesCover: {
    position: 'absolute',
    width: scale(55),
    height: scale(55),
    borderRadius: scale(6),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  seriesCoverImage: {
    width: '100%',
    height: '100%',
  },
  seriesInfo: {
    flex: 1,
  },
  seriesName: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  seriesStats: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  seriesProgress: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
    marginTop: scale(2),
    marginBottom: scale(8),
  },
  seriesProgressBar: {
    height: scale(4),
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: scale(2),
    overflow: 'hidden',
  },
  seriesProgressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: scale(2),
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(40),
  },
  emptyTitle: {
    fontSize: scale(20),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
    marginBottom: scale(24),
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: scale(24),
    paddingVertical: scale(12),
    borderRadius: scale(24),
    gap: scale(8),
  },
  browseButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: '#000000',
  },

  // Bottom CTA
  bottomCta: {
    alignItems: 'center',
    paddingVertical: scale(32),
    paddingHorizontal: scale(20),
  },
  bottomCtaText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginBottom: scale(12),
  },
  browseButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    gap: scale(8),
  },
  browseButtonOutlineText: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.accent,
  },
});

export default MyLibraryScreen;
