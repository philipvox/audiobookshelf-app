/**
 * src/features/library/components/tabs/FavoritesTab.tsx
 *
 * Favorites tab content for MyLibraryScreen.
 * Shows favorite books, authors, series, and narrators.
 */

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import { LibraryEmptyState } from '../LibraryEmptyState';
import { BookRow } from '../BookRow';
import { FannedSeriesCard } from '../FannedSeriesCard';
import { PersonCard } from '../PersonCard';
import { scale } from '@/shared/theme';
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
}: FavoritesTabProps) {
  const hasFavoriteBooks = favoritedBooks.length > 0;
  const hasFavoriteAuthors = favoriteAuthorData.length > 0;
  const hasFavoriteSeries = favoriteSeriesData.length > 0;
  const hasFavoriteNarrators = favoriteNarratorData.length > 0;
  const hasAnyFavorites = hasFavoriteBooks || hasFavoriteAuthors || hasFavoriteSeries || hasFavoriteNarrators;

  if (!hasAnyFavorites) {
    return <LibraryEmptyState tab="favorites" onAction={onBrowse} />;
  }

  return (
    <View>
      {/* Favorite Books */}
      {hasFavoriteBooks && (
        <View style={styles.section}>
          <SectionHeader title={`Favorite Books (${favoritedBooks.length})`} showViewAll={false} />
          {favoritedBooks.map(book => (
            <BookRow
              key={book.id}
              book={book}
              onPress={() => onBookPress(book.id)}
              onPlay={() => onBookPlay(book)}
              isMarkedFinished={isMarkedFinished(book.id)}
            />
          ))}
        </View>
      )}

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
});

export default FavoritesTab;
