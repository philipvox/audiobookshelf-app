/**
 * src/features/library/screens/FilteredBooksScreen.tsx
 *
 * Shows filtered books based on row type (short, long, new, mood-matched, etc.)
 * Uses same grid card style as ContentRowCarousel for consistency.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  TextInput,
  ListRenderItem,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Search, XCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useLibraryCache, useCoverUrl } from '@/core/cache';
import { useReadingHistory } from '@/features/reading-history-wizard';
import { createSeriesFilter } from '@/shared/utils/seriesFilter';
import { useMoodRecommendations } from '@/features/mood-discovery/hooks/useMoodRecommendations';
import { useActiveSession } from '@/features/mood-discovery/stores/moodSessionStore';
import { useContinueListening } from '@/features/home/hooks/useContinueListening';
import { CompleteBadgeOverlay } from '@/features/completion';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { scale, spacing, radius, wp, accentColors } from '@/shared/theme';
import { useThemeColors } from '@/shared/theme/themeStore';
import { LibraryItem } from '@/core/types';

const PADDING = 16;
const GAP = 10;  // Gap for 3-column layout
const NUM_COLUMNS = 3;
const TOTAL_GAP = GAP * (NUM_COLUMNS - 1);  // 2 gaps between 3 columns
const CARD_WIDTH = Math.floor((wp(100) - PADDING * 2 - TOTAL_GAP) / NUM_COLUMNS);
const COVER_HEIGHT = CARD_WIDTH;

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SHORT_BOOK_THRESHOLD = 5 * 60 * 60; // 5 hours
const LONG_BOOK_THRESHOLD = 10 * 60 * 60; // 10 hours

const ACCENT = accentColors.primary;

// Filter types that can be passed via navigation
export type FilterType =
  | 'new_this_week'
  | 'short_books'
  | 'long_listens'
  | 'not_started'
  | 'recommended'
  | 'mood_matched'
  | 'continue_series';

export type FilteredBooksParams = {
  title: string;
  filterType: FilterType;
  genre?: string;
  minMatchPercent?: number;
};

function getMetadata(item: LibraryItem): any {
  return (item.media?.metadata as any) || {};
}

// Grid Book Card - matches ContentRowCarousel style
interface GridCardProps {
  item: LibraryItem;
  onPress: () => void;
}

const GridBookCard = React.memo(function GridBookCard({ item, onPress }: GridCardProps) {
  const themeColors = useThemeColors();
  const coverUrl = useCoverUrl(item.id);
  const metadata = getMetadata(item);

  const title = metadata.title || 'Untitled';

  // Simplified card for 3-column layout: just cover + title
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.coverContainer, { backgroundColor: themeColors.backgroundSecondary }]}>
        <Image
          source={coverUrl}
          style={styles.cover}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
        />
        <CompleteBadgeOverlay bookId={item.id} size="small" />
      </View>

      <Text style={[styles.cardTitle, { color: themeColors.text }]} numberOfLines={2}>
        {title}
      </Text>
    </TouchableOpacity>
  );
});

export function FilteredBooksScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: FilteredBooksParams }, 'params'>>();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();

  const { title, filterType, genre, minMatchPercent = 20 } = route.params || {};

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { items: libraryItems, isLoaded, refreshCache } = useLibraryCache();
  const { isFinished, hasBeenStarted } = useReadingHistory();
  const moodSession = useActiveSession();
  const { items: inProgressItems } = useContinueListening();

  // Only fetch mood recommendations if needed
  const needsMoodData = filterType === 'mood_matched';
  const { recommendations: moodRecommendations } = useMoodRecommendations({
    session: needsMoodData ? moodSession : null,
    minMatchPercent,
    limit: 500,
  });

  // Create series filter
  const isSeriesAppropriate = useMemo(() => {
    if (!libraryItems.length) return () => true;
    return createSeriesFilter({
      allItems: libraryItems,
      isFinished,
      hasStarted: hasBeenStarted,
    });
  }, [libraryItems, isFinished, hasBeenStarted]);

  // Filter books based on filter type
  const filteredBooks = useMemo(() => {
    if (!isLoaded) return [];

    let result: LibraryItem[] = [];

    switch (filterType) {
      case 'new_this_week': {
        const oneWeekAgo = Date.now() - ONE_WEEK_MS;
        result = libraryItems
          .filter(item => (item.addedAt || 0) * 1000 > oneWeekAgo)
          .filter(item => !isFinished(item.id))
          .filter(isSeriesAppropriate)
          .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        break;
      }

      case 'short_books': {
        result = libraryItems
          .filter(item => {
            const duration = (item.media as any)?.duration || 0;
            return duration > 0 && duration < SHORT_BOOK_THRESHOLD;
          })
          .filter(item => !isFinished(item.id))
          .filter(isSeriesAppropriate)
          .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        break;
      }

      case 'long_listens': {
        result = libraryItems
          .filter(item => {
            const duration = (item.media as any)?.duration || 0;
            return duration >= LONG_BOOK_THRESHOLD;
          })
          .filter(item => !isFinished(item.id))
          .filter(isSeriesAppropriate)
          .sort((a, b) => {
            const durationA = (a.media as any)?.duration || 0;
            const durationB = (b.media as any)?.duration || 0;
            return durationB - durationA;
          });
        break;
      }

      case 'not_started': {
        result = libraryItems
          .filter(item => !isFinished(item.id))
          .filter(isSeriesAppropriate)
          .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        break;
      }

      case 'mood_matched': {
        const moodIds = new Set(moodRecommendations.map(r => r.id));
        result = libraryItems.filter(item => moodIds.has(item.id));
        result.sort((a, b) => {
          const scoreA = moodRecommendations.find(r => r.id === a.id)?.matchPercent || 0;
          const scoreB = moodRecommendations.find(r => r.id === b.id)?.matchPercent || 0;
          return scoreB - scoreA;
        });
        break;
      }

      case 'continue_series': {
        const seriesFromProgress = new Map<string, number>();
        for (const item of inProgressItems) {
          const metadata = getMetadata(item);
          const series = metadata.series?.[0];
          if (series?.name && series?.sequence) {
            const existing = seriesFromProgress.get(series.name) || 0;
            const seq = parseFloat(series.sequence) || 0;
            if (seq > existing) {
              seriesFromProgress.set(series.name, seq);
            }
          }
        }

        for (const [seriesName, maxSeq] of seriesFromProgress) {
          const nextInSeries = libraryItems.find(item => {
            const metadata = getMetadata(item);
            const series = metadata.series?.[0];
            if (!series?.name || series.name !== seriesName) return false;
            const seq = parseFloat(series.sequence) || 0;
            return seq > maxSeq && !isFinished(item.id);
          });
          if (nextInSeries) {
            result.push(nextInSeries);
          }
        }
        break;
      }

      case 'recommended':
      default:
        result = libraryItems
          .filter(item => !isFinished(item.id))
          .filter(isSeriesAppropriate)
          .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    }

    // Apply genre filter if specified
    if (genre && genre !== 'All') {
      const filterGenre = genre.toLowerCase();
      result = result.filter(item => {
        const metadata = getMetadata(item);
        const genres: string[] = metadata.genres || [];
        return genres.some(g => g.toLowerCase() === filterGenre);
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(item => {
        const metadata = getMetadata(item);
        const itemTitle = (metadata.title || '').toLowerCase();
        const author = (metadata.authorName || '').toLowerCase();
        return itemTitle.includes(query) || author.includes(query);
      });
    }

    return result;
  }, [
    isLoaded,
    libraryItems,
    filterType,
    genre,
    searchQuery,
    isFinished,
    isSeriesAppropriate,
    moodRecommendations,
    inProgressItems,
  ]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  }, [navigation]);

  const handleBookPress = useCallback((bookId: string) => {
    navigation.navigate('BookDetail', { id: bookId });
  }, [navigation]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshCache();
    setIsRefreshing(false);
  }, [refreshCache]);

  // Memoized render function for FlatList virtualization
  const renderItem: ListRenderItem<LibraryItem> = useCallback(({ item }) => (
    <GridBookCard
      item={item}
      onPress={() => handleBookPress(item.id)}
    />
  ), [handleBookPress]);

  const keyExtractor = useCallback((item: LibraryItem) => item.id, []);

  // Calculate item height for getItemLayout optimization
  // Simplified card: cover height + title (2 lines) + margins
  const ITEM_HEIGHT = COVER_HEIGHT + scale(12) * 2 + spacing.sm + spacing.sm;

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * Math.floor(index / NUM_COLUMNS),
    index,
  }), []);

  // Empty state component
  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
        No books found
      </Text>
      <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
        {searchQuery ? 'Try a different search term' : 'Check back later for new additions'}
      </Text>
    </View>
  ), [themeColors.text, themeColors.textSecondary, searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={themeColors.statusBar} backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + scale(8) }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={scale(24)} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
          {title || 'Books'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: themeColors.backgroundSecondary }]}>
        <Search size={scale(18)} color={themeColors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: themeColors.text }]}
          placeholder="Search..."
          placeholderTextColor={themeColors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch}>
            <XCircle size={scale(18)} color={themeColors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results Count */}
      <Text style={[styles.resultCount, { color: themeColors.textSecondary }]}>
        {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'}
      </Text>

      {/* Virtualized Book Grid - 4 columns with optimized rendering */}
      <FlatList
        data={filteredBooks}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={16}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews={false}
        getItemLayout={getItemLayout}
        ListEmptyComponent={ListEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={themeColors.text}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PADDING,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: scale(44),
    height: scale(44),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  placeholder: {
    width: scale(44),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: PADDING,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    height: scale(44),
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: scale(15),
    paddingVertical: spacing.xs,
  },
  resultCount: {
    fontSize: scale(13),
    marginHorizontal: PADDING,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: PADDING,
  },
  columnWrapper: {
    gap: GAP,
    marginBottom: spacing.sm,  // Tighter vertical spacing for 3-column grid
  },
  // Card styles - simplified for 3-column layout
  card: {
    width: CARD_WIDTH,
  },
  coverContainer: {
    width: '100%',
    height: COVER_HEIGHT,
    borderRadius: radius.sm,  // Smaller radius for smaller cards
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  cardTitle: {
    fontSize: scale(12),  // Smaller text for 3-column layout
    fontWeight: '600',
    marginTop: spacing.xs,
    lineHeight: scale(14),
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: scale(60),
    paddingHorizontal: scale(40),
  },
  emptyTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: spacing.sm,
    fontSize: scale(13),
    textAlign: 'center',
  },
});
