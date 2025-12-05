/**
 * src/features/library/screens/MyLibraryScreen.tsx
 *
 * User's library matching home page design:
 * - Recently Listened section at top (list view)
 * - Your Books section below (grid view)
 */

import React, { useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useMyLibraryStore } from '../stores/myLibraryStore';
import { useLibraryCache, getCoverUrl, getAllSeries } from '@/core/cache';
import { usePlayerStore } from '@/features/player';
import { apiClient } from '@/core/api';
import { queryKeys } from '@/core/queryClient';
import { Icon } from '@/shared/components/Icon';
import { EmptyState, HeartButton, SeriesHeartButton, BookListItem } from '@/shared/components';
import { LibraryItem } from '@/core/types';
import { LibraryBackground } from '../components/LibraryBackground';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

// Grid constants
const GRID_PADDING = scale(29);
const GRID_GAP = scale(10);
const NUM_COLUMNS = 3;
const CARD_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

// Series card constants - horizontal stack design (matching SearchScreen)
const SERIES_COLUMNS = 3;
const SERIES_GAP = 8;
const SERIES_CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - SERIES_GAP * (SERIES_COLUMNS - 1)) / SERIES_COLUMNS;
const SERIES_COVER_SIZE = SERIES_CARD_WIDTH * 0.55;
const MAX_VISIBLE_BOOKS = 10;

// Colors
const BG_COLOR = '#000000';
const ACCENT = '#C8FF00';

type LibraryScreenParams = {
  scrollToSeries?: boolean;
};

export function MyLibraryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ Library: LibraryScreenParams }, 'Library'>>();
  const scrollViewRef = useRef<ScrollView>(null);
  const seriesSectionY = useRef<number>(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Use pre-cached library data
  const { items: cachedItems, isLoaded } = useLibraryCache();
  const { loadBook, currentBook: playerCurrentBook } = usePlayerStore();

  const {
    libraryIds,
    isSelecting,
    selectedIds,
    toggleSelection,
    startSelecting,
    stopSelecting,
    selectAll,
    clearSelection,
    removeMultiple,
    favoriteSeriesNames,
  } = useMyLibraryStore();

  // Get all series and filter to favorites
  const allSeries = useMemo(() => getAllSeries(), [isLoaded]);
  const favoriteSeries = useMemo(() => {
    return allSeries.filter(s => favoriteSeriesNames.includes(s.name));
  }, [allSeries, favoriteSeriesNames]);

  // Scroll to series section if requested
  React.useEffect(() => {
    if (route.params?.scrollToSeries && seriesSectionY.current > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: seriesSectionY.current, animated: true });
      }, 100);
    }
  }, [route.params?.scrollToSeries]);

  // Fetch items in progress (for Recently Listened)
  const {
    data: inProgressItems = [],
    refetch: refetchProgress,
  } = useQuery({
    queryKey: queryKeys.user.inProgress(),
    queryFn: async () => {
      const items = await apiClient.getItemsInProgress();
      return items.sort((a, b) => {
        const aTime = (a as any).progressLastUpdate || (a as any).userMediaProgress?.lastUpdate || 0;
        const bTime = (b as any).progressLastUpdate || (b as any).userMediaProgress?.lastUpdate || 0;
        return bTime - aTime;
      });
    },
    staleTime: 1000 * 60 * 2,
  });

  // Filter to only show books in user's library
  const libraryItems = useMemo(() => {
    return cachedItems.filter(item => libraryIds.includes(item.id));
  }, [cachedItems, libraryIds]);

  // Recently listened - last 3 books with progress (excluding current)
  const recentlyListened = useMemo(() => {
    const filtered = playerCurrentBook
      ? inProgressItems.filter((item) => item.id !== playerCurrentBook.id)
      : inProgressItems;
    return filtered.slice(0, 3);
  }, [inProgressItems, playerCurrentBook]);

  // Get cover URLs for background (from recently listened books)
  const backgroundCoverUrls = useMemo(() => {
    return recentlyListened.map(book => getCoverUrl(book.id));
  }, [recentlyListened]);

  // Refresh function
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchProgress();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchProgress]);

  const handleSelectAll = () => {
    if (selectedIds.length === libraryItems.length) {
      clearSelection();
    } else {
      selectAll(libraryItems.map(item => item.id));
    }
  };

  const handleRemove = () => {
    if (selectedIds.length === 0) return;

    Alert.alert(
      'Remove from Library',
      `Remove ${selectedIds.length} ${selectedIds.length === 1 ? 'book' : 'books'} from your library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeMultiple(selectedIds),
        },
      ]
    );
  };

  const handleCancel = () => {
    stopSelecting();
  };

  const handleBookPress = useCallback(async (book: LibraryItem) => {
    if (isSelecting) {
      toggleSelection(book.id);
      return;
    }

    try {
      const fullBook = await apiClient.getItem(book.id);
      await loadBook(fullBook, { autoPlay: false, showPlayer: false });
    } catch (err) {
      await loadBook(book, { autoPlay: false, showPlayer: false });
    }
  }, [isSelecting, toggleSelection, loadBook]);

  const handlePlayBook = useCallback(async (book: LibraryItem) => {
    try {
      const fullBook = await apiClient.getItem(book.id);
      await loadBook(fullBook, { autoPlay: true, showPlayer: false });
    } catch (err) {
      await loadBook(book, { autoPlay: true, showPlayer: false });
    }
  }, [loadBook]);

  const handleBookLongPress = useCallback((bookId: string) => {
    if (!isSelecting) {
      startSelecting();
      toggleSelection(bookId);
    }
  }, [isSelecting, startSelecting, toggleSelection]);

  const handleSeriesPress = useCallback((seriesName: string) => {
    navigation.navigate('SeriesDetail', { seriesName });
  }, [navigation]);

  const handleViewAllSeries = useCallback(() => {
    navigation.navigate('SeriesList');
  }, [navigation]);

  // Render Recently Listened Item
  const renderRecentlyListenedItem = (book: LibraryItem) => {
    const coverUrl = getCoverUrl(book.id);
    const metadata = book.media?.metadata as any;
    const title = metadata?.title || 'Untitled';
    const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';
    const progress = (book as any).userMediaProgress;
    const progressPercent = progress?.progress ? Math.round(progress.progress * 100) : 0;

    return (
      <TouchableOpacity
        key={book.id}
        style={styles.recentItem}
        onPress={() => handleBookPress(book)}
        activeOpacity={0.8}
      >
        <Image source={coverUrl} style={styles.recentCover} contentFit="cover" />
        <View style={styles.recentInfo}>
          <Text style={styles.recentTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.recentAuthor} numberOfLines={1}>{author}</Text>
          <Text style={styles.recentProgress}>{progressPercent}% complete</Text>
        </View>
        <HeartButton
          bookId={book.id}
          size={scale(16)}
          style={styles.heartButton}
        />
      </TouchableOpacity>
    );
  };

  // Render grid book card
  const renderGridCard = (book: LibraryItem) => {
    const coverUrl = getCoverUrl(book.id);
    const metadata = book.media?.metadata as any;
    const title = metadata?.title || 'Untitled';
    const isSelected = selectedIds.includes(book.id);
    const isInLibrary = libraryIds.includes(book.id);

    return (
      <TouchableOpacity
        key={book.id}
        style={styles.gridCard}
        onPress={() => handleBookPress(book)}
        onLongPress={() => handleBookLongPress(book.id)}
        activeOpacity={0.85}
        delayLongPress={300}
      >
        <View style={styles.gridCoverContainer}>
          <Image source={coverUrl} style={styles.gridCover} contentFit="cover" transition={200} />
          {/* Selection border overlay */}
          {isSelected && <View style={styles.selectionBorder} />}
          {/* Selection overlay with checkmark */}
          {isSelecting && (
            <View style={[styles.selectionOverlay, isSelected && styles.selectionOverlayActive]}>
              {isSelected && (
                <View style={styles.checkmark}>
                  <Icon name="checkmark" size={16} color="#000" set="ionicons" />
                </View>
              )}
            </View>
          )}
        </View>
        <View style={styles.gridTitleRow}>
          <Text style={[styles.gridTitle, isInLibrary && styles.gridTitleWithHeart]} numberOfLines={2}>
            {title}
          </Text>
          {isInLibrary && (
            <View style={styles.gridHeartContainer}>
              <HeartButton bookId={book.id} size={scale(12)} animated={false} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG_COLOR} />

      {/* Background with blurred covers */}
      <LibraryBackground coverUrls={backgroundCoverUrls} />

      {/* Selection Header */}
      {isSelecting && (
        <View style={[styles.selectionHeader, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.selectionCount}>
            {selectedIds.length} selected
          </Text>

          <View style={styles.selectionActions}>
            <TouchableOpacity onPress={handleSelectAll} style={styles.headerButton}>
              <Text style={styles.selectAllText}>
                {selectedIds.length === libraryItems.length ? 'None' : 'All'}
              </Text>
            </TouchableOpacity>

            {selectedIds.length > 0 && (
              <TouchableOpacity onPress={handleRemove} style={styles.headerButton}>
                <Icon name="trash-outline" size={22} color="#FF4444" set="ionicons" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {libraryItems.length === 0 && recentlyListened.length === 0 ? (
        <View style={[styles.emptyContainer, { paddingTop: insets.top }]}>
          <EmptyState
            message="Your library is empty"
            description="Add books from Discover to build your collection"
            icon="📚"
          />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: isSelecting ? 10 : insets.top + scale(18), paddingBottom: 100 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={ACCENT}
            />
          }
        >
          {/* Page Header */}
          {!isSelecting && (
            <Text style={styles.pageTitle}>Your Library</Text>
          )}

          {/* Recently Listened Section - List View */}
          {recentlyListened.length > 0 && !isSelecting && (
            <View style={styles.recentlyListenedSection}>
              <Text style={styles.sectionTitle}>Recently Listened</Text>
              {recentlyListened.map((book) => (
                <BookListItem
                  key={book.id}
                  book={book}
                  onPress={() => handleBookPress(book)}
                  onPlayPress={() => handlePlayBook(book)}
                  showProgress={true}
                  showSwipe={false}
                />
              ))}
            </View>
          )}

          {/* Your Books Section - List View */}
          {libraryItems.length > 0 && (
            <View style={styles.booksSection}>
              {!isSelecting && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderTitle}>Your Books</Text>
                  <Text style={styles.bookCount}>
                    {libraryItems.length} {libraryItems.length === 1 ? 'book' : 'books'}
                  </Text>
                </View>
              )}
              {libraryItems.map((book) => (
                <BookListItem
                  key={book.id}
                  book={book}
                  onPress={() => handleBookPress(book)}
                  onPlayPress={() => handlePlayBook(book)}
                  showProgress={true}
                  showSwipe={false}
                />
              ))}
            </View>
          )}

          {/* Your Series Section */}
          {favoriteSeries.length > 0 && !isSelecting && (
            <View
              style={styles.seriesSection}
              onLayout={(e) => {
                seriesSectionY.current = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderTitle}>Your Series</Text>
                <TouchableOpacity onPress={handleViewAllSeries}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.seriesRow}>
                {favoriteSeries.slice(0, 3).map((series) => {
                  const bookCovers = series.books.slice(0, MAX_VISIBLE_BOOKS).map(b => apiClient.getItemCoverUrl(b.id));
                  const numCovers = bookCovers.length;
                  const stackOffset = numCovers > 1
                    ? (SERIES_CARD_WIDTH - SERIES_COVER_SIZE) / (numCovers - 1)
                    : 0;

                  return (
                    <TouchableOpacity
                      key={series.name}
                      style={styles.seriesCard}
                      onPress={() => handleSeriesPress(series.name)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.seriesStackContainer}>
                        {bookCovers.map((coverUrl, idx) => (
                          <View
                            key={idx}
                            style={[
                              styles.seriesStackCover,
                              {
                                left: idx * stackOffset,
                                zIndex: numCovers - idx,
                              },
                            ]}
                          >
                            <Image
                              source={coverUrl}
                              style={styles.seriesCoverImage}
                              contentFit="cover"
                              transition={150}
                            />
                          </View>
                        ))}
                      </View>
                      <View style={styles.seriesTitleRow}>
                        <Text style={styles.seriesTitle} numberOfLines={2}>{series.name}</Text>
                        <SeriesHeartButton seriesName={series.name} size={12} style={styles.seriesHeartButton} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: BG_COLOR,
  },
  headerButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  selectionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 16,
    color: ACCENT,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: scale(28),
    fontWeight: '700',
    color: '#FFFFFF',
    paddingHorizontal: GRID_PADDING,
    marginBottom: scale(24),
  },

  // Recently Listened Section
  recentlyListenedSection: {
    marginBottom: scale(24),
  },
  sectionTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: '#FFFFFF',
    paddingHorizontal: GRID_PADDING,
    marginBottom: scale(12),
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(8),
    paddingHorizontal: GRID_PADDING,
  },
  recentCover: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(4),
    backgroundColor: '#262626',
  },
  recentInfo: {
    flex: 1,
    marginLeft: scale(12),
  },
  recentTitle: {
    fontSize: scale(14),
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: scale(2),
  },
  recentAuthor: {
    fontSize: scale(12),
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: scale(2),
  },
  recentProgress: {
    fontSize: scale(11),
    color: 'rgba(255, 255, 255, 0.4)',
  },
  heartButton: {
    padding: scale(8),
  },

  // Books Section
  booksSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: GRID_PADDING,
    marginBottom: scale(12),
  },
  bookCount: {
    fontSize: scale(12),
    color: 'rgba(255, 255, 255, 0.5)',
  },
  sectionHeaderTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
    gap: GRID_GAP,
  },
  gridCard: {
    width: CARD_SIZE,
    marginBottom: scale(8),
  },
  gridCoverContainer: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: scale(5),
    overflow: 'hidden',
    backgroundColor: '#262626',
  },
  gridCover: {
    width: '100%',
    height: '100%',
  },
  selectionBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: ACCENT,
    borderRadius: scale(5),
  },
  gridTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: scale(6),
  },
  gridTitle: {
    flex: 1,
    fontSize: scale(11),
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: scale(13),
  },
  gridTitleWithHeart: {
    paddingRight: scale(4),
  },
  gridHeartContainer: {
    marginLeft: scale(2),
  },
  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionOverlayActive: {
    backgroundColor: 'rgba(200,255,0,0.2)',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Series Section
  seriesSection: {
    marginTop: scale(24),
  },
  viewAllText: {
    fontSize: scale(14),
    color: 'rgba(255, 255, 255, 0.5)',
  },
  seriesRow: {
    flexDirection: 'row',
    paddingHorizontal: GRID_PADDING,
    gap: SERIES_GAP,
  },
  seriesCard: {
    width: SERIES_CARD_WIDTH,
  },
  seriesStackContainer: {
    width: SERIES_CARD_WIDTH,
    height: SERIES_COVER_SIZE,
    marginBottom: 8,
  },
  seriesStackCover: {
    position: 'absolute',
    width: SERIES_COVER_SIZE,
    height: SERIES_COVER_SIZE,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#2a2a2a',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  seriesCoverImage: {
    width: '100%',
    height: '100%',
  },
  seriesTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  seriesTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 14,
    paddingRight: 4,
  },
  seriesHeartButton: {
    height: 26,
    justifyContent: 'flex-start',
    paddingTop: 1,
  },
});

export default MyLibraryScreen;
