/**
 * src/features/library/components/tabs/AllBooksTab.tsx
 *
 * All books tab content for MyLibraryScreen.
 * Shows continue listening hero, books, series, authors, narrators.
 *
 * Uses FlatList for proper virtualization - only renders visible items.
 * Non-book sections (hero, downloads, series, authors, narrators) are
 * rendered as ListHeaderComponent and ListFooterComponent.
 */

import React, { useCallback } from 'react';
import { View, ScrollView, FlatList, StyleSheet, Platform } from 'react-native';
import type { BookMedia } from '@/core/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SectionHeader } from '@/shared/components/SectionHeader';
import { ContinueListeningHero } from '../ContinueListeningHero';
import { LibraryEmptyState } from '../LibraryEmptyState';
import { BookRow } from '../BookRow';
import { FannedSeriesCard } from '../FannedSeriesCard';
import { PersonCard } from '../PersonCard';
import { DownloadItem } from '@/features/downloads/components/DownloadItem';
import { scale } from '@/shared/theme';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { EnrichedBook, FannedSeriesCardData } from '../../types';

interface AllBooksTabProps {
  books: EnrichedBook[];
  continueListeningBook: any | null;
  activeDownloads: any[];
  favoriteSeriesData: FannedSeriesCardData[];
  favoriteAuthorData: any[];
  favoriteNarratorData: any[];
  onBookPress: (bookId: string) => void;
  onBookPlay: (book: EnrichedBook) => void;
  onContinueListeningPlay: () => void;
  onSeriesPress: (seriesName: string) => void;
  onAuthorPress: (authorName: string) => void;
  onNarratorPress: (narratorName: string) => void;
  onDownloadPause: (itemId: string) => void;
  onDownloadResume: (itemId: string) => void;
  onDownloadDelete: (itemId: string) => void;
  onPauseAll: () => void;
  onResumeAll: () => void;
  isMarkedFinished: (bookId: string) => boolean;
  hasDownloading: boolean;
  hasPaused: boolean;
  onBrowse: () => void;
  // Refresh control props passed from parent
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function AllBooksTab({
  books,
  continueListeningBook,
  activeDownloads,
  favoriteSeriesData,
  favoriteAuthorData,
  favoriteNarratorData,
  onBookPress,
  onBookPlay,
  onContinueListeningPlay,
  onSeriesPress,
  onAuthorPress,
  onNarratorPress,
  onDownloadPause,
  onDownloadResume,
  onDownloadDelete,
  isMarkedFinished,
  onBrowse,
  refreshing = false,
  onRefresh,
}: AllBooksTabProps) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const hasContent = books.length > 0 || activeDownloads.length > 0 ||
    favoriteSeriesData.length > 0 || favoriteAuthorData.length > 0 ||
    favoriteNarratorData.length > 0;

  // Get continue listening hero data
  const heroBook = continueListeningBook;
  const heroProgress = heroBook?.userMediaProgress?.progress || 0;
  const heroDuration = (heroBook?.media as BookMedia | undefined)?.duration || 0;
  const heroRemainingSeconds = heroDuration * (1 - heroProgress);
  const showHero = heroBook && heroProgress > 0 && heroProgress < 0.95;

  // Memoized render function for FlatList
  const renderItem = useCallback(({ item: book }: { item: EnrichedBook }) => (
    <BookRow
      book={book}
      onPress={() => onBookPress(book.id)}
      onLongPress={() => navigation.navigate('BookDetail', { id: book.id })}
      onPlay={() => onBookPlay(book)}
      isMarkedFinished={isMarkedFinished(book.id)}
    />
  ), [onBookPress, onBookPlay, isMarkedFinished, navigation]);

  const keyExtractor = useCallback((item: EnrichedBook) => item.id, []);

  // Header: hero + downloads + books section header
  const ListHeader = useCallback(() => (
    <View>
      {/* Continue Listening Hero */}
      {showHero && (
        <ContinueListeningHero
          book={heroBook}
          progress={heroProgress}
          remainingSeconds={heroRemainingSeconds}
          onPlay={onContinueListeningPlay}
          onPress={() => onBookPress(heroBook.id)}
        />
      )}

      {/* Downloading Section */}
      {activeDownloads.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title={`Downloading (${activeDownloads.length})`}
            showViewAll={false}
          />
          <View style={styles.downloadList}>
            {activeDownloads.map((download) => (
              <DownloadItem
                key={download.itemId}
                download={download}
                onPause={() => onDownloadPause(download.itemId)}
                onResume={() => onDownloadResume(download.itemId)}
                onDelete={() => onDownloadDelete(download.itemId)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Books section header */}
      {books.length > 0 && (
        <SectionHeader title={`Books (${books.length})`} showViewAll={false} />
      )}
    </View>
  ), [showHero, heroBook, heroProgress, heroRemainingSeconds, onContinueListeningPlay, onBookPress, activeDownloads, onDownloadPause, onDownloadResume, onDownloadDelete, books.length]);

  // Footer: series, authors, narrators
  const ListFooter = useCallback(() => (
    <View>
      {/* Series Section */}
      {favoriteSeriesData.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={`Series (${favoriteSeriesData.length})`} showViewAll={false} />
          <View style={styles.fannedSeriesGrid}>
            {favoriteSeriesData.map((series) => (
              <FannedSeriesCard
                key={series.name}
                series={series}
                onPress={() => onSeriesPress(series.name)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Authors Section */}
      {favoriteAuthorData.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={`Authors (${favoriteAuthorData.length})`} showViewAll={false} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {favoriteAuthorData.map((author: any) => (
              <PersonCard
                key={author.name}
                name={author.name}
                imageUrl={author.imageUrl}
                bookCount={author.books?.length || 0}
                type="author"
                onPress={() => onAuthorPress(author.name)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Narrators Section */}
      {favoriteNarratorData.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={`Narrators (${favoriteNarratorData.length})`} showViewAll={false} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {favoriteNarratorData.map((narrator: any) => (
              <PersonCard
                key={narrator.name}
                name={narrator.name}
                bookCount={narrator.books?.length || 0}
                type="narrator"
                onPress={() => onNarratorPress(narrator.name)}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  ), [favoriteSeriesData, favoriteAuthorData, favoriteNarratorData, onSeriesPress, onAuthorPress, onNarratorPress]);

  if (!hasContent) {
    return <LibraryEmptyState tab="all" onAction={onBrowse} />;
  }

  return (
    <FlatList
      data={books}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeader}
      ListFooterComponent={ListFooter}
      // Performance optimizations
      removeClippedSubviews={Platform.OS === 'android'}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={5}
      // Pull to refresh
      refreshing={refreshing}
      onRefresh={onRefresh}
      // Content styling
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom },
      ]}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: scale(24),
  },
  downloadList: {
    paddingHorizontal: scale(16),
  },
  fannedSeriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: scale(16),
    gap: scale(12),
  },
  horizontalList: {
    paddingHorizontal: scale(20),
    gap: scale(12),
  },
  listContent: {
    flexGrow: 1,
  },
});

export default AllBooksTab;
