/**
 * src/features/book-detail/screens/BookDetailScreen.tsx
 *
 * Enhanced book detail screen with consistent action buttons,
 * series navigation, and clear state indicators.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useBookDetails } from '../hooks/useBookDetails';
import { OverviewTab } from '../components/OverviewTab';
import { ChaptersTab } from '../components/ChaptersTab';
import { ActionButtonsRow } from '../components/ActionButtonsRow';
import { SeriesNavigator } from '../components/SeriesNavigator';
import { ErrorView } from '@/shared/components';
import { useCoverUrl } from '@/core/cache';
import { apiClient } from '@/core/api';
import { usePlayerStore } from '@/features/player';
import { useDownloadStatus as useDownloadStatusHook } from '@/core/hooks/useDownloads';
import { downloadManager } from '@/core/services/downloadManager';
import { useQueueStore, useIsInQueue } from '@/features/queue/stores/queueStore';
import { TOP_NAV_HEIGHT } from '@/constants/layout';

// Design constants matching HomeScreen - minimal accent usage
const ACCENT = '#c1f40c';
const ACCENT_SUBTLE = 'rgba(193,244,12,0.6)'; // Muted accent for less prominence
const SCREEN_WIDTH = Dimensions.get('window').width;
const COVER_SIZE = SCREEN_WIDTH * 0.45;

type BookDetailRouteParams = {
  BookDetail: { id: string };
};

type TabType = 'overview' | 'chapters' | 'details';


export function BookDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<BookDetailRouteParams, 'BookDetail'>>();
  const navigation = useNavigation<any>();
  const { id: bookId } = route.params;
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const { book, isLoading, error, refetch } = useBookDetails(bookId);
  const { loadBook, currentBook, isPlaying, play, pause, position } = usePlayerStore();
  const {
    isDownloaded,
    isDownloading,
    isPending,
    isPaused,
    progress: downloadProgress,
    bytesDownloaded,
    totalBytes,
  } = useDownloadStatusHook(bookId);
  const isThisBookPlaying = currentBook?.id === bookId && isPlaying;
  const isThisBookLoaded = currentBook?.id === bookId;
  const coverUrl = useCoverUrl(bookId);

  // Queue state
  const queue = useQueueStore((s) => s.queue);
  const isInQueue = useIsInQueue(bookId);
  const addToQueue = useQueueStore((s) => s.addToQueue);
  const removeFromQueue = useQueueStore((s) => s.removeFromQueue);
  const reorderQueue = useQueueStore((s) => s.reorderQueue);

  // Get queue position (1-indexed)
  const queuePosition = useMemo(() => {
    const index = queue.findIndex(item => item.bookId === bookId);
    return index >= 0 ? index + 1 : 0;
  }, [queue, bookId]);

  // Calculate current position from progress or player state
  const currentPosition = useMemo(() => {
    if (isThisBookLoaded) {
      return position || 0;
    }
    const progress = (book as any)?.userMediaProgress?.progress || 0;
    const duration = (book?.media as any)?.duration || 0;
    return progress * duration;
  }, [isThisBookLoaded, position, book]);

  // Playback handlers
  const handlePlay = useCallback(async () => {
    if (!book) return;
    try {
      await loadBook(book, { showPlayer: false });
    } catch (err) {
      console.error('Failed to start playback:', err);
    }
  }, [book, loadBook]);

  const handlePause = useCallback(async () => {
    await pause();
  }, [pause]);

  const handleStream = useCallback(async () => {
    if (!book) return;
    try {
      // Stream without downloading
      await loadBook(book, { showPlayer: false });
    } catch (err) {
      console.error('Failed to stream:', err);
      Alert.alert('Streaming Error', 'Could not start streaming. Check your connection.');
    }
  }, [book, loadBook]);

  const handlePlayFromBeginning = useCallback(async () => {
    if (!book) return;
    try {
      await loadBook(book, { showPlayer: false, startPosition: 0 });
    } catch (err) {
      console.error('Failed to restart playback:', err);
    }
  }, [book, loadBook]);

  // Download handlers
  const handleDownload = useCallback(() => {
    if (!book) return;
    if (isDownloaded || isDownloading || isPending) return;
    downloadManager.queueDownload(book);
  }, [book, isDownloaded, isDownloading, isPending]);

  const handlePauseDownload = useCallback(() => {
    downloadManager.pauseDownload(bookId);
  }, [bookId]);

  const handleResumeDownload = useCallback(() => {
    downloadManager.resumeDownload(bookId);
  }, [bookId]);

  const handleCancelDownload = useCallback(() => {
    Alert.alert(
      'Cancel Download',
      'Are you sure you want to cancel this download?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: () => downloadManager.cancelDownload(bookId) },
      ]
    );
  }, [bookId]);

  const handleDeleteDownload = useCallback(() => {
    Alert.alert(
      'Delete Download',
      'This will remove the downloaded file. You can download it again later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => downloadManager.deleteDownload(bookId) },
      ]
    );
  }, [bookId]);

  // Queue handlers
  const handleAddToQueue = useCallback(() => {
    if (!book) return;
    addToQueue(book);
  }, [book, addToQueue]);

  const handleRemoveFromQueue = useCallback(() => {
    removeFromQueue(bookId);
  }, [bookId, removeFromQueue]);

  const handleMoveToTop = useCallback(() => {
    const currentIndex = queue.findIndex(item => item.bookId === bookId);
    if (currentIndex > 0) {
      reorderQueue(currentIndex, 0);
    }
  }, [queue, bookId, reorderQueue]);

  const handleShare = useCallback(async () => {
    if (!book) return;

    const metadata = book.media?.metadata as any;
    const title = metadata?.title || 'Unknown Title';
    const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';

    // Build book URL
    const serverUrl = apiClient.getBaseURL();
    const bookUrl = serverUrl ? `${serverUrl}/item/${book.id}` : null;

    let shareText = `Check out "${title}" by ${author}`;
    if (bookUrl) {
      shareText += `\n\n${bookUrl}`;
    }

    try {
      await Share.share({
        message: shareText,
        url: bookUrl || undefined,
      });
    } catch (err) {
      console.error('Share failed:', err);
    }
  }, [book]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error || !book) {
    return <ErrorView message="Failed to load book details" onRetry={refetch} />;
  }

  // Derived values - handle both cached and expanded API data
  const metadata = book.media.metadata as any;
  const title = metadata.title || 'Unknown Title';

  // Author: try authorName, then authors array (expanded), then fallback
  let author = metadata.authorName || '';
  if (!author && metadata.authors?.length > 0) {
    author = metadata.authors.map((a: any) => a.name || a).filter(Boolean).join(', ');
  }
  if (!author) author = 'Unknown Author';

  // Narrator: try narratorName, then narrators array
  let rawNarrator = metadata.narratorName || '';
  if (!rawNarrator && metadata.narrators?.length > 0) {
    rawNarrator = metadata.narrators.map((n: any) => typeof n === 'string' ? n : n.name).filter(Boolean).join(', ');
  }
  const narrator = rawNarrator.replace(/^Narrated by\s*/i, '').trim() || null;

  const genres = metadata.genres || [];
  const chapters = book.media.chapters || [];

  // Series: try series array first (expanded), then seriesName string
  const series = metadata.series?.[0] || metadata.seriesName || null;
  const seriesSequence = metadata.series?.[0]?.sequence || null;

  let duration = book.media.duration || 0;
  if (!duration && book.media.audioFiles?.length) {
    duration = book.media.audioFiles.reduce((sum: number, f: any) => sum + (f.duration || 0), 0);
  }

  const progress = book.userMediaProgress?.progress || 0;
  const hasProgress = progress > 0 && progress < 1;
  const progressPercent = Math.round(progress * 100);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const playButtonText = hasProgress ? 'Continue' : 'Play';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Blurred cover background */}
      {coverUrl && (
        <View style={StyleSheet.absoluteFill}>
          <Image
            source={coverUrl}
            style={styles.backgroundImage}
            contentFit="cover"
            blurRadius={60}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}
      {!coverUrl && (
        <LinearGradient
          colors={['#2d3a2d', '#1a1f1a', '#0d0f0d']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Header - Back button and share button */}
      <View style={[styles.header, { paddingTop: insets.top + TOP_NAV_HEIGHT + 8 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover and Info */}
        <View style={styles.coverSection}>
          {/* Title and Author above cover */}
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          <Text style={styles.author}>{author}</Text>

          <View style={styles.coverContainer}>
            <Image source={coverUrl} style={styles.cover} contentFit="cover" />
          </View>

          {/* Narrator below cover */}
          {narrator && <Text style={styles.narrator}>Narrated by {narrator}</Text>}

          {/* Progress */}
          {hasProgress && (
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressText}>{progressPercent}% Complete</Text>
            </View>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={18} color="rgba(255,255,255,0.5)" />
            <Text style={styles.statValue}>{formatDuration(duration)}</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => setActiveTab('chapters')}
            activeOpacity={0.7}
          >
            <Ionicons name="list-outline" size={18} color="rgba(255,255,255,0.5)" />
            <Text style={[styles.statValue, styles.statValueClickable]}>{chapters.length} Chapters</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        </View>

        {/* Series Navigation */}
        <SeriesNavigator book={book} />

        {/* Action Buttons - Download, Play, Queue */}
        <ActionButtonsRow
          book={book}
          // Download state
          isDownloaded={isDownloaded}
          isDownloading={isDownloading}
          isPending={isPending}
          isPaused={isPaused}
          downloadProgress={downloadProgress}
          bytesDownloaded={bytesDownloaded}
          totalBytes={totalBytes}
          fileSize={totalBytes}
          // Playback state
          isPlaying={isThisBookPlaying}
          isLoaded={isThisBookLoaded}
          currentPosition={currentPosition}
          progress={progress}
          duration={duration}
          // Queue state
          isInQueue={isInQueue}
          queuePosition={queuePosition}
          // Callbacks
          onDownload={handleDownload}
          onPauseDownload={handlePauseDownload}
          onResumeDownload={handleResumeDownload}
          onCancelDownload={handleCancelDownload}
          onDeleteDownload={handleDeleteDownload}
          onPlay={handlePlay}
          onPause={handlePause}
          onStream={handleStream}
          onPlayFromBeginning={handlePlayFromBeginning}
          onAddToQueue={handleAddToQueue}
          onRemoveFromQueue={handleRemoveFromQueue}
          onMoveToTop={handleMoveToTop}
        />

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'chapters' && styles.tabActive]}
            onPress={() => setActiveTab('chapters')}
          >
            <Text style={[styles.tabText, activeTab === 'chapters' && styles.tabTextActive]}>
              Chapters
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'details' && styles.tabActive]}
            onPress={() => setActiveTab('details')}
          >
            <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>
              Details
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && (
            <OverviewTab book={book} />
          )}
          {activeTab === 'chapters' && (
            <ChaptersTab
              chapters={chapters}
              currentPosition={currentPosition}
              bookId={bookId}
              book={book}
            />
          )}
          {activeTab === 'details' && (
            <View style={styles.detailsTab}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>TITLE</Text>
                <Text style={styles.detailValue}>{title}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>AUTHOR</Text>
                <Text style={styles.detailValue}>{author}</Text>
              </View>
              {narrator && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>NARRATOR</Text>
                  <Text style={styles.detailValue}>{narrator}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>DURATION</Text>
                <Text style={styles.detailValue}>{formatDuration(duration)}</Text>
              </View>
              {metadata.publishedYear && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>PUBLISHED</Text>
                  <Text style={styles.detailValue}>{metadata.publishedYear}</Text>
                </View>
              )}
              {metadata.publisher && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>PUBLISHER</Text>
                  <Text style={styles.detailValue}>{metadata.publisher}</Text>
                </View>
              )}
              {genres.length > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>GENRES</Text>
                  <View style={styles.genrePills}>
                    {genres.map((genre: string, idx: number) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.genrePill}
                        onPress={() => (navigation as any).navigate('GenreDetail', { genreName: genre })}
                      >
                        <Text style={styles.genrePillText}>#{genre.toLowerCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 12,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 100,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollView: {
    flex: 1,
  },

  // Cover Section
  coverSection: {
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 20,
  },
  coverContainer: {
    width: COVER_SIZE,
    height: COVER_SIZE * 1.1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  author: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 4,
  },
  narrator: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },

  // Progress
  progressSection: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
  },
  progressBar: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.7)', // Subtle white instead of green
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
    letterSpacing: 0.2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 16,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statValue: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.2,
  },
  statValueClickable: {
    textDecorationLine: 'underline',
  },
  // Genre Pills (in Details tab)
  genrePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  genrePill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  genrePillText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tab: {
    paddingVertical: 14,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: 'rgba(255,255,255,0.8)', // Subtle white instead of green
  },
  tabText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  tabContent: {
    paddingTop: 20,
  },

  // Details Tab
  detailsTab: {
    paddingHorizontal: 20,
  },
  detailRow: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
    letterSpacing: 1,
  },
  detailValue: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
  },
});
