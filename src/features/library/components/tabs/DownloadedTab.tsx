/**
 * src/features/library/components/tabs/DownloadedTab.tsx
 *
 * Downloaded books tab content for MyLibraryScreen.
 * Shows downloading section, downloaded books, series, and storage summary.
 *
 * Uses FlatList for proper virtualization - only renders visible items.
 * Downloads section is rendered as ListHeaderComponent, series and
 * storage summary as ListFooterComponent.
 */

import React, { useCallback } from 'react';
import { View, FlatList, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionHeader } from '@/shared/components/SectionHeader';
import { LibraryEmptyState } from '../LibraryEmptyState';
import { BookRow } from '../BookRow';
import { FannedSeriesCard } from '../FannedSeriesCard';
import { StorageSummary } from '../StorageSummary';
import { DownloadItem } from '@/features/downloads/components/DownloadItem';
import { scale } from '@/shared/theme';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { EnrichedBook, SeriesGroup } from '../../types';

interface DownloadedTabProps {
  books: EnrichedBook[];
  seriesGroups: SeriesGroup[];
  activeDownloads: any[];
  totalStorageUsed: number;
  onBookPress: (bookId: string) => void;
  onBookPlay: (book: EnrichedBook) => void;
  onSeriesPress: (seriesName: string) => void;
  onDownloadPause: (itemId: string) => void;
  onDownloadResume: (itemId: string) => void;
  onDownloadDelete: (itemId: string) => void;
  onPauseAll: () => void;
  onResumeAll: () => void;
  onManageStorage: () => void;
  isMarkedFinished: (bookId: string) => boolean;
  hasDownloading: boolean;
  hasPaused: boolean;
  onBrowse: () => void;
  // Refresh control props passed from parent
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function DownloadedTab({
  books,
  seriesGroups,
  activeDownloads,
  totalStorageUsed,
  onBookPress,
  onBookPlay,
  onSeriesPress,
  onDownloadPause,
  onDownloadResume,
  onDownloadDelete,
  onManageStorage,
  isMarkedFinished,
  onBrowse,
  refreshing = false,
  onRefresh,
}: DownloadedTabProps) {
  const insets = useSafeAreaInsets();
  const hasContent = books.length > 0 || activeDownloads.length > 0;

  // Memoized render function for FlatList
  const renderItem = useCallback(({ item: book }: { item: EnrichedBook }) => (
    <BookRow
      book={book}
      onPress={() => onBookPress(book.id)}
      onPlay={() => onBookPlay(book)}
      isMarkedFinished={isMarkedFinished(book.id)}
    />
  ), [onBookPress, onBookPlay, isMarkedFinished]);

  const keyExtractor = useCallback((item: EnrichedBook) => item.id, []);

  // Header: active downloads + books section header
  const ListHeader = useCallback(() => (
    <View>
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
        <SectionHeader title={`Downloaded Books (${books.length})`} showViewAll={false} />
      )}
    </View>
  ), [activeDownloads, onDownloadPause, onDownloadResume, onDownloadDelete, books.length]);

  // Footer: series groups + storage summary
  const ListFooter = useCallback(() => (
    <View>
      {/* Downloaded Series Section */}
      {seriesGroups.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={`Downloaded Series (${seriesGroups.length})`} showViewAll={false} />
          <View style={styles.fannedSeriesGrid}>
            {seriesGroups.map((series) => (
              <FannedSeriesCard
                key={series.name}
                series={series}
                onPress={() => onSeriesPress(series.name)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Storage Summary */}
      <StorageSummary
        usedBytes={totalStorageUsed}
        bookCount={books.length}
        onManagePress={onManageStorage}
      />
    </View>
  ), [seriesGroups, totalStorageUsed, books.length, onSeriesPress, onManageStorage]);

  if (!hasContent) {
    return <LibraryEmptyState tab="downloaded" onAction={onBrowse} />;
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
  listContent: {
    flexGrow: 1,
  },
});

export default DownloadedTab;
