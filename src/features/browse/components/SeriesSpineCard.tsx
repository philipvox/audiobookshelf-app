/**
 * src/features/browse/components/SeriesSpineCard.tsx
 *
 * Series card with BookSpineVertical visualization.
 * Shows up to 5 book spines for each series using the shared useBookRowLayout hook.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { secretLibraryColors, secretLibraryFonts } from '@/shared/theme/secretLibrary';
import { BookSpineVertical, BookSpineVerticalData, useBookRowLayout } from '@/shared/spine';
import { LibraryItem, BookMedia, BookMetadata } from '@/core/types';
import { scale } from '@/shared/theme';

// Helper to get book metadata safely
function getBookMetadata(item: LibraryItem): BookMetadata | null {
  if (item.mediaType !== 'book' || !item.media?.metadata) return null;
  return item.media.metadata as BookMetadata;
}

// Type guard for book media
function isBookMedia(media: LibraryItem['media'] | undefined): media is BookMedia {
  return media !== undefined && 'duration' in media;
}

// Scale factor for spines in the small series card
const SERIES_CARD_SCALE = 0.35;

interface SeriesSpineCardProps {
  seriesName: string;
  authorName: string;
  bookCount: number;
  books: LibraryItem[];
  onPress?: () => void;
}

// Convert LibraryItem to BookSpineVerticalData
function toSpineData(item: LibraryItem): BookSpineVerticalData {
  const metadata = getBookMetadata(item);
  const progress = item.userMediaProgress?.progress || 0;
  const duration = isBookMedia(item.media) ? item.media.duration : undefined;

  return {
    id: item.id,
    title: metadata?.title || 'Unknown',
    author: metadata?.authorName || 'Unknown Author',
    progress,
    genres: metadata?.genres || [],
    tags: isBookMedia(item.media) ? item.media.tags || [] : [],
    duration,
    seriesName: metadata?.seriesName,
  };
}

function SeriesSpineCardComponent({
  seriesName,
  authorName,
  bookCount,
  books,
  onPress,
}: SeriesSpineCardProps) {
  // Convert first 5 books to spine data
  const spineData = books.slice(0, 5).map(toSpineData);

  // Use shared layout hook for consistent calculations
  const layouts = useBookRowLayout(spineData, {
    scaleFactor: SERIES_CARD_SCALE,
    enableLeaning: false, // No leaning in small cards
    bookGap: 2,
  });

  return (
    <Pressable style={styles.container} onPress={onPress}>
      {/* Cover area with spines */}
      <View style={styles.coverArea}>
        {/* Book count badge */}
        <Text style={styles.countBadge}>{bookCount}</Text>

        {/* Spines container - uses shared layout calculations */}
        <View style={styles.spinesContainer}>
          {layouts.map((layout) => (
            <BookSpineVertical
              key={layout.book.id}
              book={layout.book}
              width={layout.width}
              height={layout.height}
              leanAngle={layout.leanAngle}
            />
          ))}
        </View>
      </View>

      {/* Series info */}
      <Text style={styles.seriesName} numberOfLines={1}>
        {seriesName}
      </Text>
      <Text style={styles.authorName} numberOfLines={1}>
        {authorName}
      </Text>
    </Pressable>
  );
}

export const SeriesSpineCard = memo(SeriesSpineCardComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 100,
  },
  coverArea: {
    aspectRatio: 1,
    backgroundColor: secretLibraryColors.white,
    marginBottom: 10,
    padding: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: secretLibraryColors.grayLine,
  },
  countBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    fontFamily: secretLibraryFonts.playfair.regularItalic,
    fontSize: scale(28),
    fontStyle: 'italic',
    color: secretLibraryColors.black,
    opacity: 0.15,
  },
  spinesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 2,
    height: '100%',
    paddingTop: 20,
  },
  seriesName: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(13),
    color: secretLibraryColors.black,
    marginBottom: 2,
  },
  authorName: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: secretLibraryColors.gray,
  },
});
