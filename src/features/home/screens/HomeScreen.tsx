/**
 * src/features/home/screens/HomeScreen.tsx
 *
 * Main home screen with Now Playing card and carousels
 * Anima layout: 402px base width, gap-6 (24px) between sections
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Text,
  RefreshControl,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/shared/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LibraryItem } from '@/core/types';
import { apiClient } from '@/core/api';
import { usePlayerStore } from '@/features/player';
import { useRobustSeekControl } from '@/features/player/hooks/useRobustSeekControl';

// Hooks
import { useHomeData } from '../hooks/useHomeData';

// Components
import { HomeBackground } from '../components/HomeBackground';
import { NowPlayingCard } from '../components/NowPlayingCard';
import { SectionHeader } from '../components/SectionHeader';
import { HorizontalCarousel } from '../components/HorizontalCarousel';
import { SeriesCard } from '../components/SeriesCard';
import { PlaylistCard } from '../components/PlaylistCard';
import { SpeedPanel } from '@/features/player/panels/SpeedPanel';
import { SleepPanel } from '@/features/player/panels/SleepPanel';
import { DetailsPanel } from '@/features/player/panels/DetailsPanel';
import { BookListItem } from '@/shared/components';

// Design constants
import { COLORS, LAYOUT } from '../homeDesign';

// Types
import { SeriesWithBooks, PlaylistDisplay } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const {
    currentBook,
    currentProgress,
    recentlyListened,
    recentBooks,
    userSeries,
    userPlaylists,
    isLoading,
    isRefreshing,
    refresh,
  } = useHomeData();

  const {
    currentBook: playerCurrentBook,
    isPlaying,
    playbackRate,
    sleepTimer,
    loadBook,
    play,
    pause,
    setPlaybackRate,
    setSleepTimer,
    clearSleepTimer,
  } = usePlayerStore();

  // Check if we have a book actually loaded in the player (not just displayed from API)
  const isPlayerReady = !!playerCurrentBook;

  // Seek control - same as PlayerScreen
  const {
    isSeeking,
    seekDirection,
    seekDelta,
    startContinuousSeek,
    stopContinuousSeek,
  } = useRobustSeekControl();

  // Panel state
  type PanelMode = 'none' | 'speed' | 'sleep' | 'details';
  const [panelMode, setPanelMode] = useState<PanelMode>('none');
  const [tempSpeed, setTempSpeed] = useState(playbackRate);
  const [tempSleepMins, setTempSleepMins] = useState(30);
  const [sleepInputValue, setSleepInputValue] = useState('30');

  const currentCoverUrl = currentBook ? apiClient.getItemCoverUrl(currentBook.id) : undefined;

  // Track if we've already prefetched this book
  const prefetchedBookIdRef = useRef<string | null>(null);

  // Prefetch the current book so controls work instantly (without opening player)
  useEffect(() => {
    const prefetchBook = async () => {
      // Don't prefetch if no book, or already loaded in player, or already prefetched this book
      if (!currentBook) return;
      if (playerCurrentBook?.id === currentBook.id) return;
      if (prefetchedBookIdRef.current === currentBook.id) return;

      prefetchedBookIdRef.current = currentBook.id;

      try {
        const fullBook = await apiClient.getItem(currentBook.id);
        await loadBook(fullBook, { autoPlay: false, showPlayer: false });
      } catch {
        await loadBook(currentBook, { autoPlay: false, showPlayer: false });
      }
    };

    prefetchBook();
  }, [currentBook?.id, playerCurrentBook?.id, loadBook]);

  const handleBookPress = useCallback(
    async (book: LibraryItem) => {
      try {
        const fullBook = await apiClient.getItem(book.id);
        await loadBook(fullBook, { autoPlay: false, showPlayer: false });
      } catch {
        await loadBook(book, { autoPlay: false, showPlayer: false });
      }
    },
    [loadBook]
  );

  // Play a book from list view (starts playback without opening player)
  const handlePlayBook = useCallback(
    async (book: LibraryItem) => {
      try {
        const fullBook = await apiClient.getItem(book.id);
        await loadBook(fullBook, { autoPlay: true, showPlayer: false });
      } catch {
        await loadBook(book, { autoPlay: true, showPlayer: false });
      }
    },
    [loadBook]
  );

  const handleSeriesPress = useCallback(
    (series: SeriesWithBooks) => {
      navigation.navigate('SeriesDetail', { seriesName: series.name });
    },
    [navigation]
  );

  const handlePlaylistPress = useCallback(
    (playlist: PlaylistDisplay) => {
      console.log('Playlist pressed:', playlist.id);
    },
    []
  );

  const handleViewAllBooks = useCallback(() => {
    navigation.navigate('LibraryTab');
  }, [navigation]);

  const handleViewAllSeries = useCallback(() => {
    navigation.navigate('LibraryTab', { scrollToSeries: true });
  }, [navigation]);

  const handleViewAllPlaylists = useCallback(() => {
    console.log('View all playlists');
  }, []);

  const handleSettingsPress = useCallback(() => {
    navigation.navigate('ProfileTab');
  }, [navigation]);

  const handleRecommendationsPress = useCallback(() => {
    navigation.navigate('DiscoverTab');
  }, []);

  const handleNowPlayingPress = useCallback(() => {
    // Navigate to player
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      // If no book loaded in player but we have a currentBook to show, load it first
      if (!isPlayerReady && currentBook) {
        try {
          const fullBook = await apiClient.getItem(currentBook.id);
          await loadBook(fullBook, { autoPlay: true, showPlayer: false });
        } catch {
          await loadBook(currentBook, { autoPlay: true, showPlayer: false });
        }
      } else {
        await play();
      }
    }
  }, [isPlaying, play, pause, isPlayerReady, currentBook, loadBook]);

  const handleSpeedPress = useCallback(() => {
    setTempSpeed(playbackRate);
    setPanelMode(panelMode === 'speed' ? 'none' : 'speed');
  }, [playbackRate, panelMode]);

  const handleSleepPress = useCallback(() => {
    setPanelMode(panelMode === 'sleep' ? 'none' : 'sleep');
  }, [panelMode]);

  const handleApplySpeed = useCallback(() => {
    setPlaybackRate?.(tempSpeed);
    setPanelMode('none');
  }, [tempSpeed, setPlaybackRate]);

  const handleStartSleep = useCallback(() => {
    setSleepTimer?.(tempSleepMins * 60);
    setPanelMode('none');
  }, [tempSleepMins, setSleepTimer]);

  const handleClearSleep = useCallback(() => {
    clearSleepTimer?.();
    setPanelMode('none');
  }, [clearSleepTimer]);

  // Cover tap shows details panel
  const handleCoverPress = useCallback(() => {
    setPanelMode(panelMode === 'details' ? 'none' : 'details');
  }, [panelMode]);

  // Download button (placeholder for now)
  const handleDownloadPress = useCallback(() => {
    console.log('Download pressed');
    // TODO: Implement download functionality
  }, []);

  // Helper to ensure book is loaded before seeking (without opening player)
  const ensureBookLoaded = useCallback(async () => {
    const store = usePlayerStore.getState();
    if (!store.currentBook && currentBook) {
      try {
        const fullBook = await apiClient.getItem(currentBook.id);
        await loadBook(fullBook, { autoPlay: false, showPlayer: false });
      } catch {
        await loadBook(currentBook, { autoPlay: false, showPlayer: false });
      }
    }
  }, [currentBook, loadBook]);

  // Long press cover opens player
  const openPlayer = useCallback(async () => {
    await ensureBookLoaded();
    usePlayerStore.setState({ isPlayerVisible: true });
  }, [ensureBookLoaded]);

  // Skip handlers - press and hold for continuous seek (same as PlayerScreen)
  const handleSkipBackwardPressIn = useCallback(async () => {
    await ensureBookLoaded();
    await startContinuousSeek('backward');
  }, [ensureBookLoaded, startContinuousSeek]);

  const handleSkipBackwardPressOut = useCallback(async () => {
    await stopContinuousSeek();
  }, [stopContinuousSeek]);

  const handleSkipForwardPressIn = useCallback(async () => {
    await ensureBookLoaded();
    await startContinuousSeek('forward');
  }, [ensureBookLoaded, startContinuousSeek]);

  const handleSkipForwardPressOut = useCallback(async () => {
    await stopContinuousSeek();
  }, [stopContinuousSeek]);

  // Convert sleepTimer from seconds to minutes
  const sleepTimerMinutes = sleepTimer ? Math.round(sleepTimer / 60) : null;

  if (isLoading && !currentBook && recentBooks.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.playButton} />
      </View>
    );
  }

  if (!currentBook && recentBooks.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.emptyIcon}>📚</Text>
        <Text style={styles.emptyTitle}>No Books Yet</Text>
        <Text style={styles.emptySubtitle}>
          Start listening to see your books here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <HomeBackground coverUrl={currentCoverUrl} />


      <ScrollView
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + scale(18),
            paddingBottom: insets.bottom + LAYOUT.tabBarHeight + scale(20),
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={COLORS.playButton}
          />
        }
      >
        {/* Now Playing Card OR Panel */}
        {currentBook && (
          <View style={styles.nowPlayingContainer}>
            <NowPlayingCard
              book={currentBook}
              progress={currentProgress}
              isPlaying={isPlaying}
              playbackSpeed={playbackRate}
              sleepTimer={sleepTimerMinutes}
              onPress={handleNowPlayingPress}
              onCoverPress={handleCoverPress}
              onPlay={handlePlayPause}
              onSkipBackPressIn={handleSkipBackwardPressIn}
              onSkipBackPressOut={handleSkipBackwardPressOut}
              onSkipForwardPressIn={handleSkipForwardPressIn}
              onSkipForwardPressOut={handleSkipForwardPressOut}
              onSpeedPress={handleSpeedPress}
              onSleepPress={handleSleepPress}
              onDownloadPress={handleDownloadPress}
              onClosePanel={() => setPanelMode('none')}
              onLongPress={openPlayer}
              isSeeking={isSeeking}
              seekDelta={seekDelta}
              seekDirection={seekDirection}
              panelMode={panelMode}
              panelContent={
                panelMode === 'speed' ? (
                  <SpeedPanel
                    tempSpeed={tempSpeed}
                    setTempSpeed={setTempSpeed}
                    onApply={handleApplySpeed}
                    onClose={() => setPanelMode('none')}
                    isLight={false}
                  />
                ) : panelMode === 'sleep' ? (
                  <SleepPanel
                    tempSleepMins={tempSleepMins}
                    setTempSleepMins={setTempSleepMins}
                    sleepInputValue={sleepInputValue}
                    setSleepInputValue={setSleepInputValue}
                    onClear={handleClearSleep}
                    onStart={handleStartSleep}
                    isLight={false}
                  />
                ) : panelMode === 'details' ? (
                  <DetailsPanel
                    book={currentBook}
                    duration={(currentBook.media as any)?.duration || 0}
                    chaptersCount={(currentBook.media as any)?.chapters?.length || 0}
                    isLight={false}
                  />
                ) : null
              }
            />
          </View>
        )}

        {/* Recently Listened Section - List view */}
        {recentlyListened.length > 0 && (
          <View style={styles.recentlyListenedSection}>
            <SectionHeader title="Recently Listened" />
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

        {/* Your Books Section - List view, show first 3 */}
        {recentBooks.length > 0 && (
          <View style={styles.booksSection}>
            <SectionHeader title="Your Books" onViewAll={handleViewAllBooks} />
            {recentBooks.slice(0, 3).map((book) => (
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

        {/* Your Series Section - gap:20px from Anima */}
        {userSeries.length > 0 && (
          <View style={styles.seriesSection}>
            <SectionHeader title="Your Series" onViewAll={handleViewAllSeries} />
            <HorizontalCarousel
              data={userSeries}
              keyExtractor={(series) => series.id}
              itemWidth={scale(110)}
              gap={scale(10)}
              contentPadding={scale(29)}
              renderItem={(series) => (
                <SeriesCard
                  series={series}
                  onPress={() => handleSeriesPress(series)}
                />
              )}
            />
          </View>
        )}

        {/* Your Playlists Section - gap:16px from Anima */}
        {userPlaylists.length > 0 && (
          <View style={styles.playlistsSection}>
            <SectionHeader title="Your Playlists" onViewAll={handleViewAllPlaylists} />
            <HorizontalCarousel
              data={userPlaylists}
              keyExtractor={(playlist) => playlist.id}
              itemWidth={scale(110)}
              gap={scale(10)}
              contentPadding={scale(29)}
              renderItem={(playlist) => (
                <PlaylistCard
                  playlist={playlist}
                  onPress={() => handlePlaylistPress(playlist)}
                />
              )}
            />
          </View>
        )}

        {/* Bottom Action Buttons */}
        <View style={styles.bottomButtonsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSettingsPress}
            activeOpacity={0.7}
          >
            <Icon name="settings-outline" size={24} color={COLORS.textPrimary} set="ionicons" />
            <Text style={styles.actionButtonText}>Settings</Text>
            <Icon name="chevron-forward" size={20} color={COLORS.textSecondary} set="ionicons" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRecommendationsPress}
            activeOpacity={0.7}
          >
            <Icon name="sparkles-outline" size={24} color={COLORS.textPrimary} set="ionicons" />
            <Text style={styles.actionButtonText}>Recommendations</Text>
            <Icon name="chevron-forward" size={20} color={COLORS.textSecondary} set="ionicons" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)', '#000000']}
        locations={[0, 0.5, 1]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  nowPlayingContainer: {
    alignItems: 'center',
    paddingHorizontal: scale(10),
  },
  recentlyListenedSection: {
    marginTop: scale(30),
  },
  booksSection: {
    marginTop: scale(24),
  },
  // Anima: gap-[23px] between books and series
  seriesSection: {
    marginTop: scale(23),
  },
  // Anima: gap-[16px] between series and playlists (slightly less)
  playlistsSection: {
    marginTop: scale(16),
  },
  bottomButtonsSection: {
    marginTop: scale(32),
    paddingHorizontal: scale(29),
    gap: scale(12),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: scale(12),
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
  },
  actionButtonText: {
    flex: 1,
    fontSize: scale(16),
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginLeft: scale(12),
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: LAYOUT.bottomGradientHeight,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export { HomeScreen as default };
export { COLORS as HOME_CONFIG } from '../homeDesign';
