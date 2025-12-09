/**
 * src/features/home/screens/HomeScreen.tsx
 *
 * Redesigned Home Screen - the app's engagement hub
 * Answers: "What should I listen to next?"
 *
 * Sections:
 * 1. Greeting (time-based)
 * 2. Compact Now Playing Card (~25% of screen)
 * 3. Continue Listening (in-progress books)
 * 4. Up Next (queue preview)
 * 5. Continue Series (active series)
 * 6. Downloaded books
 */

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Text,
  RefreshControl,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LibraryItem } from '@/core/types';
import { apiClient } from '@/core/api';
import { usePlayerStore } from '@/features/player';
import { useRobustSeekControl } from '@/features/player/hooks/useRobustSeekControl';
import { useDownloads } from '@/core/hooks/useDownloads';
import { useLibraryCache } from '@/core/cache/libraryCache';
import { useAuth } from '@/core/auth/authContext';
import { BookCard } from '@/shared/components/BookCard';
import { useHomeData } from '../hooks/useHomeData';
import { useQueue } from '@/features/queue/stores/queueStore';
import { Greeting } from '../components/Greeting';
import { CompactNowPlaying, NothingPlayingCard } from '../components/CompactNowPlaying';
import { SectionHeader } from '../components/SectionHeader';
import { EmptySection } from '../components/EmptySection';
import { TOP_NAV_HEIGHT } from '@/constants/layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;
const ACCENT = '#c1f40c';
const REWIND_COLOR = '#ff4444';

// Horizontal card dimensions
const HORIZONTAL_CARD_WIDTH = scale(125);
const HORIZONTAL_CARD_COVER = scale(110);

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const {
    currentBook,
    currentProgress,
    recentlyListened,
    userSeries,
    isRefreshing,
    refresh,
  } = useHomeData();

  const {
    currentBook: playerCurrentBook,
    isPlaying,
    isLoading: isPlayerLoading,
    position,
    duration,
    chapters,
    loadBook,
    play,
    pause,
  } = usePlayerStore();

  const {
    startContinuousSeek,
    stopContinuousSeek,
    seekDirection,
    seekMagnitude,
    isSeeking,
  } = useRobustSeekControl();

  // Queue state (for renderQueueCard)
  const queue = useQueue();

  // Downloaded books from downloads hook
  const { downloads } = useDownloads();
  const getItem = useLibraryCache((s) => s.getItem);
  const [downloadedBooks, setDownloadedBooks] = useState<LibraryItem[]>([]);

  // Load full book data for completed downloads
  useEffect(() => {
    const loadDownloadedBooks = async () => {
      const completedDownloads = downloads.filter((d) => d.status === 'complete');
      const books: LibraryItem[] = [];

      for (const download of completedDownloads.slice(0, 10)) {
        const cachedBook = getItem(download.itemId);
        if (cachedBook) {
          books.push(cachedBook);
        } else {
          try {
            const book = await apiClient.getItem(download.itemId);
            books.push(book);
          } catch {
            // Skip if can't load
          }
        }
      }

      setDownloadedBooks(books);
    };

    loadDownloadedBooks();
  }, [downloads, getItem]);

  // Get current chapter info
  const currentChapterInfo = useMemo(() => {
    if (!chapters || chapters.length === 0) return { current: undefined, total: undefined };

    const currentPosition = isSeeking ? position : position;
    const chapterIndex = chapters.findIndex((ch, idx) => {
      const nextChapter = chapters[idx + 1];
      return currentPosition >= ch.start && (!nextChapter || currentPosition < nextChapter.start);
    });

    if (chapterIndex >= 0) {
      return { current: chapterIndex + 1, total: chapters.length };
    }
    return { current: 1, total: chapters.length };
  }, [chapters, position, isSeeking]);

  // Navigation handlers
  const handleLibraryPress = () => navigation.navigate('Main', { screen: 'LibraryTab' });
  const handleQueuePress = () => navigation.navigate('QueueScreen');
  const handleSeriesPress = useCallback((seriesName: string) => {
    navigation.navigate('SeriesDetail', { name: seriesName });
  }, [navigation]);

  // Player controls
  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else if (currentBook) {
      if (playerCurrentBook?.id === currentBook.id) {
        await play();
      } else {
        try {
          const fullBook = await apiClient.getItem(currentBook.id);
          await loadBook(fullBook, { autoPlay: true, showPlayer: false });
        } catch {
          await loadBook(currentBook, { autoPlay: true, showPlayer: false });
        }
      }
    }
  }, [isPlaying, pause, play, currentBook, playerCurrentBook, loadBook]);

  const handleSkipBackPressIn = useCallback(async () => {
    await startContinuousSeek('backward');
  }, [startContinuousSeek]);

  const handleSkipBackPressOut = useCallback(async () => {
    await stopContinuousSeek();
  }, [stopContinuousSeek]);

  const handleSkipForwardPressIn = useCallback(async () => {
    await startContinuousSeek('forward');
  }, [startContinuousSeek]);

  const handleSkipForwardPressOut = useCallback(async () => {
    await stopContinuousSeek();
  }, [stopContinuousSeek]);

  // Now Playing card tap opens player
  const togglePlayer = usePlayerStore((s) => s.togglePlayer);
  const handleNowPlayingPress = useCallback(() => {
    if (currentBook) {
      togglePlayer();
    }
  }, [currentBook, togglePlayer]);

  // Book card press
  const handleBookPress = useCallback((bookId: string) => {
    navigation.navigate('BookDetail', { id: bookId });
  }, [navigation]);

  // Resume book immediately
  const handleResumeBook = useCallback(async (book: LibraryItem) => {
    try {
      const fullBook = await apiClient.getItem(book.id);
      await loadBook(fullBook, { autoPlay: true, showPlayer: false });
    } catch {
      await loadBook(book, { autoPlay: true, showPlayer: false });
    }
  }, [loadBook]);

  // Continue Listening - exclude current book, take first 15
  const continueListeningBooks = useMemo(() => {
    if (!currentBook) return recentlyListened.slice(0, 15);
    return recentlyListened.filter(book => book.id !== currentBook.id).slice(0, 15);
  }, [recentlyListened, currentBook]);

  // Up Next - first 5 from queue
  const upNextBooks = useMemo(() => queue.slice(0, 5), [queue]);

  // Continue Series - series with in-progress books
  const continueSeriesData = useMemo(() => {
    return userSeries.filter(s => s.booksInProgress > 0).slice(0, 5);
  }, [userSeries]);

  // Get author from book
  const getBookAuthor = (book: LibraryItem): string => {
    const metadata = book.media?.metadata as any;
    if (!metadata) return '';
    if (metadata.authorName) return metadata.authorName;
    if (metadata.authors?.length > 0) {
      return metadata.authors.map((a: any) => a.name).join(', ');
    }
    return '';
  };

  // Render horizontal book card with progress
  const renderContinueListeningCard = useCallback(({ item }: { item: LibraryItem }) => {
    const coverUrl = apiClient.getItemCoverUrl(item.id);
    const title = item.media?.metadata?.title || 'Unknown';
    const progress = (item as any).userMediaProgress?.progress || 0;
    const progressPct = Math.round(progress * 100);

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
          {progressPct > 0 && (
            <>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.cardGradient}
              />
              <View style={styles.horizontalCardProgress}>
                <View style={[styles.horizontalCardProgressFill, { width: `${progressPct}%` }]} />
              </View>
              <Text style={styles.cardProgressText}>{progressPct}%</Text>
            </>
          )}
        </View>
        <Text style={styles.horizontalCardTitle} numberOfLines={2}>{title}</Text>
      </TouchableOpacity>
    );
  }, [handleResumeBook, handleBookPress]);

  // Render queue card with position badge
  const renderQueueCard = useCallback(({ item, index }: { item: any; index: number }) => {
    const coverUrl = apiClient.getItemCoverUrl(item.bookId);
    const title = item.book?.media?.metadata?.title || 'Unknown';
    const author = getBookAuthor(item.book);

    return (
      <TouchableOpacity
        style={styles.horizontalCard}
        onPress={() => handleBookPress(item.bookId)}
        activeOpacity={0.9}
      >
        <View style={styles.horizontalCardCoverContainer}>
          <Image
            source={coverUrl}
            style={styles.horizontalCardCover}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.queueNumberBadge}>
            <Text style={styles.queueNumberText}>{index + 1}</Text>
          </View>
        </View>
        <Text style={styles.horizontalCardTitle} numberOfLines={2}>{title}</Text>
        <Text style={styles.horizontalCardAuthor} numberOfLines={1}>{author}</Text>
      </TouchableOpacity>
    );
  }, [handleBookPress]);

  // Render series card with stacked covers
  const renderSeriesCard = useCallback(({ item }: { item: typeof userSeries[0] }) => {
    const books = item.books.slice(0, 3);
    const firstBook = books[0];
    const coverUrl = firstBook ? apiClient.getItemCoverUrl(firstBook.id) : undefined;
    const totalBooks = item.totalBooks;
    const completedBooks = item.booksCompleted || 0;
    const nextBook = completedBooks + 1;

    return (
      <TouchableOpacity
        style={styles.horizontalCard}
        onPress={() => handleSeriesPress(item.name)}
        activeOpacity={0.9}
      >
        <View style={styles.seriesCardContainer}>
          {/* Stacked covers */}
          {books.length > 2 && (
            <View style={[styles.stackedCover, styles.stackedCover3]}>
              <Image source={apiClient.getItemCoverUrl(books[2].id)} style={styles.stackedCoverImage} contentFit="cover" />
            </View>
          )}
          {books.length > 1 && (
            <View style={[styles.stackedCover, styles.stackedCover2]}>
              <Image source={apiClient.getItemCoverUrl(books[1].id)} style={styles.stackedCoverImage} contentFit="cover" />
            </View>
          )}
          {coverUrl ? (
            <View style={styles.stackedCoverMain}>
              <Image source={coverUrl} style={styles.horizontalCardCover} contentFit="cover" transition={200} />
            </View>
          ) : (
            <View style={[styles.horizontalCardCover, styles.placeholderCover]}>
              <Ionicons name="library" size={scale(32)} color={ACCENT} />
            </View>
          )}
          {/* Progress badge */}
          <View style={styles.seriesProgressBadge}>
            <Text style={styles.seriesProgressText}>Book {nextBook} of {totalBooks}</Text>
          </View>
        </View>
        <Text style={styles.horizontalCardTitle} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.seriesBookCount}>{item.booksInProgress} in progress</Text>
      </TouchableOpacity>
    );
  }, [handleSeriesPress, userSeries]);

  // Calculate progress
  const progressValue = duration > 0 ? position / duration : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background gradient */}
      <LinearGradient
        colors={['#1a1f1a', '#0d0f0d', '#000']}
        style={StyleSheet.absoluteFill}
      />

      {/* TopNav is now rendered at the navigator level */}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + TOP_NAV_HEIGHT + 8, paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={ACCENT} />
        }
      >
        {/* Greeting */}
        <Greeting username={user?.username} />

        {/* Compact Now Playing Card */}
        {currentBook ? (
          <CompactNowPlaying
            book={currentBook}
            isPlaying={isPlaying}
            isLoading={isPlayerLoading}
            progress={progressValue}
            currentTime={position}
            duration={duration}
            currentChapter={currentChapterInfo.current}
            totalChapters={currentChapterInfo.total}
            isSeeking={isSeeking}
            seekDirection={seekDirection}
            seekMagnitude={seekMagnitude}
            onPress={handleNowPlayingPress}
            onPlayPause={handlePlayPause}
            onSkipBackPressIn={handleSkipBackPressIn}
            onSkipBackPressOut={handleSkipBackPressOut}
            onSkipForwardPressIn={handleSkipForwardPressIn}
            onSkipForwardPressOut={handleSkipForwardPressOut}
          />
        ) : (
          <NothingPlayingCard onBrowse={handleLibraryPress} />
        )}

        {/* =============== CONTINUE LISTENING SECTION =============== */}
        <View style={styles.horizontalSection}>
          <SectionHeader
            title="Continue Listening"
            onViewAll={handleLibraryPress}
            showViewAll={continueListeningBooks.length > 0}
          />
          {continueListeningBooks.length > 0 ? (
            <FlatList
              data={continueListeningBooks}
              renderItem={renderContinueListeningCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          ) : (
            <EmptySection
              title="Start listening"
              description="Your in-progress books will appear here"
              ctaLabel="Browse Library"
              onCTAPress={handleLibraryPress}
            />
          )}
        </View>

        {/* =============== UP NEXT (QUEUE) SECTION =============== */}
        <View style={styles.horizontalSection}>
          <SectionHeader
            title="Up Next"
            onViewAll={handleQueuePress}
            showViewAll={upNextBooks.length > 0}
          />
          {upNextBooks.length > 0 ? (
            <FlatList
              data={upNextBooks}
              renderItem={renderQueueCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          ) : (
            <EmptySection
              title="Your queue is empty"
              description="Add books to plan your listening"
              ctaLabel="Browse Library"
              onCTAPress={handleLibraryPress}
            />
          )}
        </View>

        {/* =============== CONTINUE SERIES SECTION =============== */}
        {continueSeriesData.length > 0 && (
          <View style={styles.horizontalSection}>
            <SectionHeader
              title="Continue Series"
              onViewAll={handleLibraryPress}
              showViewAll={true}
            />
            <FlatList
              data={continueSeriesData}
              renderItem={renderSeriesCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* =============== DOWNLOADED BOOKS SECTION =============== */}
        {downloadedBooks.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Downloaded"
              onViewAll={handleLibraryPress}
              showViewAll={true}
            />
            {downloadedBooks.slice(0, 5).map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onPress={() => handleBookPress(book.id)}
                showListeningProgress={true}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Section
  section: {
    marginTop: scale(24),
    paddingHorizontal: scale(20),
  },

  // =============== HORIZONTAL SECTIONS ===============
  horizontalSection: {
    marginTop: scale(24),
  },
  horizontalList: {
    paddingHorizontal: scale(20),
    gap: scale(12),
  },

  // =============== HORIZONTAL CARDS ===============
  horizontalCard: {
    width: HORIZONTAL_CARD_WIDTH,
  },
  horizontalCardCoverContainer: {
    width: HORIZONTAL_CARD_COVER,
    height: HORIZONTAL_CARD_COVER,
    borderRadius: scale(10),
    overflow: 'hidden',
    marginBottom: scale(10),
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
  placeholderCover: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: ACCENT,
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
  horizontalCardAuthor: {
    fontSize: scale(10),
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },

  // Queue number badge
  queueNumberBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  queueNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },

  // =============== SERIES CARDS ===============
  seriesCardContainer: {
    width: HORIZONTAL_CARD_COVER,
    height: HORIZONTAL_CARD_COVER,
    marginBottom: scale(10),
    position: 'relative',
  },
  stackedCover: {
    position: 'absolute',
    borderRadius: 8,
    overflow: 'hidden',
  },
  stackedCover3: {
    top: 8,
    left: 16,
    width: HORIZONTAL_CARD_COVER - 16,
    height: HORIZONTAL_CARD_COVER - 16,
    opacity: 0.4,
  },
  stackedCover2: {
    top: 4,
    left: 8,
    width: HORIZONTAL_CARD_COVER - 8,
    height: HORIZONTAL_CARD_COVER - 8,
    opacity: 0.6,
  },
  stackedCoverMain: {
    width: HORIZONTAL_CARD_COVER,
    height: HORIZONTAL_CARD_COVER,
    borderRadius: scale(10),
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  stackedCoverImage: {
    width: '100%',
    height: '100%',
  },
  seriesProgressBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    zIndex: 2,
  },
  seriesProgressText: {
    fontSize: scale(9),
    fontWeight: '600',
    color: ACCENT,
  },
  seriesBookCount: {
    fontSize: scale(10),
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
});

export { HomeScreen as default };
