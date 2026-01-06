/**
 * src/features/library/screens/SeriesListScreen.tsx
 *
 * Browse all series with favorite series shown first.
 * Uses library cache for instant loading.
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLibraryCache, getAllSeries } from '@/core/cache';
import { useMyLibraryStore } from '@/shared/stores/myLibraryStore';
import { apiClient } from '@/core/api';
import { Icon } from '@/shared/components/Icon';
import { SeriesHeartButton } from '@/shared/components';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { accentColors, wp, spacing, radius } from '@/shared/theme';
import { useThemeColors, useIsDarkMode } from '@/shared/theme/themeStore';

const SCREEN_WIDTH = wp(100);
const ACCENT = accentColors.red;
const ACCENT_DIM = 'rgba(229,57,53,0.5)';
const PADDING = 16;
const GAP = 12;
const COLUMNS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GAP) / COLUMNS;

// Fanned cover dimensions
const COVER_SIZE = 60;
const FAN_OFFSET = 18;
const FAN_ROTATION = 8;
const FAN_VERTICAL_OFFSET = 6; // Center is higher, sides lower
const MAX_VISIBLE_BOOKS = 5;
const MAX_PROGRESS_DOTS = 8;

// Progress dot component
function ProgressDot({ status, size = 5 }: { status: 'completed' | 'in_progress' | 'not_started'; size?: number }) {
  const getColor = () => {
    switch (status) {
      case 'completed':
        return ACCENT;
      case 'in_progress':
        return ACCENT_DIM;
      default:
        return 'rgba(255,255,255,0.25)';
    }
  };

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: getColor(),
      }}
    />
  );
}

// Calculate series progress
function getSeriesProgress(books: any[]) {
  if (!books || books.length === 0) {
    return { completed: 0, inProgress: 0, notStarted: 0, totalListened: 0, totalDuration: 0 };
  }

  let completed = 0;
  let inProgress = 0;
  let totalListened = 0;
  let totalDuration = 0;

  books.forEach(book => {
    const progress = book.userMediaProgress?.progress || 0;
    const duration = book.media?.duration || 0;
    totalDuration += duration;
    totalListened += duration * progress;

    if (progress >= 0.95) {
      completed++;
    } else if (progress > 0) {
      inProgress++;
    }
  });

  const notStarted = books.length - completed - inProgress;
  return { completed, inProgress, notStarted, totalListened, totalDuration };
}

function formatDurationShort(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

type SortType = 'name' | 'bookCount';
type SortDirection = 'asc' | 'desc';

export function SeriesListScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const isDarkMode = useIsDarkMode();
  const inputRef = useRef<TextInput>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { refreshCache, isLoaded } = useLibraryCache();
  const favoriteSeriesNames = useMyLibraryStore((state) => state.favoriteSeriesNames);
  const hideSingleBookSeries = useMyLibraryStore((state) => state.hideSingleBookSeries);

  // Cache favorites for sorting - only update when screen is focused
  const [cachedFavorites, setCachedFavorites] = useState<string[]>(favoriteSeriesNames);

  useFocusEffect(
    useCallback(() => {
      // Update cached favorites when screen comes into focus
      setCachedFavorites(favoriteSeriesNames);
    }, [favoriteSeriesNames])
  );

  const allSeries = useMemo(() => getAllSeries(), [isLoaded]);

  // Filter series by search query and preferences
  const filteredSeries = useMemo(() => {
    let result = allSeries;

    // Filter out single-book series if setting is enabled
    if (hideSingleBookSeries) {
      result = result.filter(s => s.bookCount > 1);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(lowerQuery));
    }

    return result;
  }, [allSeries, searchQuery, hideSingleBookSeries]);

  const sortedSeries = useMemo(() => {
    const sorted = [...filteredSeries];
    const direction = sortDirection === 'asc' ? 1 : -1;

    // Sort
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => direction * a.name.localeCompare(b.name));
        break;
      case 'bookCount':
        sorted.sort((a, b) => direction * (a.bookCount - b.bookCount));
        break;
    }

    // Move favorites to top (using cached list so order doesn't change until page revisit)
    sorted.sort((a, b) => {
      const aFav = cachedFavorites.includes(a.name);
      const bFav = cachedFavorites.includes(b.name);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });

    return sorted;
  }, [filteredSeries, sortBy, sortDirection, cachedFavorites]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main');
    }
  };

  const handleSeriesPress = (seriesName: string) => {
    navigation.navigate('SeriesDetail', { seriesName });
  };

  const handleSortPress = (type: SortType) => {
    if (sortBy === type) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortDirection('asc');
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

  if (!isLoaded) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: themeColors.background }]}>
        <StatusBar barStyle={themeColors.statusBar} backgroundColor={themeColors.background} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={themeColors.statusBar} backgroundColor={themeColors.background} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Icon name="ChevronLeft" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <View style={[styles.searchContainer, { backgroundColor: themeColors.border }]}>
          <Icon name="Search" size={18} color={themeColors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: themeColors.text }]}
            placeholder="Search series..."
            placeholderTextColor={themeColors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Icon name="XCircle" size={18} color={themeColors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sort Bar */}
      <View style={styles.sortBar}>
        <Text style={[styles.resultCount, { color: themeColors.textSecondary }]}>{sortedSeries.length} series</Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, { backgroundColor: themeColors.border }, sortBy === 'name' && styles.sortButtonActive]}
            onPress={() => handleSortPress('name')}
          >
            <Icon
              name={sortBy === 'name' ? (sortDirection === 'asc' ? 'ArrowUp' : 'ArrowDown') : 'ArrowUpDown'}
              size={14}
              color={sortBy === 'name' ? '#000' : themeColors.textSecondary}

            />
            <Text style={[styles.sortButtonText, { color: themeColors.textSecondary }, sortBy === 'name' && styles.sortButtonTextActive]}>
              {sortBy === 'name' ? (sortDirection === 'asc' ? 'A-Z' : 'Z-A') : 'Name'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, { backgroundColor: themeColors.border }, sortBy === 'bookCount' && styles.sortButtonActive]}
            onPress={() => handleSortPress('bookCount')}
          >
            <Icon
              name={sortBy === 'bookCount' ? (sortDirection === 'asc' ? 'ArrowUp' : 'ArrowDown') : 'Library'}
              size={14}
              color={sortBy === 'bookCount' ? '#000' : themeColors.textSecondary}
            />
            <Text style={[styles.sortButtonText, { color: themeColors.textSecondary }, sortBy === 'bookCount' && styles.sortButtonTextActive]}>Books</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={sortedSeries}
        keyExtractor={(item) => item.name}
        numColumns={2}
        contentContainerStyle={[styles.grid, { paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom }]}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={ACCENT}
          />
        }
        renderItem={({ item: series }) => {
          const isFavorite = favoriteSeriesNames.includes(series.name);
          const bookCovers = series.books.slice(0, MAX_VISIBLE_BOOKS).map(b => apiClient.getItemCoverUrl(b.id));
          const numCovers = bookCovers.length;

          // Calculate progress
          const progress = getSeriesProgress(series.books);
          const hasProgress = progress.completed > 0 || progress.inProgress > 0;
          const isComplete = progress.completed === series.bookCount;
          const remainingDuration = progress.totalDuration - progress.totalListened;
          const dotsToShow = Math.min(series.bookCount, MAX_PROGRESS_DOTS);
          const showMoreIndicator = series.bookCount > MAX_PROGRESS_DOTS;

          return (
            <TouchableOpacity
              style={[
                styles.seriesCard,
                { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }
              ]}
              onPress={() => handleSeriesPress(series.name)}
              activeOpacity={0.7}
            >
              {/* Heart button - top right */}
              <SeriesHeartButton
                seriesName={series.name}
                size={10}
                showCircle
                style={styles.heartButton}
              />

              {/* Fanned covers - rotated stack */}
              <View style={styles.coverFan}>
                {numCovers > 0 ? (
                  <View style={[
                    styles.fanContainer,
                    // Dynamic width based on number of covers for centering
                    { width: COVER_SIZE + (numCovers - 1) * FAN_OFFSET }
                  ]}>
                    {bookCovers.map((coverUrl, idx) => {
                      // Fan rotation: left books tilt left, right books tilt right
                      const middleIndex = (numCovers - 1) / 2;
                      const rotation = (idx - middleIndex) * FAN_ROTATION;
                      // Z-index: center is highest, sides go down
                      const distanceFromCenter = Math.abs(idx - middleIndex);
                      const zIndex = numCovers - Math.floor(distanceFromCenter);
                      // Scale: center is biggest, sides get smaller
                      const scaleValue = 1 - (distanceFromCenter * 0.12);
                      const coverSize = COVER_SIZE * scaleValue;
                      // Vertical offset: center the smaller covers, then push sides down
                      const sizeOffset = (COVER_SIZE - coverSize) / 2;
                      const verticalOffset = sizeOffset + (distanceFromCenter * FAN_VERTICAL_OFFSET);

                      // Horizontal offset: account for size difference to center smaller covers
                      const horizontalOffset = idx * FAN_OFFSET + sizeOffset;

                      return (
                        <Image
                          key={idx}
                          source={coverUrl}
                          style={[
                            styles.fanCover,
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
                ) : (
                  <View style={styles.fanPlaceholder}>
                    <Icon name="Library" size={40} color={ACCENT} />
                  </View>
                )}
                {/* Complete badge */}
                {isComplete && (
                  <View style={styles.completeBadge}>
                    <Icon name="Check" size={10} color="#000" />
                  </View>
                )}
              </View>

              <Text style={[styles.seriesName, { color: themeColors.text }]} numberOfLines={2}>{series.name}</Text>

              {/* Progress dots - only show if there's progress */}
              {hasProgress && (
                <View style={styles.progressRow}>
                  <View style={styles.progressDots}>
                    {Array.from({ length: dotsToShow }).map((_, i) => {
                      let status: 'completed' | 'in_progress' | 'not_started';
                      if (i < progress.completed) {
                        status = 'completed';
                      } else if (i < progress.completed + progress.inProgress) {
                        status = 'in_progress';
                      } else {
                        status = 'not_started';
                      }
                      return <ProgressDot key={i} status={status} />;
                    })}
                    {showMoreIndicator && (
                      <Text style={[styles.moreText, { color: themeColors.textTertiary }]}>+{series.bookCount - MAX_PROGRESS_DOTS}</Text>
                    )}
                  </View>
                  <Text style={styles.progressCount}>
                    {progress.completed}/{series.bookCount}
                  </Text>
                </View>
              )}

              {/* Book count or remaining time */}
              <Text style={[styles.bookCountText, { color: themeColors.textSecondary }]} numberOfLines={1}>
                {hasProgress && remainingDuration > 0
                  ? `~${formatDurationShort(remainingDuration)} left`
                  : `${series.bookCount} ${series.bookCount === 1 ? 'book' : 'books'}`
                }
              </Text>

            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor set via themeColors.background in JSX
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor set via themeColors.border in JSX
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    // color set via themeColors.text in JSX
    fontSize: 15,
    marginLeft: 8,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    // color set via themeColors.textSecondary in JSX
    fontSize: 16,
  },
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    paddingBottom: 12,
  },
  resultCount: {
    // color set via themeColors.textSecondary in JSX
    fontSize: 14,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    // backgroundColor set via themeColors.border in JSX
  },
  sortButtonActive: {
    backgroundColor: ACCENT,
  },
  sortButtonText: {
    fontSize: 12,
    // color set via themeColors.textSecondary in JSX
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#000', // Intentional: black on gold
  },
  grid: {
    paddingHorizontal: PADDING,
  },
  columnWrapper: {
    gap: GAP,
    marginBottom: GAP,
  },
  seriesCard: {
    width: CARD_WIDTH,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  coverFan: {
    height: COVER_SIZE + 10, // Extra space for rotation
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fanContainer: {
    position: 'relative',
    height: COVER_SIZE,
    // width set dynamically based on number of covers
  },
  fanCover: {
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
  fanPlaceholder: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: 5,
    backgroundColor: ACCENT + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seriesName: {
    fontSize: 15,
    fontWeight: '600',
    // color set via themeColors.text in JSX
    lineHeight: 20,
    textAlign: 'center',
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 2,
    gap: 8,
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  moreText: {
    fontSize: 9,
    // color set via themeColors.textTertiary in JSX
    marginLeft: 2,
  },
  progressCount: {
    fontSize: 10,
    fontWeight: '600',
    color: ACCENT,
  },
  bookCountText: {
    fontSize: 13,
    // color set via themeColors.textSecondary in JSX
    marginTop: 2,
    textAlign: 'center',
  },
  completeBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
});
