/**
 * src/features/library/components/tabs/FavoritesTab.tsx
 *
 * Favorites tab content for MyLibraryScreen.
 * Shows favorite books, authors, series, and narrators.
 *
 * Uses FlatList for proper virtualization - only renders visible items.
 * Non-book sections (authors, series, narrators) are rendered as
 * ListHeaderComponent and ListFooterComponent.
 */

import React, { useCallback } from 'react';
import { View, ScrollView, FlatList, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionHeader } from '@/shared/components/SectionHeader';
import { LibraryEmptyState } from '../LibraryEmptyState';
import { BookRow } from '../BookRow';
import { FannedSeriesCard } from '../FannedSeriesCard';
import { PersonCard } from '../PersonCard';
import { scale } from '@/shared/theme';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { EnrichedBook, FannedSeriesCardData } from '../../types';

interface FavoritesTabProps {
  favoritedBooks: EnrichedBook[];
  favoriteAuthorData: any[];
  favoriteSeriesData: FannedSeriesCardData[];
  favoriteNarratorData: any[];
  onBookPress: (bookId: string) => void;
  onBookPlay: (book: EnrichedBook) => void;
  onSeriesPress: (seriesName: string) => void;
  onAuthorPress: (authorName: string) => void;
  onNarratorPress: (narratorName: string) => void;
  isMarkedFinished: (bookId: string) => boolean;
  onBrowse: () => void;
  // Refresh control props passed from parent
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function FavoritesTab({
  favoritedBooks,
  favoriteAuthorData,
  favoriteSeriesData,
  favoriteNarratorData,
  onBookPress,
  onBookPlay,
  onSeriesPress,
  onAuthorPress,
  onNarratorPress,
  isMarkedFinished,
  onBrowse,
  refreshing = false,
  onRefresh,
}: FavoritesTabProps) {
  const insets = useSafeAreaInsets();
  const hasFavoriteBooks = favoritedBooks.length > 0;
  const hasFavoriteAuthors = favoriteAuthorData.length > 0;
  const hasFavoriteSeries = favoriteSeriesData.length > 0;
  const hasFavoriteNarrators = favoriteNarratorData.length > 0;
  const hasAnyFavorites = hasFavoriteBooks || hasFavoriteAuthors || hasFavoriteSeries || hasFavoriteNarrators;

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

  // Header: favorite books section header
  const ListHeader = useCallback(() => (
    <View>
      {hasFavoriteBooks && (
        <SectionHeader title={`Favorite Books (${favoritedBooks.length})`} showViewAll={false} />
      )}
    </View>
  ), [hasFavoriteBooks, favoritedBooks.length]);

  // Footer: authors, series, narrators
  const ListFooter = useCallback(() => (
    <View>
      {/* Favorite Authors */}
      {hasFavoriteAuthors && (
        <View style={styles.section}>
          <SectionHeader title={`Favorite Authors (${favoriteAuthorData.length})`} showViewAll={false} />
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

      {/* Favorite Series - 2-column fanned cards */}
      {hasFavoriteSeries && (
        <View style={styles.section}>
          <SectionHeader title={`Favorite Series (${favoriteSeriesData.length})`} showViewAll={false} />
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

      {/* Favorite Narrators */}
      {hasFavoriteNarrators && (
        <View style={styles.section}>
          <SectionHeader title={`Favorite Narrators (${favoriteNarratorData.length})`} showViewAll={false} />
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
  ), [hasFavoriteAuthors, hasFavoriteSeries, hasFavoriteNarrators, favoriteAuthorData, favoriteSeriesData, favoriteNarratorData, onAuthorPress, onSeriesPress, onNarratorPress]);

  if (!hasAnyFavorites) {
    return <LibraryEmptyState tab="favorites" onAction={onBrowse} />;
  }

  return (
    <FlatList
      data={favoritedBooks}
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

export default FavoritesTab;
