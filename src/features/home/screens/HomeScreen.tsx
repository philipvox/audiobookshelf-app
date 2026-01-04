/**
 * src/features/home/screens/HomeScreen.tsx
 *
 * Minimal text-focused Home Screen
 *
 * Layout:
 * 1. Books (Continue Listening) - text list with play buttons
 * 2. Series - text list with progress counts
 *
 * Clean white background with typography-focused design
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Headphones, BookOpen } from 'lucide-react-native';
import { apiClient } from '@/core/api';
import { LibraryItem } from '@/core/types';
import { usePlayerStore } from '@/features/player';
import { useDownloads } from '@/core/hooks/useDownloads';
import { useMyLibraryStore } from '@/features/library/stores/myLibraryStore';
import { useFinishedBookIds } from '@/core/hooks/useUserBooks';
import { useLibraryCache } from '@/core/cache';
import { haptics } from '@/core/native/haptics';
import { wp, hp } from '@/shared/theme';
import { useThemeStore, useThemeColors } from '@/shared/theme/themeStore';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { useScreenLoadTime } from '@/core/hooks/useScreenLoadTime';

// Components
import { TabbedHomeContent } from '../components/TextListSection';

// Types
import { SeriesWithBooks } from '../types';

// Hooks
import { useHomeData } from '../hooks/useHomeData';

export function HomeScreen() {
  useScreenLoadTime('HomeScreen');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const themeColors = useThemeColors();

  // Home data
  const {
    recentlyListened,
    userSeries,
    isRefreshing,
    refresh,
  } = useHomeData();

  // Player state
  const { loadBook } = usePlayerStore();

  // Downloaded books
  const { downloads } = useDownloads();
  const downloadedBooks = useMemo(() => {
    return downloads
      .filter(d => d.status === 'complete' && d.libraryItem)
      .map(d => d.libraryItem as LibraryItem);
  }, [downloads]);

  const downloadedBookIds = useMemo(() => {
    return new Set(downloadedBooks.map(b => b.id));
  }, [downloadedBooks]);

  // Favorite books (filter from all available books)
  const favoriteIds = useMyLibraryStore((state) => state.libraryIds);
  const favoriteBooks = useMemo(() => {
    const favoriteSet = new Set(favoriteIds);
    // Combine all available books and filter for favorites
    const allBooks = [...recentlyListened, ...downloadedBooks];
    const seen = new Set<string>();
    return allBooks.filter(book => {
      if (seen.has(book.id)) return false;
      seen.add(book.id);
      return favoriteSet.has(book.id);
    });
  }, [favoriteIds, recentlyListened, downloadedBooks]);

  // Finished books (marked as finished in SQLite or 100% server progress)
  const finishedBookIds = useFinishedBookIds();
  const getLibraryItem = useLibraryCache((s) => s.getItem);
  const finishedBooks = useMemo(() => {
    const result: LibraryItem[] = [];
    const seen = new Set<string>();

    // First, add books from available sources that are finished
    const allBooks = [...recentlyListened, ...downloadedBooks];
    for (const book of allBooks) {
      if (seen.has(book.id)) continue;
      seen.add(book.id);

      // Check if marked as finished in SQLite
      if (finishedBookIds.has(book.id)) {
        result.push(book);
        continue;
      }
      // Check if server progress is 100%
      const progress = (book as any).userMediaProgress?.progress;
      if (progress !== undefined && progress >= 1) {
        result.push(book);
      }
    }

    // Then, for finished book IDs not yet seen, try to get from library cache
    for (const bookId of finishedBookIds) {
      if (seen.has(bookId)) continue;
      seen.add(bookId);

      const cachedBook = getLibraryItem(bookId);
      if (cachedBook) {
        result.push(cachedBook);
      }
    }

    return result;
  }, [finishedBookIds, recentlyListened, downloadedBooks, getLibraryItem]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter series to only show those with at least one downloaded book
  const seriesWithDownloads = useMemo(() => {
    return userSeries.filter(series =>
      series.books.some(book => downloadedBookIds.has(book.id))
    );
  }, [userSeries, downloadedBookIds]);

  // Books in progress for Last Played
  const booksInProgress = useMemo(() => {
    return recentlyListened.slice(0, 10);
  }, [recentlyListened]);

  // Navigation handlers
  const handleLibraryPress = () => navigation.navigate('Main', { screen: 'LibraryTab' });

  // Cover tap: load book and start playing
  const handleCoverPress = useCallback(async (book: LibraryItem) => {
    try {
      const fullBook = await apiClient.getItem(book.id);
      await loadBook(fullBook, { autoPlay: true, showPlayer: true });
    } catch {
      await loadBook(book, { autoPlay: true, showPlayer: true });
    }
  }, [loadBook]);

  // Title tap or cover long press: navigate to book details
  const handleDetailsPress = useCallback((book: LibraryItem) => {
    haptics.selection();
    navigation.navigate('BookDetail', { id: book.id });
  }, [navigation]);

  // Navigate to series detail
  const handleSeriesPress = useCallback((series: SeriesWithBooks) => {
    navigation.navigate('SeriesDetail', { seriesName: series.name });
  }, [navigation]);

  // Check if home screen is completely empty (new user)
  const isCompletelyEmpty = booksInProgress.length === 0 && downloadedBooks.length === 0 && userSeries.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={themeColors.statusBar} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + hp(2),
            paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={themeColors.text}
          />
        }
      >
        {/* Empty state for new users */}
        {isCompletelyEmpty ? (
          <View style={styles.emptyHomeContainer}>
            <View style={[styles.emptyHomeIcon, { backgroundColor: themeColors.border }]}>
              <Headphones size={48} color={themeColors.text} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyHomeTitle, { color: themeColors.text }]}>Welcome</Text>
            <Text style={[styles.emptyHomeDescription, { color: themeColors.textSecondary }]}>
              Your audiobook collection is waiting. Browse your library to start listening.
            </Text>
            <TouchableOpacity
              style={[styles.emptyHomeCTA, { backgroundColor: themeColors.text }]}
              onPress={handleLibraryPress}
              activeOpacity={0.8}
            >
              <BookOpen size={18} color={themeColors.background} strokeWidth={2} />
              <Text style={[styles.emptyHomeCTAText, { color: themeColors.background }]}>Browse Library</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TabbedHomeContent
            lastPlayedBooks={booksInProgress}
            downloadedBooks={downloadedBooks}
            favoriteBooks={favoriteBooks}
            finishedBooks={finishedBooks}
            lastPlayedSeries={userSeries}
            downloadedSeries={seriesWithDownloads}
            downloadedBookIds={downloadedBookIds}
            onCoverPress={handleCoverPress}
            onDetailsPress={handleDetailsPress}
            onSeriesPress={handleSeriesPress}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            maxBooks={5}
            maxSeries={3}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor set via themeColors.background in JSX
  },
  scrollContent: {
    flexGrow: 1,
  },
  // Empty home state for new users
  emptyHomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(10),
    paddingTop: hp(15),
    minHeight: hp(60),
  },
  emptyHomeIcon: {
    width: wp(24),
    height: wp(24),
    borderRadius: wp(12),
    // backgroundColor set via themeColors.border in JSX
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(3),
  },
  emptyHomeTitle: {
    fontSize: wp(7),
    fontWeight: '700',
    // color set via themeColors.text in JSX
    textAlign: 'center',
    marginBottom: hp(1.5),
  },
  emptyHomeDescription: {
    fontSize: wp(3.8),
    // color set via themeColors.textSecondary in JSX
    textAlign: 'center',
    lineHeight: wp(5.5),
    maxWidth: wp(70),
    marginBottom: hp(4),
  },
  emptyHomeCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    // backgroundColor set via themeColors.text in JSX
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderRadius: wp(10),
  },
  emptyHomeCTAText: {
    fontSize: wp(4),
    fontWeight: '600',
    // color set via themeColors.background in JSX
  },
});

export { HomeScreen as default };
